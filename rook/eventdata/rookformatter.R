##
##  rookvalidator.r
##

validate = function(jsonData, format) {
    compliances = list();
    print("FORMATTING")
    print(format);
    print(jsonData);

    jsonFormat = jsonlite::fromJSON(readLines(paste("./eventdata/formats/", format, '.json', sep="")));

    for (keyFormat in jsonFormat) {
        fieldName = keyFormat$name
        print(fieldName);

        logicals = grepl(keyFormat$format, jsonData[,fieldName], perl=TRUE)
        compliances[[fieldName]] = sum(logicals) / length(jsonData[,fieldName])
    }

    return(compliances);
}

relabel = function(queryString, format) {

    jsonFormat = jsonlite::fromJSON(readLines(paste("./eventdata/formats/", format, '.json', sep="")));
    key = names(jsonFormat)

    for (i in 1:length(jsonFormat)) {
        queryString = gsub(key[[i]], jsonFormat[[i]]$name, queryString)
    }
    return(queryString)
}
