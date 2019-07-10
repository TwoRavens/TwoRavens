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

# function to make the data for a predictor p, od for outputDirectory
makeData <- function(d, p, od){
    print('>>> makeData 1')
    print(p)

    # the cutoff at which to sample
    cutoff <- 10000
    
    pdpindex <- vector(length=0, mode="character")
    iceindex <- vector(length=0, mode="numeric")
    
    myu <- unique(d[,p])
    myu <- myu[!is.na(myu)]
    myu <- myu[order(myu)]
    newdata <- d[0,]
    
    datasize <- nrow(d)*length(myu)
    
    if(datasize < cutoff){
        for(i in 1:length(myu)) {
            temp <- d
            temp[,p] <- myu[i]
            newdata <- rbind(newdata,temp)
            tempindex <- as.character(myu[i])
            pdpindex <- c(pdpindex, rep(tempindex, nrow(temp)))
            iceindex <- c(iceindex, 1:nrow(temp))
        }
    } else {
        prob <- cutoff/datasize
        mysize <- prob*nrow(d)
        if(mysize > nrow(d)) mysize<-nrow(d)
        index <- sample(1:nrow(d), mysize, replace=FALSE)
        newd <- d[index,]
        for(i in 1:length(myu)) {
            temp <- newd
            temp[,p] <- myu[i]
            newdata <- rbind(newdata,temp)
            tempindex <- as.character(myu[i])
            pdpindex <- c(pdpindex, rep(tempindex, nrow(temp)))
            iceindex <- c(iceindex, 1:nrow(temp))
        }
    }
    
    datafile <- paste(od, "data.csv", sep="")
    pdpfile <- paste(od, "pdpindex.csv", sep="")
    icefile <- paste(od, "iceindex.csv", sep="")
    write.csv(newdata, datafile)
    write.table(pdpindex, pdpfile, row.names=FALSE, col.names=FALSE)
    write.table(iceindex, icefile, row.names=FALSE, col.names=FALSE)
    
    out <- list(datafile=datafile, pdpfile=pdpfile, icefile=icefile, pdpVar=p)
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
        return(send(list(warning = "No datafile.")))
    }
    
    variables <- everything$variables
    if (is.null(variables)) {
        return(send(list(warning = "No variables.")))
    }
    
    pdpVars <- everything$pdpVars
    if (is.null(pdpVars)) {
        return(send(list(warning = "No pdp variables.")))
    }
    
    outputDirectory <- everything$outputDirectory
    if (is.null(outputDirectory)) {
        return(send(list(warning = "No output directory.")))
    }

    # reading in data
    separator <- if (endsWith(dataurl, 'csv'))',' else '\t'
    mydata <- read.table(dataurl, sep = separator, header = TRUE, fileEncoding = 'UTF-8')

    tryCatch({
        paths <- makeData(d=mydata, p=variables[pdpVars[1]], od=outputdirectory)
        result <- paths
      },
    error = function(err) {
        result <<- list(warning = paste("error: ", err))
        print("result ---- ")
        print(result)
    })

    return(send(result))
}
