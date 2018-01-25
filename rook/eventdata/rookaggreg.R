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
		print(everything$actors$links$group0)
		print(typeof(everything$actors$links$group0))
#~ 		actorLinks = do.call(rbind, everything$actors$links)
#~ 		print(actorLinks)
#~ 		print(typeof(actorLinks))
		
		actorLinks = everything$actors$links
		print(actorLinks)
		print("end of actorLinks")
		print(length(actorLinks))
		#need to compress the source/target lists to a csv like format
		#DONE in .js
#~ 		print(actorLinks$group$sources)
#~ 		actorLinks$group$sources = write.table(matrix(as.character(actorLinks$group$sources), nrow=1), sep=",", row.names=FALSE, col.names=FALSE)
#~ 		print(actorLinks)
	}

	#if not using date and not using actor return sum of each root codes
	#if using only date return a collection of n x 20 of root codes, organized by aggreg on date
	#if using only actor return a collection of m x 20 of root codes, organized by aggreg on actor groups
	#else return a collection of (n x m) x 20 of root codes, organized by aggreg on both groups

#~ 	query_url = paste(eventdata_url, '&query={\"<date>\":{\"$gte\":\"', everything$date$min, '\",\"$lte\":\"', everything$date$max, '\"}}', sep="")		#change query to match min/max date
	query_url = paste(eventdata_url, '&query={"<date>":{"$gte":"', everything$date$min, '","$lte":"', everything$date$max, '"}}', sep="")		#change query to match min/max date

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
	else if (everything$date$dateType != 0 && everything$actors$actorType == FALSE) {
		print("only date")
		if (everything$date$dateType == 1) {	#weekly
			print("weekly")
			
			start_date = as.Date(strptime(everything$date$min, "%Y%m%d"))
			offset_date = as.Date(cut(as.Date(start_date), "week"))
			diff = abs(as.numeric(start_date - offset_date, units="days"))
			
			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
			
				action_frequencies = future({
					data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
						'{"$match": ',
							'{"<date>": {"$gte":"', everything$date$min,
									'", "$lte":"', everything$date$max,
							'"}}},',
						'{"$project": ',
							'{"iso_date": {',
								'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
							'"<root_code>": 1}},',
						'{"$project": {',
							'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
						'{"$group": {',
							'"_id": {',
								'"Year": {"$year": "$iso_date"},',
								'"Week": {"$week": "$iso_date"},',
								'"root_code": "$<root_code>"}, "total":{"$sum": 1}}}]',
					sep="")))
								
					if (nrow(data) != 0) colnames(data) = c('total', '<root_code>', 'week', 'year')
					data
				}) %plan% multiprocess

				print("end of week only")
				print(value(action_frequencies))

				result = toString(jsonlite::toJSON(list(
					action_data = value(action_frequencies)
				)))
			}
		}
		else if (everything$date$dateType == 2) {	#monthly
			print("monthly")
			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
			
				action_frequencies = future({
					data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
						'{"$match": ',
							'{"<date>": {"$gte":"', everything$date$min,
									'", "$lte":"', everything$date$max,
							'"}}}',
						'{"$project": ',
							'{"iso_date": {',
								'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
							'"<root_code>": 1}},',
						'{"$project": {',
							'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
						'{"$group": {',
							'"_id": {',
								'"Year": {"$year": "$iso_date"},',
								'"Month": {"$month": "$iso_date"},',
								'"root_code": "$<root_code>"}, "total":{"$sum": 1}}}]',
					sep="")))
								
					if (nrow(data) != 0) colnames(data) = c('total', '<root_code>', 'month', 'year')
					data
				}) %plan% multiprocess

				result = toString(jsonlite::toJSON(list(
					action_data = value(action_frequencies)
				)))
			}
		}
		else if (everything$date$dateType == 3) {	#quarterly
			print("quarterly")
			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
			#compress to first day of each quarter
				action_frequencies = future({
					data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
						'{"$match": ',
							'{"<date>": {"$gte":"', everything$date$min,
									'", "$lte":"', everything$date$max,
							'"}}}',
						'{"$project": ',
							'{"iso_date": {',
								'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
							'"<root_code>": 1}},',
						'{"$project": {',
							'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
						'{"$project": {',
							'"iso_date": 1,',
							'"quarter":{"$cond":[{"$lte":[{"$month":"$iso_date"},3]}, "first",',
									  '{"$cond":[{"$lte":[{"$month":"$iso_date"},6]}, "second",',
									  '{"$cond":[{"$lte":[{"$month":"$iso_date"},9]}, "third",',
									  '"fourth"]}]}]}}}',
						'{"$group": {',
							'"_id": {',
								'"Year": {"$year": "$iso_date"},',
								'"Quarter": {"$quarter"},',
								'"root_code": "$<root_code>"}, "total":{"$sum": 1}}}]',
					sep="")))
								
					if (nrow(data) != 0) colnames(data) = c('total', '<root_code>', 'quarter', 'year')
					data
				}) %plan% multiprocess

				result = toString(jsonlite::toJSON(list(
					action_data = value(action_frequencies)
				)))
			}
		}
		else if (everything$date$dateType == 4) {	#yearly
			print("yearly")
			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
			
				action_frequencies = future({
					data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
						'{"$match": ',
							'{"<date>": {"$gte":"', everything$date$min,
									'", "$lte":"', everything$date$max,
							'"}}}',
						'{"$project": ',
							'{"iso_date": {',
								'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
							'"<root_code>": 1}},',
						'{"$project": {',
							'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
						'{"$group": {',
							'"_id": {',
								'"Year": {"$year": "$iso_date"},',
								'"root_code": "$<root_code>"}, "total":{"$sum": 1}}}]',
					sep="")))
								
					if (nrow(data) != 0) colnames(data) = c('total', '<root_code>', 'year')
					data
				}) %plan% multiprocess

				result = toString(jsonlite::toJSON(list(
					action_data = value(action_frequencies)
				)))
			}
		}
		else {
			print("bad date data")
		}
	}
	else if (everything$date$dateType == 0 && everything$actors$actorType == TRUE) {
		print("only actor")
		if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
			#not working
				action_frequencies = future({
					data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
						'{"$match": ',
							'{"$and": [',
								'{"<date>": {"$gte":"', everything$date$min,
									'", "$lte":"', everything$date$max,
								'"}}, {"<source>": {"$in": [',
									'"USA", "USABUS", "USABUSLEG", "USAELI", "USAGOV"',
								']}}, {"<target>": {"$in": [',
									'"AFG", "AFGBUS", "AFGCVL", "AFGGOV", "AFGMIL"',
								']}}]}},',
						'{"$project": ',
							'{"iso_date": {',
								'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
							'"<root_code>": 1}},',
						'{"$project": {',
							'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
						'{"$group": {',
							'"_id": {',
								'"Year": {"$year": "$iso_date"},',
								'"Week": {"$week": "$iso_date"},',
								'"root_code": "$<root_code>"}, "total":{"$sum": 1}}}]',
					sep="")))
								
					if (nrow(data) != 0) colnames(data) = c('total', '<root_code>', 'actor', 'year')
					data
				}) %plan% multiprocess
			}
	}
	else {
		print("aggreg all")
		if (everything$date$dateType == 1) {	#weekly
			print("aggreg week")
			
			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
			
				action_frequencies = future({
					data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
						'{"$match": ',
							'{"$and": [',
								'{"<date>": {"$gte":"', everything$date$min,
									'", "$lte":"', everything$date$max,
								'"}}, {"<source>": {"$in": [',
									'"USA", "USABUS", "USABUSLEG", "USAELI", "USAGOV"',
								']}}, {"<target>": {"$in": [',
									'"AFG", "AFGBUS", "AFGCVL", "AFGGOV", "AFGMIL"',
								']}}]}},',
						'{"$project": ',
							'{"iso_date": {',
								'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
							'"<root_code>": 1}},',
						'{"$project": {',
							'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
						'{"$group": {',
							'"_id": {',
								'"Year": {"$year": "$iso_date"},',
								'"Week": {"$week": "$iso_date"},',
								'"root_code": "$<root_code>"}, "total":{"$sum": 1}}}]',
					sep="")))
								
					if (nrow(data) != 0) colnames(data) = c('total', '<root_code>', 'week', 'year')
					data
				}) %plan% multiprocess
			}

				print("end of week and actor")
				print(value(action_frequencies))

			result = toString(jsonlite::toJSON(list(
				action_data = value(action_frequencies)
			)))

		}
		else {
			print ("aggreg else")
		}
						
	}
    
	response$write(result)
    return(response$finish())

}
