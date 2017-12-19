##
##  rookeventdata.r
##

## LOCAL SETUP STEPS:
# 0. If on windows, use Ubuntu on a virtualbox to prevent this error:
#       Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8000/custom/eventdataapp. (Reason: CORS header ‘Access-Control-Allow-Origin’ missing).
#
# 1. Install mongodb
#
# 2. Start a mongo server. Server port is 27017 by default
#      sudo service mongod start
#
# 3. Create a new database using the mongoimport utility in the mongo bin (via cmd from ~/TwoRavens/)
#      mongoimport -d event_scrape -c phoenix_events --type csv --columnsHaveTypes --fields ".auto(),X.auto(),GID.auto(),Date.string(),Year.auto(),Month.auto(),Day.auto(),Source.auto(),SrcActor.auto(),SrcAgent.auto(),SOthAgent.auto(),Target.auto(),TgtActor.auto(),TgtAgent.auto(),TOthAgent.auto(),CAMEO.string(),RootCode.string(),QuadClass.auto(),Goldstein.auto(),None.auto(),Lat.auto(),Lon.auto(),Geoname.auto(),AdminInfo.auto(),CountryCode.auto(),ID.auto(),URL.auto(),sourcetxt.auto()" --file ~/TwoRavens/data/samplePhox.csv
#      mongoimport -d event_scrape -c icews_events --type tsv --columnsHaveTypes --fields "Event ID.string(),Event Date.string(),Source Name.string(),Source Sectors.string(),Source Country.string(),Event Text.string(),CAMEO Code.string(),Intensity.auto(),Target Name.string(),Target Sectors.string(),Target Country.string(),Story ID.string(),Sentence Number.string(),Publisher.string(),City.string(),District.string(),Province.string(),Country.string(),Latitude.auto(),Longitude.auto()" --file ~/Downloads/events.2014.20160121105408.tab
#      mongoimport -d event_scrape -c phoenix_swb_events --type csv  --columnsHaveTypes --fields "eid.string(),story_date.string(),year.string(),month.string(),day.string(),source.string(),source_root.string(),source_agent.string(),source_others.string(),target.string(),target_root.string(),target_agent.string(),target_others.string(),code.string(),root_code.string(),quad_class.auto(),goldstein.auto(),joined_issues.string(),lat.string(),lon.string(),placename.string(),statename.string(),countryname.string(),aid.string(),process.string()" --file ~/Downloads/PhoenixSWB_1979-2015.csv
#      mongoimport -d event_scrape -c phoenix_fbis_events --type csv --columnsHaveTypes --fields "eid.string(),story_date.string(),year.string(),month.string(),day.string(),source.string(),source_root.string(),source_agent.string(),source_others.string(),target.string(),target_root.string(),target_agent.string(),target_others.string(),code.string(),root_code.string(),quad_class.auto(),goldstein.auto(),joined_issues.string(),lat.string(),lon.string(),placename.string(),statename.string(),countryname.string(),aid.string(),process.string()" --file ~/Downloads/PhoenixFBIS_1995-2004.csv
#      mongoimport -d event_scrape -c phoenix_nyt_events --type csv --columnsHaveTypes --fields "eid.string(),story_date.string(),year.string(),month.string(),day.string(),source.string(),source_root.string(),source_agent.string(),source_others.string(),target.string(),target_root.string(),target_agent.string(),target_others.string(),code.string(),root_code.string(),quad_class.auto(),goldstein.auto(),joined_issues.string(),lat.string(),lon.string(),placename.string(),statename.string(),countryname.string(),aid.string(),process.string()" --file ~/Downloads/PhoenixNYT_1945-2005.csv
#
#          Remove any straggling header documents via db.phoenix_events.remove({"Date": "Date"}), and db.icews_events.remove({"Source Country": "Source Country"})
#      3a. To check that the csv data is available, run in new CMD:
#          (connects to mongo server on default port, opens mongo prompt)
#            mongo
#       b. Switch to event_scrape database
#            use event_scrape
#       c. Return all data from the phoenix_events table
#            db.phoenix_events.find()
#
# 4. Start a local R server to make this file available here: (should prompt for solajson)
#      http://localhost:8000/custom/eventdataapp
#
#      4a. Install/run R, to enter R prompt
#       b. Run source('rooksource.R') to start R server
#          Note: Rook, the R package that runs the R server, does not seem to recognize file updates,
#                so the server must be restarted after each edit. There should be a better way.
# 
# 5. Start a local spec-api server from the multi-set branch here:
#      https://github.com/Sayeedsalam/spec-event-data-server/tree/local
#      python ./app_v2.py
#      The api will now be available on 0.0.0.0:5002
#
# 6. Submit query from local python server via eventdata web gui. This script will return the subsetted data
#
# 7. Permit CORS on your browser. This doesn't seem to work on Windows
#      7a. Google Chrome: start with terminal argument
#             google-chrome --disable-web-security
#       b. Mozilla Firefox: in about:config settings
#             security.fileuri.strict_origin_policy - set to False
# NOTE: Use quit() to close the R server. Otherwise the ports will not correctly be released.
#       If you use Rstudio, modify the IDE config so that it won't share the same port as the R server
eventdata_subset.app <- function(env) {
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
        print("Preflight")
        response$status = 200L

        # Ensures CORS header is permitted
        response$header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        response$header("Access-Control-Allow-Headers", "origin, content-type, accept")
        return(response$finish())
    }

    print("Request received")

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

    # raw: return query as is
    # summary: return metadata
    # actor: return actor filtering
    # formatted: check if database is properly formatted
    # validate: check if query is valid

    type = everything$type

    dataset = everything$dataset
    subsets = everything$subsets
    variables = everything$variables

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

    if (!is.null(type) && type == 'formatted') {
        validations = validate(getData(paste(eventdata_url, '&aggregate=[{"$limit":100}]', sep="")), format)
        response$write(paste('{"variables": ', toString(jsonlite::toJSON(validations)), '}'))
        return(response$finish())
    }

    if (!is.null(type) && type == 'raw') {
        result = getData(paste(eventdata_url, '&aggregate=', 
            '[{"$match":', subsets, '},',
             '{"$project":', variables, '}]', sep=""))
        result['_id'] = NULL
        fileName = format(Sys.time(), '%Y-%m-%d-%H-%M-%OS4')

        write.csv(result, file=paste('./eventdata/downloads/', fileName, ".csv", sep=""))
        response$write(paste('{"download":', '"http://127.0.0.1:8000/custom/eventdata-files/', fileName, '.csv"}', sep=""))
        return(response$finish())
    }

    if (!is.null(type) && type == 'validate') {

        handler = function(exc) {
            cleanedExc = gsub('\\\n', '', gsub('"', "'", toString(exc)))
            print(paste('{"response": "The custom query is malformed:', cleanedExc, '"}'))

            response$write(paste('{"response": "The custom query is malformed:', cleanedExc, '"}'))
        }

        tryCatch({
            getData(paste(eventdata_url, '&query=', subsets, sep=""))
            response$write('{"response": "Query is valid."}')},
        warning = handler,
        error = handler
        )
        return(response$finish())
    }

    # Arguments specific to sources/targets queries
    if (!is.null(type) && type == 'source') {
        unique_vals = sort(unlist(getData(paste(eventdata_url, '&unique=<source>&query=', subsets, sep=""))))
        response$write(toString(jsonlite::toJSON(list(source = unique_vals))))
        return(response$finish())
    }

    if (!is.null(type) && type == 'target') {
        unique_vals = sort(unlist(getData(paste(eventdata_url, '&unique=<target>&query=', subsets, sep=""))))
        response$write(toString(jsonlite::toJSON(list(target = unique_vals))))
        return(response$finish())
    }

    # Check if metadata has already been computed, and return cached value if it has
    # if (!file.exists("./data/cachedQueries.RData")) save(list(0), file="./data/cachedQueries.RData")
    #
    # cachedQueries = load("./data/cachedQueries.RData")
    # if (subsets %in% cachedQueries) {
    #     response$write(getData(paste("./data/", match(subsets, cachedQueries)), ".txt"))$data
    #     return(response$finish())
    # }

    # Useful for the target and source other fields, to unwrap the semicolon-delimited values
    uniques = function(values) {
        accumulator = list()
        for (key in values) {
            if (!is.na(key) && key != "") {
                accumulator = c(accumulator, strsplit(key, ';'))
            }
        }
        return(sort(unlist(unique(do.call(c, accumulator)))))
    }

    if (production) {
        sink()
    }

    if (dataset %in% list("phoenix_rt", "cline_phoenix_fbis", "cline_phoenix_nyt", "cline_phoenix_swb")) {

        # This is a new query, so compute new metadata
        query_url = paste(eventdata_url, '&query=', subsets, sep="")

        date_frequencies = future({
            data = do.call(data.frame, getData(paste(query_url, '&group=<year>,<month>', sep="")))
            if (nrow(data) != 0) colnames(data) = c('total', '<year>', '<month>')
            data
        }) %plan% multiprocess

        country_frequencies = future({
            data = do.call(data.frame, getData(paste(query_url, '&group=<country_code>', sep="")))
            if (nrow(data) != 0) colnames(data) = c('total', '<country_code>')
            data
        }) %plan% multiprocess

        action_frequencies = future({
            data = do.call(data.frame, getData(paste(query_url, '&group=<root_code>', sep="")))
            if (nrow(data) != 0) colnames(data) = c('total', '<root_code>')
            data
        }) %plan% multiprocess

        actor_source = future({
            sort(unlist(getData(paste(query_url, '&unique=<source>', sep=""))))
        }) %plan% multiprocess

        actor_source_entities = future({
            sort(unlist(getData(paste(query_url, '&unique=<src_actor>', sep=""))))
        }) %plan% multiprocess

        actor_source_role = future({
            sort(unlist(getData(paste(query_url, '&unique=<src_agent>', sep=""))))
        }) %plan% multiprocess

        actor_source_attributes = future({
            url = relabel(paste(query_url, '&unique=<src_other_agent>', sep=""), format)
            uniques(jsonlite::fromJSON(readLines(url))$data)
        }) %plan% multiprocess

        actor_target = future({
            sort(unlist(getData(paste(query_url, '&unique=<target>', sep=""))))
        }) %plan% multiprocess

        actor_target_entities = future({
            sort(unlist(getData(paste(query_url, '&unique=<tgt_actor>', sep=""))))
        }) %plan% multiprocess

        actor_target_role = future({
            sort(unlist(getData(paste(query_url, '&unique=<tgt_agent>', sep=""))))
        }) %plan% multiprocess

        actor_target_attributes = future({
            url = relabel(paste(query_url, '&unique=<tgt_other_agent>', sep=""), format)
            uniques(jsonlite::fromJSON(readLines(url))$data)
        }) %plan% multiprocess


        actor_source_values = list(
            full = value(actor_source),
            entities = value(actor_source_entities),
            roles = value(actor_source_role),
            attributes = value(actor_source_attributes)
        )

        actor_target_values = list(
            full = value(actor_target),
            entities = value(actor_target_entities),
            roles = value(actor_target_role),
            attributes = value(actor_target_attributes)
        )

        # Package actor data
        actor_values = list(
            source = actor_source_values,
            target = actor_target_values
        )

        result = toString(jsonlite::toJSON(list(
            date_data = value(date_frequencies),
            country_data = value(country_frequencies),
            action_data = value(action_frequencies),
            actor_data = actor_values
        )))
    }

    if (dataset == "icews") {

        # This is a new query, so compute new metadata
        query_url = paste(eventdata_url, '&query=', subsets, sep="")

        date_frequencies = future({
            data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=', 
                '[{"$match":', subsets, '},',
                 '{"$project": {"Year":  {"$substr": ["$<date>", 0, 4]},',
                              '"Month": {"$substr": ["$<date>", 5, 2]}}},',                           # Construct year and month fields
                 '{"$group": { "_id": { "year": "$Year", "month": "$Month" }, "total": {"$sum": 1} }}]', sep=""))) # Group by years and months
            if (nrow(data) != 0) colnames(data) = c('total', '<year>', '<month>')
            data
        }) %plan% multiprocess

        country_frequencies = future({
            data = do.call(data.frame, getData(paste(query_url, '&group=<country>', sep="")))
            if (nrow(data) != 0) colnames(data) = c('total', '<country_code>')
            data
        }) %plan% multiprocess

        action_frequencies = future({
            data = do.call(data.frame, getData(paste(eventdata_url, '&aggregate=', 
                '[{"$match":', subsets, '},',
                 '{"$project": {"RootCode":  {"$substr": ["$<cameo>", 0, 2]}}},',                           # Construct RootCode field
                 '{"$group": { "_id": { "root_code": "$RootCode" }, "total": {"$sum": 1} }}]', sep=""))) # Group by RootCode
            if (nrow(data) != 0) colnames(data) = c('total', '<root_code>')
            data
        }) %plan% multiprocess
        

        actor_source_country = future({
            getData(paste(query_url, '&unique=<src_country>', sep=""))
        }) %plan% multiprocess

        actor_target_countries = future({
            getData(paste(query_url, '&unique=<tgt_country>', sep=""))
        }) %plan% multiprocess

        actor_source_values = list(
            full = value(actor_source_country)
        )

        actor_target_values = list(
            full = value(actor_target_countries)
        )

        # Package actor data
        actor_values = list(
            source = actor_source_values,
            target = actor_target_values
        )

        result = toString(jsonlite::toJSON(list(
            date_data = value(date_frequencies),
            country_data = value(country_frequencies),
            action_data = value(action_frequencies),
            actor_data = actor_values
        )))
    }

    # If your R installation does not support futures multiprocessing, it will fall back to multisession processing
    # In the multisession fallback case, prints are sent to different R sessions and not the server console

    print("Request completed")
    response$write(result)
    return(response$finish())
}
