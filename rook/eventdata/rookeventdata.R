source("rookconfig.R")

eventdata.app <- function(env) {

    production = EVENTDATA_PRODUCTION_MODE     ## Toggle:  TRUE - Production, FALSE - Local Development
    cat("\nEVENTDATA_PRODUCTION_MODE: ", EVENTDATA_PRODUCTION_MODE)
    cat("\nEVENTDATA_PRODUCTION_SERVER_ADDRESS: ", EVENTDATA_PRODUCTION_SERVER_ADDRESS, "\n")

    if (production) {
        sink(file = stderr(), type = "output")
    }

    request <- Rook::Request$new(env)
    response <- Rook::Response$new()
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

    print(post, quote=FALSE);
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

    if (type == 'datasets') {
        response$write(toString(jsonlite::toJSON(setNames(lapply(list.files('./eventdata/datasets/'), function(filename) {
            jsonlite::fromJSON(readLines(paste('./eventdata/datasets/', filename, sep = ""), warn = FALSE))
        }), lapply(list.files('./eventdata/datasets/'), function(val) {gsub('.json', '', val)})), auto_unbox = TRUE)))
        return(response$finish())
    }

    # corresponds to dataset keys from ./eventdata/datasets/*.json
    dataset = everything$dataset

    # JSON-string MongoDB find or aggregation match query.
    # HACK: the query must be passed as a string literal, because R will mangle it. Never parse the query.
    query = Rook::Utils$unescape(everything$query)

    # list of variables or classifications to project to
    variables = everything$variables

    # corresponds to one of the subset names from ./eventdata/datasets/*.json > 'subsets'
    subset = everything$subset

    if (is.null(everything$dataset)) {
        response$write(paste('{"error": "no dataset is specified"}'))
        return(response$finish())
    }

    datasetMetadata = jsonlite::fromJSON(readLines(paste("./eventdata/datasets/", dataset, '.json', sep = "")));
    if (is.null(variables))variables = datasetMetadata$columns;

    # ~~~~ Data Retrieval ~~~~

    genericErrorHandler = function(err) {
        print(err, quote = FALSE)
        return(data);
    }

    getData = function(type, query, key=NULL) {
        # print(paste("GETTING", toString(type), toString(key), toString(query)))
        if (datasetMetadata$host == 'TwoRavens') {
            # url = sprintf("mongodb://%s:%s@%s/ldap?authMechanism=PLAIN", EVENTDATA_MONGO_USERNAME, EVENTDATA_MONGO_PASSWORD, EVENTDATA_LOCAL_SERVER_ADDRESS)
            url = sprintf("mongodb://%s", EVENTDATA_LOCAL_SERVER_ADDRESS)
            connect = mongolite::mongo(collection = dataset, db = "event_data", url = url)

            if (type == 'find') {
                data = connect$find(query)
            }
            if (type == 'aggregate') {
                data = connect$aggregate(query)
            }
            if (type == 'distinct') {
                data = connect$distinct(key, query)
            }
            rm(connect)
            return(data)
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
        variableQuery = jsonlite::toJSON(setNames(as.list(rep(1, length(variables))), variables), auto_unbox = TRUE)

        result = getData('aggregate', paste(
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

    if (type == 'aggregate') {
        response$write(toString(jsonlite::toJSON(getData('aggregate', query))))
        return(response$finish())
    }

    if (type == 'peek') {
        variableQuery = jsonlite::toJSON(setNames(as.list(rep(1, length(variables))), variables), auto_unbox = TRUE)

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
        tryCatch({
            data = getData('distinct', query, column)
            if (column %in% names(datasetMetadata$deconstruct))data = uniques(data, datasetMetadata$deconstruct[[column]])
            return(sort(unlist(data)))
        }, error = genericErrorHandler)
    }

    collectMonad = function(monad) {
        list(full = collectColumn(monad$full), filters = sapply(monad$filters, collectColumn, simplify = FALSE, USE.NAMES = TRUE))
    }

    summary = list()

    if (subsetMetadata$type == 'date') {
        summary$data = tryCatch({
            do.call(data.frame, getData('aggregate', paste(
            '[{"$match":', query, '},',
            ' {"$project": {"Year": {"$year": "$', subsetMetadata$columns[[1]], '"},',
            '"Month": {"$month": "$', subsetMetadata$columns[[1]], '"}}},',
            ' {"$group": { "_id": { "year": "$Year", "month": "$Month" }, "total": {"$sum": 1} }},',
            ' {"$project": {"year": "$_id.year", "month": "$_id.month", "_id": 0, "total": 1}}]', sep = "")))
        }, error = genericErrorHandler)
    }

    else if (subsetMetadata$type %in% list('categorical', 'categorical_grouped')) {
        formatName = datasetMetadata$formats[[subsetMetadata$columns[[1]]]]
        summary$data = tryCatch({
            do.call(data.frame, getData('aggregate', paste(
            '[{"$match":', query, '},',
            '{"$group": { "_id": { "', formatName, '": "$', subsetMetadata$columns[[1]], '"}, "total": {"$sum": 1} }}]', sep = ""))) # Group by years and months
        }, error = genericErrorHandler)
    }
    else if (subsetMetadata$type == 'dyad') {
        if (! is.null(everything$search) && everything$search) {
            summary$search = jsonlite::unbox(TRUE)
            summary$tab = jsonlite::unbox(everything$tab)
            summary$data = collectColumn(subsetMetadata$tabs[[everything$tab]]$full)
        }
        else summary$data = sapply(subsetMetadata$tabs, collectMonad, simplify = FALSE, USE.NAMES = TRUE)
    }
    else if (subsetMetadata$type == 'monad') {
        if (! is.null(everything$search) && everything$search)summary$data = collectColumn(subsetMetadata$full)
        else summary$data = collectMonad(subsetMetadata)
    }
    else summary$data = sapply(subsetMetadata$columns, collectColumn, simplify = FALSE, USE.NAMES = TRUE)

    # Additional metadata
    if (! is.null(everything$alignments)) {
        summary$alignments = sapply(everything$alignments, function(format) {
            jsonlite::fromJSON(readLines(paste('./eventdata/alignments/', format, '.json', sep = ""), warn = FALSE))
        }, simplify = FALSE, USE.NAMES = TRUE)
    }

    if (! is.null(everything$formats)) {
        summary$formats = sapply(everything$formats, function(format) {
            jsonlite::fromJSON(readLines(paste('./eventdata/formats/', format, '.json', sep = ""), warn = FALSE))
        }, simplify = FALSE, USE.NAMES = TRUE)
    }

    if (! is.null(everything$countRecords) && everything$countRecords) {
        total = tryCatch({
            jsonlite::unbox(getData('aggregate', paste('[{"$match":', query, '}, {"$count": "total"}]', sep = ""))$total)
        }, error = genericErrorHandler)
        summary$total = if (!is.null(total)) total else 0
    }

    summary$subsetName = jsonlite::unbox(subset)

    # NOTE: R jsonlite interprets literals as singleton literal arrays, since R has no scalar datatype.
    response$write(toString(jsonlite::toJSON(summary)))

    # If your R installation does not support futures multiprocessing, it will fall back to multisession processing
    # In the multisession fallback case, prints are sent to different R sessions and not the server console
    print("Request completed")
    return(response$finish())
}
