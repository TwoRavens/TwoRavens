source("rookconfig.R")

##
##  rookeventdata.r
##

eventdata_subset.app <- function(env) {

    production = EVENTDATA_PRODUCTION_MODE     ## Toggle:  TRUE - Production, FALSE - Local Development
    cat("\nEVENTDATA_PRODUCTION_MODE: ", EVENTDATA_PRODUCTION_MODE)

    datasource = 'api'

    server_address = EVENTDATA_PRODUCTION_SERVER_ADDRESS
    cat("\nEVENTDATA_PRODUCTION_SERVER_ADDRESS: ", EVENTDATA_PRODUCTION_SERVER_ADDRESS, "\n")

    if (production) {
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)
    response <- Response$new()
    response$header("Access-Control-Allow-Origin", "*")  # Enable CORS

    if (request$options()) {
        print("Preflight")
        response$status = 200L

        # Ensures CORS header is permitted
        response$header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        response$header("Access-Control-Allow-Headers", "origin, content-type, accept")
        return(response$finish())
    }

    print("Request received")
    post = names(request$POST())

    # Ensure that request is valid
    if (!jsonlite::validate(post)) {
        response$write('{"warning": "The request is not valid json. Check for special characters."}')
        return(response$finish())
    }

    everything <- jsonlite::fromJSON(post, simplifyDataFrame=FALSE)
    print(everything)

    # VALUES FOR TYPE
    # datasets: return data about each dataset (list of variables, available subsets, citations)
    # formats: return formatting metadata (mappings definitions for each subset)
    # validate: check if query is valid
    # raw: return query data as-is. Heavy.
    # summary: return display metadata computed from dataset
    type = everything$type
    if (is.null(type)) type = 'summary'

    # corresponds to dataset keys from ./eventdata/datasets/*.json
    dataset = everything$dataset

    # JSON-string MongoDB find or aggregation match query
    query = everything$query

    # list of variables or classifications to project to
    variables = everything$variables

    # corresponds to subset names from ./eventdata/datasets/*.json > 'subsets'
    subsets = everything$subsets

    # boolean, if type is summary, then return formatting metadata in the response
    metadata = everything$metadata

    if (is.null(everything$dataset)) {
        response$write(paste('{"error": "no dataset is specified"}'))
        return(response$finish())
    }

    if (!production && !is.null(everything$datasource)) {
        datasource = everything$datasource
    }

    if (!production && datasource == "local") {
        server_address = EVENTDATA_LOCAL_SERVER_ADDRESS
    }
    cat('\nserver_address', server_address)

    eventdata_url = paste(server_address, EVENTDATA_SERVER_API_KEY, "&datasource=", dataset, sep="")

    # ~~~~ Data Retrieval ~~~~

    genericErrorHandler = function(err) {
        print(err, quote=FALSE)
        return(data);
    }

    getData = function(url) {
        print(gsub(' ', '%20', relabel(url, dataset), fixed=TRUE), quote=FALSE)
        data = readLines(gsub(' ', '%20', relabel(url, dataset), fixed=TRUE), warn=FALSE)

        # attempt parsing
        tryCatch({
            return(jsonlite::fromJSON(data)$data)
        }, error = genericErrorHandler)
    }

    formatVar = function(var) {temp=list(); temp[[var]]=jsonlite::unbox(1); temp}
    if (type == 'datasets') {
        response$write(toString(jsonlite::toJSON(setNames(lapply(list.files('./eventdata/datasets/'), function(filename) {
            jsonlite::fromJSON(readLines(paste('./eventdata/datasets/', filename, sep=""), warn=FALSE))
        }), lapply(list.files(path), function(val) {gsub('.json', '', val)})))))
        return(response$finish())
    }


    if (type == 'raw') {
        if (!is.null(variables)) {
            result = getData(paste(eventdata_url, '&aggregate=',
                '[{"$match":', query, '},',
                 '{"$project":', jsonlite::toJSON(lapply(variables, formatVar)), '}]', sep=""))
        } else {
            result = getData(paste(eventdata_url, '&query=', query, sep=""))
        }

        result['_id'] = NULL
        fileName = format(Sys.time(), '%Y-%m-%d-%H-%M-%OS4')
        dir.create('./eventdata/downloads/', showWarnings = FALSE)
        write.csv(result, file=paste('./eventdata/downloads/', fileName, ".csv", sep=""))

        event_data_files_url = paste('"', EVENTDATA_ROOK_URL_BASE, '/custom/eventdata-files/', sep="")
        response$write(paste('{"download":', event_data_files_url, fileName, '.csv"}', sep=""))
        #response$write(paste('{"download":', '"http://127.0.0.1:8000/custom/eventdata-files/', fileName, '.csv"}', sep=""))
        return(response$finish())
    }

    if (type == 'peek') {
        projection = '';
        if (!is.null(variables)) projection = paste('{"$project":', jsonlite::toJSON(lapply(variables, formatVar)), '},', sep="")

        result = getData(paste(eventdata_url, '&aggregate=',
            '[{"$match":', query, '},',
            projection,
            '{"$skip":', everything$skip, '},',
            '{"$limit":', everything$limit, '}]', sep=""))
        result['_id'] = NULL

        print("peek data collected")
        response$write(toString(jsonlite::toJSON(result)))
        return(response$finish())
    }

    if (type == 'validate') {

        handler = function(exc) {
            cleanedExc = gsub('\\\n', '', gsub('"', "'", toString(exc)))
            print(paste('{"response": "The custom query is malformed:', cleanedExc, '"}'))

            response$write(paste('{"response": "The custom query is malformed:', cleanedExc, '"}'))
        }

        tryCatch({
            getData(paste(eventdata_url, '&query=', query, sep=""))
            response$write('{"response": "Query is valid."}')},
        warning = handler,
        error = handler)
        return(response$finish())
    }

    # todo
    if (type != 'summary') return

    datasetMetadata = jsonlite::fromJSON(readLines(paste("./eventdata/datasets/", dataset, '.json', sep="")));

    # Check if metadata has already been computed, and return cached value if it has
    # if (!file.exists("./data/cachedQueries.RData")) save(list(0), file="./data/cachedQueries.RData")
    #
    # cachedQueries = load("./data/cachedQueries.RData")
    # if (query %in% cachedQueries) {
    #     response$write(getData(paste("./data/", match(query, cachedQueries)), ".txt"))$data
    #     return(response$finish())
    # }

    # Useful for the target and source other fields, to unwrap the semicolon-delimited values
    uniques = function(values, delimiter) {
        accumulator = list()
        for (key in values) {
            if (!is.na(key) && key != "") {
                accumulator = c(accumulator, strsplit(key, delimiter))
            }
        }
        return(unique(do.call(c, accumulator)))
    }

    query_url = paste(eventdata_url, '&query=', query, sep="")

    subsetMetadata = datasetMetadata$subsets[[subset]]

    collectColumn = function(column) {
        future(tryCatch({
            data = getData(paste(query_url, '&unique=', column, '', sep=""))
            if (column %in% names(subsetMetadata$deconstruct)) data = uniques(data, subsetMetadata$deconstruct[[column]])
            return(sort(unlist(data)))
        }, error=genericErrorHandler)) %plan% multiprocess
    }

    collectMonad = function(monad) {
        list(full=collectColumn(monad$full), filters=sapply(monad$filters, collectColumn))
    }

    # handle the groupable subsets separately
    if (subsetMetadata$type %in% list('date', 'location', 'action', 'frequency', 'density')) {

        # if the dataset does not have <year> and <month> columns, then construct them from <date>
        if (subsetMetadata$type == 'date' && !all(list('<year>', '<month>') %in% unlist(metadata$columns, use.names=FALSE))) {
            subsetFuture = future(tryCatch({
                data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=',
                '[{"$match":', query, '},',
                '{"$project": {"Year":  {"$substr": ["$<date>", 0, 4]},',
                ' "Month": {"$substr": ["$<date>",', if (subsetMetadata$format == 'YYYYMMDD') '4' else '5', ',2]}}},',     # Construct year and month fields
                '{"$group": { "_id": { "year": "$Year", "month": "$Month" }, "total": {"$sum": 1} }}]', sep=""))) # Group by years and months
                if (nrow(data) != 0) colnames(data) = c('total', '<year>', '<month>')
                data
            }, error=genericErrorHandler)) %plan% multiprocess
        }

        # if the dataset does not have an <action_code> column, then attempt to construct it from <cameo>
        else if (subsetMetadata$type == 'action' && !('<action_code>' %in% unlist(datasetMetadata$columns, use.names=FALSE))) {
            subsetFuture = future(tryCatch({
                data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=',
                '[{"$match":', query, '},',
                '{"$project": {"RootCode":  {"$substr": ["$<cameo>", 0, 2]}}},',                          # Construct RootCode field
                '{"$group": { "_id": { "action_code": "$RootCode" }, "total": {"$sum": 1} }}]', sep=""))) # Group by RootCode
                if (nrow(data) != 0) colnames(data) = c('total', '<action_code>')
                data
            }, error=genericErrorHandler)) %plan% multiprocess
        }

        else {
            subsetFuture = future(tryCatch({
                data = do.call(data.frame, getData(paste(query_url, '&group=', paste(subsetMetadata$columns, collapse=","), sep="")))
                if (nrow(data) != 0) colnames(data) = c('total', lapply(subsetMetadata$columns, function(col) {datasetMetadata$columns[[col]]}))
                data
            }, error=genericErrorHandler)) %plan% multiprocess
        }
    }
    else if (subsetMetadata$type == 'dyad') subsetFuture = sapply(subsetMetadata$tabs, collectMonad)
    else if (subsetMetadata$tyype == 'monad') subsetFuture = collectMonad(subsetMetadata)
    else subsetFuture = sapply(subsetMetadata$columns, collectColumn)

    summary = list()

    # await all futures
    if (datasetMetadata$subsets[[subset]]$type %in% list('date', 'location', 'action', 'frequency', 'density')) {
        summary$data = value(subsetFuture);
    }
    else {
        summary$data = sapply(subsetFuture, function(entry) {
            if (is.list(entry)) return(sapply(entry, value)) else return(value(entry))
        })
    }

    if (metadata) {
        summary$metadata = list()
        if (!is.na(subsetMetadata$alignment)) {
            summary$metadata$alignment = jsonlite::fromJSON(readLines(paste('./eventdata/alignments/', subsetMetadata$alignment, sep=""), warn=FALSE))
        }
        if (!is.na(subsetMetadata$formatting)) {
            summary$metadata$formats = sapply(subsetMetadata$formats, function(format) {
                jsonlite::fromJSON(readLines(paste('./eventdata/formats/', format, '.json', sep=""), warn=FALSE))
            })
        }
    }
    response$write(toString(jsonlite::toJSON(summary)))

    # If your R installation does not support futures multiprocessing, it will fall back to multisession processing
    # In the multisession fallback case, prints are sent to different R sessions and not the server console
    print("Request completed")
    return(response$finish())
}
