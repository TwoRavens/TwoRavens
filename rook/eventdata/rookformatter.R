source("rookconfig.R")

relabel = function(queryString, dataset) {

    columnTypes = jsonlite::fromJSON(readLines(paste("./eventdata/datasets/", dataset, '.json', sep="")))$columns;
    columnTypes = setNames(names(columnTypes), columnTypes)
    key = names(columnTypes)

    for (i in 1:length(columnTypes)) {
        queryString = gsub(key[[i]], columnTypes[[i]], queryString)
    }
    return(queryString)
}
