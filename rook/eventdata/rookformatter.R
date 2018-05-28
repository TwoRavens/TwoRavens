source("rookconfig.R")

relabel = function(queryString, dataset) {

    jsonFormat = jsonlite::fromJSON(readLines(paste("./eventdata/datasets/", dataset, '.json', sep="")))$columns;
    key = names(jsonFormat)

    for (i in 1:length(jsonFormat)) {
        queryString = gsub(key[[i]], jsonFormat[[i]], queryString)
    }
    return(queryString)
}
