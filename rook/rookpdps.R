##
## rookpdps.R
## rook app that takes as input a data file and variable importance related arguments and writes data used for variable importance
##


library(jsonlite)
library(foreign)


send <- function(res) {
    res <- jsonlite:::toJSON(res)
    if (production) {
        sink()
    }
    write(res, "../assets/result.json")

    response <- Response$new(headers = list("Access-Control-Allow-Origin" = "*"))
    response$write(res)
    response$finish()
}


#  to check if the variable is binary
is_binary <- function(v) {
    x <- unique(v)
    length(x) - sum(is.na(x)) == 2L
}


# function to make the data for a predictor p
makeData <- function(d, p){
    print('>>> makeData 1')

    myu <- unique(d[,p])
    myu <- myu[order(myu)]

    for(i in 1:length(myu)) {
        temp <- d[which(d[,p]==myu[i]),]
        
    }

    out <- list(data=d)
    return(out)
}



pdps.app <- function(env) {
    print(env)
    production <- FALSE
    result <- list()


    if (production) {
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)

    print('-----------------------')
    print(request$POST())
    print('-----------------------')
    
    valid <- jsonlite::validate(request$POST()$solaJSON)

    if (! valid) {
        return(send(list(warning = "The request is not valid json. Check for special characters.")))
    }



    everything <- jsonlite::fromJSON(request$POST()$solaJSON, flatten = TRUE)
    print("everything: ")
    print(everything)
    
    dataurl <- everything$datasetUrl
    if (is.null(dataurl)) {
        return(send(list(warning = "No datafile."))) # required
    }

    # reading in data
    separator <- if (endsWith(dataurl, 'csv'))',' else '\t'
    mydata <- read.table(dataurl, sep = separator, header = TRUE, fileEncoding = 'UTF-8')

    tryCatch({
        data <- makeData(d=mydata)
        result <- data
      },
    error = function(err) {
        result <<- list(warning = paste("error: ", err))
        print("result ---- ")
        print(result)
    })

    return(send(result))
}
