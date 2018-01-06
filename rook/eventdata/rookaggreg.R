print("entered r aggreg app")

eventdata_aggreg.app <- function(env) {
	production = FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development

    api_key = 'api_key=CD75737EF4CAC292EE17B85AAE4B6'
    datasource = 'api'

    server_address = 'http://149.165.156.33:5002/api/data?'
    local_server_address = 'http://0.0.0.0:5002/api/data?'

    if (production) {
        sink(file = stderr(), type = "output")
    }
	

	request <- Request$new(env)
	response <- Response$new()
    response$header("Access-Control-Allow-Origin", "*")  # Enable CORS

    
    if (request$options()) {
		print("Preflight from aggreg")
		response$status = 200L

		# Ensures CORS header is permitted
		response$header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		response$header("Access-Control-Allow-Headers", "origin, content-type, accept")
		return(response$finish())
    }

    # Ensure solaJSON is posted
    solajson = request$POST()$solaJSON
    if (is.null(solajson)) {
        response$write('{"warning": "EventData R App is loaded, but no json sent. Please send solaJSON in the POST body."}')
        return(response$finish())
    }

    # Ensure that solaJSON is valid
    valid <- jsonlite::validate(solajson)
    if (!valid) {
        response$write('{"warning": "The request is not valid json. Check for special characters."}')
        return(response$finish())
    }

    everything <- jsonlite::fromJSON(request$POST()$solaJSON, simplifyDataFrame = FALSE)

    #grabbed everything
    dataset = everything$dataset

    if (is.null(everything$dataset)) {
        response$write(paste('{"error": "no dataset is specified"}'))
        return(response$finish())
    }

    if (!production && !is.null(everything$datasource)) {
        datasource = everything$datasource
    }

    print(datasource)
    if (!production && datasource == "local") {
        server_address = local_server_address
    }

    format = paste(dataset, '_', datasource, sep="")
    eventdata_url = paste(server_address, api_key, "&datasource=", dataset, sep="")

    # ~~~~ Data Retrieval ~~~~

    getData = function(url) {
        print(gsub(' ', '%20', relabel(url, format), fixed=TRUE))
        data = jsonlite::fromJSON(readLines(gsub(' ', '%20', relabel(url, format), fixed=TRUE)))$data
        return(data)
    }

    #get min date, source, target
    #get collection by root/penta
    #regex for src/targ: events[grepl("USA.*GOV", events$Source) & grepl("AFG", events$Target),]

    print("return from aggreg")

	#dateType: 0 = not used, 1 = week, 2 = month, 3 = quarter, 4 = year
    print(everything$date)
    if (everything$date$dateType == 0) {
		print("not using date in aggreg")
	}
	else {
		print("using date")
	}

    #actorType: 0 = not used, 1 = used (FALSE/TRUE)
    print(everything$actors)
    if (everything$actors$actorType == FALSE) {
		print("not using actor in aggreg")
	}
	else {
		print("using actor")
	}

	#if not using date and not using actor return sum of each root codes
	#if using only date return a collection of n x 20 of root codes, organized by aggreg on date
	#if using only actor return a collection of m x 20 of root codes, organized by aggreg on actor groups
	#else return a collection of (n x m) x 20 of root codes, organized by aggreg on both groups

	query_url = paste(eventdata_url, '&query={\"<date>\":{\"$gte\":\"', everything$date$min, '\",\"$lte\":\"', everything$date$max, '\"}}', sep="")		#change query to match min/max date

	if (everything$date$dateType == 0 && everything$actors$actorType == FALSE) {
		print("nothing to aggreg on")
		#return the action counts
		if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
			
			action_frequencies = future({
				data = do.call(data.frame, getData(paste(query_url, '&group=<root_code>', sep="")))
				if (nrow(data) != 0) colnames(data) = c('total', '<root_code>')
				data
			}) %plan% multiprocess

			result = toString(jsonlite::toJSON(list(
				action_data = value(action_frequencies)
			)))
		}
	}
	else if (everything$dateType != 0 && everything$actors$actorType == FALSE) {
		print("only date")
	}
	else if (everything$dateType == 0 && everything$actors$actorType == TRUE) {
		print("only actor")
	}
	else {
		print("aggreg all")
	}
    
	response$write(result)
    return(response$finish())

}
