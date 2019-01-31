##
## rookmkdocs.R
## rook app that takes as input a data file, datasetDoc info, and problemDoc info, and writes datasetDoc.json and problemDoc.json strings
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




makeDocs <- function(data, name, ID="", citation="", description="", targets=NULL, taskType=NULL, taskSubType=NULL, metric=NULL, problemDoc=NULL, dataDoc=NULL){

    n <- nrow(data)

    ## extract depvarname from targets, note this will only use the first
    depvarname <- targets$colName

    ## Write datasetDoc json string

    columnlist = list()
    allNames <- names(data)
    locatedDV <- FALSE

    for(i in 1:ncol(data)){
    print(i)
    print(colnames(data)[i])
        tempdata <- data[,i]

        if(allNames[i] == depvarname){
            temprole <- "suggestedTarget"
            depvarColIndex <- i-1
            locatedDV <- TRUE
        }else if (i==1){
            temprole <- "index"
        }else {
            temprole <- "attribute"
        }

        # categorical (if non-numeric), real, or integer
        if(!is.numeric(tempdata)){
            temptype <- "categorical"
        } else if(any(!(round(tempdata)==tempdata), na.rm=TRUE)){
            temptype <- "real"
        } else {
            temptype <- "integer"
        }

        temp <- list(colIndex=i-1, colName=allNames[i], colType=temptype, role=I(temprole))
        columnlist[[i]]<- temp
    }

    if(!locatedDV){
        print("No variable name in dataset matched supplied `depvarname` argument.")
    }

    # now overwriting with any new info passed or learned
    dataDoc$dataResources$columns <- list(columnlist)
    dataDoc$about$datasetID <- ID
    dataDoc$about$datasetName <- name
    dataDoc$about$description <- description
    dataDoc$about$citation <- citation
    dataDoc$dataResources$resFormat <- list(dataDoc$dataResources$resFormat) # this may vary based on how the json is read

  ## Write problemDoc json string

    # again assuming just one target
    targets$colIndex <- depvarColIndex
    targets$colName <- depvarname

    # overwriting with any new info passed or learned

    problemDoc$about$problemID <- paste(ID,"_problem",sep="")
    problemDoc$about$problemName <- paste(name,"_problem",sep="")
    problemDoc$about$taskType <- taskType
    problemDoc$about$taskSubType <- taskSubType
    problemDoc$inputs$data$targets<-list(targets)
    problemDoc$inputs$performanceMetrics <- metric
    problemDoc$inputs$data$datasetID <- ID

    # removing taskSubType if "remove"
  if(problemDoc$about$taskSubType=="remove") problemDoc$about$taskSubType <- NULL

# toJSON and out
    dataDoc <- jsonlite:::toJSON(dataDoc, auto_unbox=TRUE, pretty=TRUE)
    problemDoc <- jsonlite:::toJSON(problemDoc, auto_unbox=TRUE, pretty=TRUE)

  out <- list(problemDoc=problemDoc, datasetDoc=dataDoc)
  return(out)
}

# dummy call
#makeDocs(data=bbdata, name=dataname, ID=dataid, citation=citation, description=description, targets=targets, taskType=tasktype, taskSubType="remove", metric=performancemetrics, problemDoc=originalProblemDoc, dataDoc=originalDataDoc)


mkdocs.app <- function(env) {
    print(env)
    production <- FALSE
    result <- list()

    if (production) {
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)
    valid <- jsonlite::validate(request$POST()$solaJSON)
    if (! valid) {
        return(send(list(warning = "The request is not valid json. Check for special characters.")))
    }

    everything <- jsonlite::fromJSON(request$POST()$solaJSON, flatten = TRUE)
    print("everything: ")
    print(everything)

    dataurl <- everything$datafile
    if (is.null(dataurl)) {
        return(send(list(warning = "No datafile."))) # required
    }

    dataid <- everything$datasetid
    if (is.null(dataid)) {
        return(send(list(warning = "No dataset id."))) # required
    }

    dataname <- everything$name
    if (is.null(dataname)) {
        return(send(list(warning = "No dataset name."))) # required
    }

    datadesc <- everything$description
    if (is.null(datadesc)) {
        datadesc <- "No dataset description." # default
#        return(send(list(warning = "No dataset description.")))
    }

    tasktype <- everything$taskType
    if (is.null(tasktype)) {
        return(send(list(warning = "No task type."))) # required
    }

    tasksubtype <- everything$taskSubType
    if (is.null(tasksubtype)) {
        tasksubtype <- "remove" # optional, and will remove when writing problem doc
    }
    
    cites <- everything$citation
    if (is.null(cites)) {
        cites <- "No citation." # optional, and will remove when writing problem doc
    }

    targets <- everything$targets
    if (is.null(targets)) {
        return(send(list(warning = "No target."))) # required
    }

    performancemetrics <- everything$performanceMetrics
    if (is.null(performancemetrics)) {
        return(send(list(warning = "No performance metrics."))) # required
    }

    originalProblemDoc <- everything$problemDoc
    if (is.null(originalProblemDoc)) {
        return(send(list(warning = "No problem doc."))) # required
    }

    originalDataDoc <- everything$datasetDoc
    if (is.null(originalDataDoc)) {
        return(send(list(warning = "No data doc."))) # required
    }


    # reading in data
    separator <- if (endsWith(dataurl, 'csv'))',' else '\t'
    mydata <- read.table(dataurl, sep = separator, header = TRUE, fileEncoding = 'UTF-8')

    tryCatch({
        docs <- makeDocs(data=mydata, name=dataname, ID=dataid, citation=cites, description=datadesc, targets=targets, taskType=tasktype, taskSubType=tasksubtype, metric=performancemetrics, problemDoc=originalProblemDoc, dataDoc=originalDataDoc)
        result <- docs
      },
    error = function(err) {
        result <<- list(warning = paste("error: ", err))
        print("result ---- ")
        print(result)
    })

    return(send(result))
}
