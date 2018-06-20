source("rookconfig.R")

##
##  rookeventdata.r
##

eventdata_subset.app <- function(env) {

    production = EVENTDATA_PRODUCTION_MODE     ## Toggle:  TRUE - Production, FALSE - Local Development
    cat("\nEVENTDATA_PRODUCTION_MODE: ", EVENTDATA_PRODUCTION_MODE)

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
    if (! jsonlite::validate(post)) {
        response$write('{"warning": "The request is not valid json. Check for special characters."}')
        return(response$finish())
    }

    everything <- jsonlite::fromJSON(post, simplifyDataFrame = FALSE)
    print(everything)

    # VALUES FOR TYPE
    # datasets: return data about each dataset (list of variables, available subsets, citations)
    # formats: return formatting metadata (mappings definitions for each subset)
    # validate: check if query is valid
    # raw: return query data as-is. Heavy.
    # summary: return display metadata computed from dataset
    type = everything$type
    if (is.null(type))type = 'summary'

    # corresponds to dataset keys from ./eventdata/datasets/*.json
    dataset = everything$dataset

    # JSON-string MongoDB find or aggregation match query
    query = everything$query

    # list of variables or classifications to project to
    variables = everything$variables

    # corresponds to one of the subset names from ./eventdata/datasets/*.json > 'subsets'
    subset = everything$subset

    formatVar = function(var) {temp = list(); temp[[var]] = jsonlite::unbox(1); temp}
    if (type == 'datasets') {
        response$write(toString(jsonlite::toJSON(setNames(lapply(list.files('./eventdata/datasets/'), function(filename) {
            jsonlite::fromJSON(readLines(paste('./eventdata/datasets/', filename, sep = ""), warn = FALSE))
        }), lapply(list.files('./eventdata/datasets/'), function(val) {gsub('.json', '', val)})), auto_unbox = TRUE)))
        return(response$finish())
    }

    if (is.null(everything$dataset)) {
        response$write(paste('{"error": "no dataset is specified"}'))
        return(response$finish())
    }

    cat('\nserver_address', server_address)
    print(dataset)
    datasetMetadata = jsonlite::fromJSON(readLines(paste("./eventdata/datasets/", dataset, '.json', sep = "")));

    # ~~~~ Data Retrieval ~~~~

    genericErrorHandler = function(err) {
        print(err, quote = FALSE)
        return(data);
    }

    getData = function(type, query, key=NULL) {
        if (datasetMetadata$host == 'TwoRavens') {
            connect = RMongo::mongoDbConnect("event_data")
            if (type == 'find') {
                return(RMongo::dbGetQuery(connect, dataset, query))
            }
            if (type == 'aggregate') {
                return(RMongo::dbAggregate(connect, dataset, query))
            }
            if (type == 'distinct') {
                return(RMongo::dbGetDistinct(connect, dataset, key, query))
            }
        }

        if (datasetMetadata$host == 'UTDallas') {
            url = paste(EVENTDATA_PRODUCTION_SERVER_ADDRESS, EVENTDATA_SERVER_API_KEY, "&datasource=", dataset, sep = "")
            if (type == 'find') {
                data = readLines(paste(url, '&query=', query, sep = ""), warn = FALSE)
            }
            if (type == 'aggregate') {
                data = readLines(paste(url, '&aggregate=', query, sep = ""), warn = FALSE)
            }
            if (type == 'distinct') {
                data = readLines(paste(url, '&query=', query, '&unique=', key, sep = ""), warn = FALSE)
            }
            tryCatch({
                return(jsonlite::fromJSON(data)$data)
            }, error = genericErrorHandler)
        }
    }

    if (type == 'raw') {
        variableQuery = jsonlite::toJSON(lapply(if (! is.null(variables))variables else datasetMetadata$columns, formatVar))

        result = getData(paste('aggregate',
        '[{"$match":', query, '},',
        '{"$project":', variableQuery, '}]', sep = ""))

        result['_id'] = NULL
        fileName = format(Sys.time(), '%Y-%m-%d-%H-%M-%OS4')
        dir.create('./eventdata/downloads/', showWarnings = FALSE)
        write.csv(result, file = paste('./eventdata/downloads/', fileName, ".csv", sep = ""))

        event_data_files_url = paste('"', EVENTDATA_ROOK_URL_BASE, '/custom/eventdata-files/', sep = "")
        response$write(paste('{"download":', event_data_files_url, fileName, '.csv"}', sep = ""))
        return(response$finish())
    }

    if (type == 'peek') {
        variableQuery = jsonlite::toJSON(lapply(if (! is.null(variables))variables else datasetMetadata$columns, formatVar))

        result = getData('aggregate', paste(
        '[{"$match":', query, '},',
        '{"$project":', variableQuery, '},',
        '{"$skip":', everything$skip, '},',
        '{"$limit":', everything$limit, '}]', sep = ""))
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
            getData('find', query)
            response$write('{"response": "Query is valid."}')},
        warning = handler,
        error = handler)
        return(response$finish())
    }

    # START (type == 'summary')
    print(subset)
    print(dataset$subsets)
    subsetMetadata = datasetMetadata$subsets[[subset]]

    # Useful for the target and source other fields, to unwrap the semicolon-delimited values
    uniques = function(values, delimiter) {
        accumulator = list()
        for (key in values) {
            if (! is.na(key) && key != "") {
                accumulator = c(accumulator, strsplit(key, delimiter))
            }
        }
        return(unique(do.call(c, accumulator)))
    }

    collectColumn = function(column) {
        future(tryCatch({
            data = getData('distinct', query, column)
            if (column %in% names(subsetMetadata$deconstruct))data = uniques(data, subsetMetadata$deconstruct[[column]])
            return(sort(unlist(data)))
        }, error = genericErrorHandler)) %plan% multiprocess
    }

    collectMonad = function(monad) {
        list(full = collectColumn(monad$full), filters = sapply(monad$filters, collectColumn))
    }

    if (subsetMetadata$type == 'date') {
        columnName = if (subsetMetadata$structure == 'point')subsetMetadata$date else subsetMetadata$columns[[0]]
        subsetFuture = future(tryCatch({
            data = do.call(data.frame, getData('aggregate', paste(
            '[{"$match":', query, '},',
            ' {"$project: {"Year": {"$year": "$', columnName, '"}, ',
            '"Month": {"$month": "$', columnName, '"}}},',
            ' {"$group": { "_id": { "year": "$Year", "month": "$Month" }, "total": {"$sum": 1} }}]', sep = "")))
            if (nrow(data) != 0)colnames(data) = c('total', '<year>', '<month>')
            data
        }, error = genericErrorHandler)) %plan% multiprocess
    }

    if (subsetMetadata$type %in% list('categorical', 'categorical_grouped')) {
        subsetFuture = future(tryCatch({
            data = do.call(data.frame, getData('find', paste(subsetMetadata$columns, collapse = ",")))
            if (nrow(data) != 0)colnames(data) = c('total', lapply(subsetMetadata$columns, function(col) {datasetMetadata$columns[[col]]}))
            data
        }, error = genericErrorHandler)) %plan% multiprocess
    }
    else if (subsetMetadata$type == 'dyad')subsetFuture = sapply(subsetMetadata$tabs, collectMonad)
    else if (subsetMetadata$tyype == 'monad')subsetFuture = collectMonad(subsetMetadata)
    else subsetFuture = sapply(subsetMetadata$columns, collectColumn)

    summary = list()

    # await all futures
    if (subsetMetadata$type %in% list('date', 'categorical', 'categorical_grouped')) {
        summary$data = value(subsetFuture);
    }
    else {
        # todo check resolution
        # valueRecursive = ''
        valueRecursive = function(entry) {
            if (is.list(entry)) sapply(entry, valueRecursive) else value(entry)
        }
        summary$data = sapply(subsetFuture, valueRecursive)
    }

    if (!is.na(everything$alignments)) {
        summary$formats = sapply(everything$alignments, function(format) {
            jsonlite::fromJSON(readLines(paste('./eventdata/alignments/', format, '.json', sep = ""), warn = FALSE))
        })
    }
    if (!is.na(everything$formats)) {
        summary$formats = sapply(everything$formats, function(format) {
            jsonlite::fromJSON(readLines(paste('./eventdata/formats/', format, '.json', sep = ""), warn = FALSE))
        })
    }
    summary$subsetName = subset

    response$write(toString(jsonlite::toJSON(summary)))

    # If your R installation does not support futures multiprocessing, it will fall back to multisession processing
    # In the multisession fallback case, prints are sent to different R sessions and not the server console
    print("Request completed")
    return(response$finish())
}
