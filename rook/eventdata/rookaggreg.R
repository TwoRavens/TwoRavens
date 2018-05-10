source("rookconfig.R")

library(tidyverse)
require(data.table)
library(lubridate)

print("entered r aggreg app")

eventdata_aggreg.app <- function(env) {

		production = EVENTDATA_PRODUCTION_MODE     ## Toggle:  TRUE - Production, FALSE - Local Development

    datasource = 'api'

    server_address = EVENTDATA_PRODUCTION_SERVER_ADDRESS

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
        server_address = EVENTDATA_LOCAL_SERVER_ADDRESS
    }

    format = paste(dataset, '_', datasource, sep="")
    eventdata_url = paste(server_address, EVENTDATA_SERVER_API_KEY, "&datasource=", dataset, sep="")

    # ~~~~ Data Retrieval ~~~~

    getData = function(url) {
        print(gsub(' ', '%20', relabel(url, format), fixed=TRUE))
        data = jsonlite::fromJSON(readLines(gsub(' ', '%20', relabel(url, format), fixed=TRUE)))$data
        return(data)
    }

    if (everything$date$dateType != 0) {
		start_date = as.Date(strptime(everything$date$min, "%Y%m%d"))
		end_date = as.Date(strptime(everything$date$max, "%Y%m%d"))
	}

    actionType = everything$action

    if (!is.null(actionType) && actionType == "preview") {	#get first $numberPreview dates
		print(start_date)
		print(end_date)

		num = everything$numberPreview - 1
		
		if (everything$date$dateType == 1)
			date_range = seq(start_date, min(start_date + weeks(num), end_date), by="week")
		else if (everything$date$dateType == 2)
			date_range = seq(start_date, min(start_date %m+% months(num), end_date), by="month")
		else if (everything$date$dateType == 3)
			date_range = seq(start_date, min(start_date %m+% months(num * 4), end_date), by="quarter")
		else if (everything$date$dateType == 4)
			date_range = seq(start_date, min(start_date %m+% years(num), start_date), by="year")

		print("date range")
		print(date_range);
		result = toString(jsonlite::toJSON(list(
			aggreg_dates = date_range
		)))
	}
	else {

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

			actorLinks = everything$actors$links
		}

		#if not using date and not using actor return sum of each root codes
		#if using only date return a collection of n x 20 of root codes, organized by aggreg on date
		#if using only actor return a collection of m x 20 of root codes, organized by aggreg on actor groups
		#else return a collection of (n x m) x 20 of root codes, organized by aggreg on both groups


		if (datasource == "api")
			rootCodeHeader = sprintf("%.2d", seq(1:20))
		else
			rootCodeHeader = sprintf("%d", seq(1:20))
		#penta header handled after queries

		query_url = paste(eventdata_url, '&query={"<date>":{"$gte":"', everything$date$min, '","$lte":"', everything$date$max, '"}}', sep="")		#change query to match min/max date

		if (everything$date$dateType == 0 && everything$actors$actorType == FALSE) {
			print("nothing to aggreg on")
			#return the action counts
			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {

				action_frequencies = future({
					data = do.call(data.frame, getData(paste(query_url, '&group=<root_code>', sep="")))
					if (nrow(data) != 0) colnames(data) = c('total', 'rootcode')
					data
				}) %plan% multiprocess

				#format and sort data
				df = value(action_frequencies)
				df = df[complete.cases(df),]		#remove NAs
				df = spread(df, rootcode, total, fill=0)

				#add missing root codes
				missing = setdiff(rootCodeHeader, names(df))
				df[missing] = 0
				df = df[rootCodeHeader]

				result = df
			}
		}
		else if (everything$date$dateType != 0 && everything$actors$actorType == FALSE) {
			print("aggreg date only")
			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
				action_frequencies = future({
					data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
						'{"$match": ',
							'{"<date>": {"$gte":"', everything$date$min,
									'", "$lte":"', everything$date$max,
							'"}}},',
						'{"$project": {"<date>": 1, "<root_code>": 1, "_id": 0}}]',
	#~ 							'{"$project": ',
	#~ 								'{"iso_date": {',
	#~ 									'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
	#~ 								'"<root_code>": 1}},',
	#~ 							'{"$project": {',
	#~ 								'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
	#~ 							'{"$group": {',
	#~ 								'"_id": {',
	#~ 									'"Year": {"$year": "$iso_date"},',
	#~ 									'"root_code": "$<root_code>"}, "total":{"$sum": 1}}},{"$limit":10}]',
					sep="")))

					#rename columns
					if (nrow(data) != 0) colnames(data) = c("Date", "rootcode")
					data
				}) %plan% multiprocess

				test_df = value(action_frequencies)
					
				test_df = test_df[complete.cases(test_df),]		#remove NAs
				test_df$Date = as.Date(test_df$Date, "%Y%m%d")

				if (everything$date$dateType == 1) {	#weekly
					date_range = seq(start_date, end_date + weeks(1), by="week")
					test_df$Date = cut(test_df$Date, date_range)	#data in bins
				}
				else if (everything$date$dateType == 2) {	#monthly
					date_range = seq(start_date, end_date %m+% months(1), by="month")
					test_df$Date = cut(test_df$Date, date_range)	#data in bins
				}
				else if (everything$date$dateType == 3) {	#quarterly
					date_range = seq(start_date, end_date %m+% months(4), by="quarter")
					test_df$Date = cut(test_df$Date, date_range)
				}
				else if (everything$date$dateType == 4) {	#yearly
					date_range = seq(start_date, end_date %m+% years(1), by="year")
					test_df$Date = cut(test_df$Date, date_range)
				}
				else {
					print("bad date data")
				}

				#count number
				tab = table(test_df)

				#convert to df
				tab = as.data.frame.matrix(tab)

				#add missing codes in
				missing = setdiff(rootCodeHeader, names(tab))
				tab[missing] = 0
				tab = tab[rootCodeHeader]

				#convert to data frame
				ftab = setDT(tab, keep.rownames=TRUE)[]
				colnames(ftab)[1] = "Date"

				result = ftab
			}
		}
		else if (everything$date$dateType == 0 && everything$actors$actorType == TRUE) {
			print("aggreg actor only")
			result = data.frame(matrix(ncol = 22, nrow = 0))
			resHeader = c("Source", "Target", (1:20))
			colnames(result) = resHeader

			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
				for (group in everything$actors$links) {
					action_frequencies = future({

							data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
								'{"$match": ',
									'{"$and": [',
										'{"<date>": {"$gte":"', everything$date$min,
											'", "$lte":"', everything$date$max,
										'"}}, {"<source>": {"$in": [',
		#~ 									'"USA", "USABUS", "USABUSLEG", "USAELI", "USAGOV"',
											group$sources,
										']}}, {"<target>": {"$in": [',
		#~ 									'"AFG", "AFGBUS", "AFGCVL", "AFGGOV", "AFGMIL"',
											group$targets,
										']}}]}},',
								'{"$project": {"sourceName": "', group$sourceName, '", "targetName": "', group$targetName, '", "<root_code>": 1}},',
								'{"$group": {',
									'"_id": {',
										'"Source": "$sourceName", "Target": "$targetName", "RootCode": "$<root_code>"',
									'}, "total": {"$sum": 1}}}]',
		#~ 								']}}]}},',
		#~ 						'{"$project": ',
		#~ 							'{"iso_date": {',
		#~ 								'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
		#~ 							'"<root_code>": 1}},',
		#~ 						'{"$project": {',
		#~ 							'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
		#~ 						'{"$group": {',
		#~ 							'"_id": {',
		#~ 								'"Year": {"$year": "$iso_date"},',
		#~ 								'"Week": {"$week": "$iso_date"},',
		#~ 								'"root_code": "$<root_code>"}, "total":{"$sum": 1}}}]',
							sep="")))

							if (nrow(data) != 0) colnames(data) = c('total', 'Source', 'Target', 'RootCode')
							data
					}) %plan% multiprocess

					if (ncol(value(action_frequencies)) == 0) {
						result[nrow(result) + 1,] = c(group$sourceName, group$targetName, rep(0, 20))
					}
					else {
						temp_df = spread(value(action_frequencies), "RootCode", "total", fill = 0)

						missing = setdiff(resHeader, names(temp_df))
						temp_df[missing] = 0
						temp_df = temp_df[resHeader]

						result[nrow(result)+1,] = temp_df
					}
				}
			}
		}
		else {
			print("aggreg all")

			result = data.frame(matrix(ncol = 23, nrow = 0))
			resHeader = c("Source", "Target", (1:20))
			colnames(result) = c("Date", resHeader)

			if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {
				for (group in everything$actors$links) {
					action_frequencies = future({
						data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=[',
							'{"$match": ',
								'{"$and": [',
									'{"<date>": {"$gte":"', everything$date$min,
										'", "$lte":"', everything$date$max,
									'"}}, {"<source>": {"$in": [',
										group$sources,
									']}}, {"<target>": {"$in": [',
										group$targets,
									']}}]}},',
#~ 							'{"$project": {"<date>": 1, "sourceName": "', group$sourceName,
#~ 								'", "targetName": "', group$targetName, '", "<root_code>": 1, "_id": 0}},{"$limit":20}]',

							'{"$project": {"<date>": 1, "<root_code>": 1, "_id": 0}}]',

#~ 							'{"$project": ',
#~ 								'{"iso_date": {',
#~ 									'"$dateFromParts": {"year": "$<year>", "month": "$<month>", "day":"$<day>"}},',
#~ 								'"<root_code>": 1}},',
#~ 							'{"$project": {',
#~ 								'"iso_date": {"$subtract": ["$iso_date", ', 86400000 * diff, ']}, "<root_code>": 1}},',
#~ 							'{"$group": {',
#~ 								'"_id": {',
#~ 									'"Year": {"$year": "$iso_date"},',
#~ 									'"Week": {"$week": "$iso_date"},',
#~ 									'"root_code": "$<root_code>"}, "total":{"$sum": 1}}},{"$limit":10}]',
						sep="")))

						if (nrow(data) != 0) colnames(data) = c("Date", "rootcode")
						data
					}) %plan% multiprocess

					test_df = value(action_frequencies)
					test_df = test_df[complete.cases(test_df),]		#remove NAs
					test_df$Date = as.Date(test_df$Date, "%Y%m%d")

					if (everything$date$dateType == 1) {	#weekly
						date_range = seq(start_date, end_date + weeks(1), by="week")
						test_df$Date = cut(test_df$Date, date_range)	#data in bins
					}
					else if (everything$date$dateType == 2) {	#monthly
						date_range = seq(start_date, end_date %m+% months(1), by="month")
						test_df$Date = cut(test_df$Date, date_range)
					}
					else if (everything$date$dateType == 3) {	#quarterly
						date_range = seq(start_date, end_date %m+% months(4), by="quarter")
						test_df$Date = cut(test_df$Date, date_range)
					}
					else if (everything$date$dateType == 4) {	#yearly
						date_range = seq(start_date, end_date %m+% years(1), by="year")
						test_df$Date = cut(test_df$Date, date_range)
					}
					else {
						print ("bad aggreg data")
					}

					#count number
					tab = table(test_df)

					#convert to matrix
					tab = as.data.frame.matrix(tab)
					
					#add source and target names to tab
					tab["Source"] = group$sourceName
					tab["Target"] = group$targetName
					
					#add missing codes in
					missing = setdiff(resHeader, names(tab))
					tab[missing] = 0
					tab = tab[resHeader]

					#convert to df
					ftab = setDT(tab, keep.rownames=TRUE)[]
					colnames(ftab)[1] = "Date"
					
					result = rbind(result, ftab)
				}
				#collect results
				result = result[with(result, order(Date, Source, Target))]
			}
		}

		print("done with queries")
		print(datasource)

		#standardize root code data frame result
		if (datasource == "api") {
			print("standardizing")
			cleanOrder = sprintf("%d", seq(1:9))
			curOrder = sprintf("%.2d", seq(1:9))
			for (i in 1:9) {
				names(result)[names(result) == curOrder[i]] = cleanOrder[i]
			}
		}
		
		#convert to penta if needed
		#result[[penta#]] = result$1 + result$2 + ...
		#result$1 = NULL ...
		if (!is.null(everything$aggregMode) && everything$aggregMode == "penta") {
			result[["0"]] = result$"1" + result$"2"
			result$"1" = NULL
			result$"2" = NULL
			result[["1"]] = result$"3" + result$"4" + result$"5"
			result$"3" = NULL
			result$"4" = NULL
			result$"5" = NULL
			result[["2"]] = result$"6" + result$"7" + result$"8"
			result$"6" = NULL
			result$"7" = NULL
			result$"8" = NULL
			result[["3"]] = result$"9" + result$"10" + result$"11" + result$"12" + result$"13" + result$"16"
			result$"9" = NULL
			result$"10" = NULL
			result$"11" = NULL
			result$"12" = NULL
			result$"13" = NULL
			result$"16" = NULL
			result[["4"]] = result$"14" + result$"15" + result$"17" + result$"18" + result$"19" + result$"20"
			result$"14" = NULL
			result$"15" = NULL
			result$"17" = NULL
			result$"18" = NULL
			result$"19" = NULL
			result$"20" = NULL
		}

		#download actions here
		if (everything$action == "download" && !is.null(everything$toggles)) {
			print("downloading")
			#prefix action codes with root or penta
			offset = 0;
			if (everything$date$dateType == 0 && everything$actors$actorType == FALSE) {
				print("none")
				offset = 0;
			}
			else if (everything$date$dateType != 0 && everything$actors$actorType == FALSE) {
				print("date only")
				offset = 2;
			}
			else if (everything$date$dateType == 0 && everything$actors$actorType == TRUE) {
				print("actor only")
				offset = 3;
			}
			else {
				print("everything")
				offset = 4;
			}

			#drop columns that are not selected
			for (i in 1:(length(everything$toggles) - 1)) {
				if (!everything$toggles[i + 1]) {
					if (everything$aggregMode == "penta") {
						if (is.data.table(result))
							result[, (toString(i-1)):=NULL]
						else
							result[(toString(i-1))] = NULL
					}
					else {
						if (is.data.table(result))
							result[, (toString(i)):=NULL]
						else
							result[(toString(i))] = NULL
					}
				}
			}

			colnames(result)[offset:length(colnames(result))] =
				if (everything$aggregMode == "penta")
					paste("Penta", colnames(result)[offset:length(colnames(result))])
				else
					paste("Root", colnames(result)[offset:length(colnames(result))])

			fileName = paste("aggregation_", format(Sys.time(), '%Y-%m-%d-%H-%M-%OS4'), sep="")

			write.csv(result, file=paste('./eventdata/downloads/', fileName, ".csv", sep=""))

			event_data_files_url = paste('"', EVENTDATA_ROOK_URL_BASE, '/custom/eventdata-files/', sep="")
			response$write(paste('{"download":', event_data_files_url, fileName, '.csv"}', sep=""))

			return(response$finish())
		}

		result = toString(jsonlite::toJSON(list(
			action_data = result
		)))
	}

	response$write(result)
    return(response$finish())

}
