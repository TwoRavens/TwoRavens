okResult <- function(data=NULL, message=NULL) list(
    success=jsonlite::unbox(TRUE),
    data=data,
    message=jsonlite::unbox(message)
)

errResult <- function(message=NULL, data=NULL) list(
    success=jsonlite::unbox(FALSE),
    message=jsonlite::unbox(message),
    data=data
)

discovery.app <- function(everything) {
    print('entering discovery app')
    requirePackages(packageList.any)

    data <- everything[['data']]
    path <- everything[['path']]
    hostname <- everything[['hostname']]
    fileid <- everything[['fileid']]
    readControl <- if (is.null(everything[['readControl']])) list() else everything[['readControl']]

    if (is.null(data) && is.null(path) && is.null(hostname))
        return(jsonlite::toJSON(errResult("Insufficient arguments to load data")))

    # DATA LOAD
    dataResult <- if (is.null(data)) {
        if (is.null(path)) path <- paste0("http://", hostname, "/api/access/datafile/", fileid)

        sep <- if (!is.null(readControl[['sep']])) readControl[['sep']] else if (endsWith(path, 'tsv')) '\t' else ','

        header <- if (!is.null(readControl[['header']])) readControl[['header']] else TRUE

        # mandatory arguments for read.table
        readControlMandatory <- list(header=header, sep=sep, nrows=5000)

        tryCatch(okResult(do.call(read.table, c(path, modifyList(readControl, readControlMandatory)))), error=function(e)
                 errResult(paste0("Failed to load path '", path, "', with error: '", toString(e), "'")))
    } else okResult(data)

    if (!dataResult$success) return(jsonlite::toJSON(dataResult))
    data <- dataResult$data

    # DATA CLEANING
    cleanResult <- tryCatch({
        # if only two unique (non-missing) values, coerce to numeric
        for (i in 1:ncol(data)) {
            if(!is.numeric(data[, i]) && length(unique(na.omit(data[, i]))) == 2)
                data[, i] <- as.numeric(as.factor(data[, i]))
        }

        # only use numeric variables
        data <- data[,sapply(data, is.numeric)]

        # drop d3mIndex
        if ("d3mIndex" %in% names(data)) data <- data[, -match("d3mIndex", names(data))]
        okResult(data)
    }, error=function(e) errResult(paste0("Failed to clean data with error: ", toString(e))))

    if (!dataResult$success) return(jsonlite::toJSON(dataResult))
    data <- cleanResult$data

    # DISCOVERY
    # using 'complete.obs' is safer than 'pairwise.complete.obs', although it listwise deletes on entire data.frame
    corResult <- tryCatch(okResult(cor(data, use='pairwise.complete.obs')), error=function(e)
                          errResult(paste0("Unable to compute correlation matrix with error: ", toString(e))))

    if (!corResult$success) return(jsonlite::toJSON(corResult))
    correlation <- corResult$data

    # a dataframe with no columns has no problems
    if (identical(correlation, 0)) return(jsonlite::toJSON(okResult(c())))

    # return problems
    jsonlite::toJSON(okResult(c(
        tryCatch(disco.correlation(names(data), correlation, n=3), error=function(e) c()),
        tryCatch(disco.CART(data, top=3), error=function(e) c()),
        tryCatch(disco.ICA(data, top=3), error=function(e) c())
    )))
}


## Function that runs discovery, finding potential models of interest, here by highest correlated variables.

disco.correlation <- function(names, cor, n=3){

    diag(cor) <- 0          # don't include self
    cor[is.na(cor)] <- 0    # don't get tripped up by incomputable cor
    cor[cor==1] <- 0        # don't use variables that are perfect
    cor <- abs(cor)
    found <- list()
    k <- nrow(cor)

    r <- min(k-1,n)  # How many predictor variables to keep

    count<-0
    rating <- NULL
    for(i in 1:k){
        if(!identical(names[i],"d3mIndex")){
            count <- count+1
            temporder <- order(abs(cor[i,]), decreasing=TRUE)[1:r]
            keep <- names[temporder]
            rating <- c(rating,sum(abs(cor[i,temporder])))

            ## VJD: adding fields to found list for more advanced problem discovery. list( means do nothing with them
            found[[count]] <- list(targets=names[i], predictors=keep, transform=list(), subsetObs=list(), subsetFeats=list())
        }

    }

    newfound <- list()
    neworder <- order(rating, decreasing=TRUE)
    for(i in 1:length(rating)){
        newfound[[i]] <- found[[ neworder[i] ]]
    }

    return(newfound)
}

## Use CART trees to find splits, and then find the splits in which the predictive variables change on different sides of splits

disco.CART <- function(data, n=3, samplesize=2000, top=NULL){

    varfind <- function(data,i,r){
        names <- names(data)
        cor <- tryCatch(cor(data, use='pairwise.complete.obs'), error=function(e) matrix(0)) # this will default to a 1x1 matrix with a 0
        cor[cor==1] <- 0        # don't use variables that are perfect
        diag(cor) <- 0
        temporder <- order(abs(cor[i,]), decreasing=TRUE)[1:r]
        keep <- names[temporder]
        rating <- sum(abs(cor[i,temporder]))

        return(list(keep=keep,rating=rating))
    }

    k <- nrow(cor)
    r <- min(k-1,n)  # How many predictor variables to keep
    found <- list()
    count <- 0
    rating <- NULL

    # The CART implementation rpart() can be slow on large datasets
    if(nrow(data)>samplesize){
        myindex <- sample(1:nrow(data),samplesize)
        data <- data[myindex, ]
    }

    allnames <- names(data)
    for(i in 1:length(allnames)){
        myformula <- as.formula(paste(allnames[i], "~", paste(allnames[-i], collapse="+") ))
        tempCART <- rpart(myformula, data, control=rpart.control(maxdepth=1))

        # Only run if split is found
        if(nrow(tempCART$frame)==3){

            splitvar <- tempCART$frame[1,1]
            splitvar.pos <- match(splitvar,names(data))
            split1 <- labels(tempCART)[2]
            split2 <- labels(tempCART)[3]

            flag1 <- eval(parse(text=paste("data$", split1, sep="")))
            #flag2 <- eval(parse(text=paste("data$", split2, sep="")))

            subdata1 <- data[ flag1, -splitvar.pos]     # split variables should not be used any more
            subdata2 <- data[!flag1, -splitvar.pos]

            iposition <- match(allnames[i], names(subdata1))
            out1 <- varfind(data=subdata1, i=iposition, r=r)
            out2 <- varfind(data=subdata2, i=iposition, r=r)

            if(!identical(out1$keep,out2$keep)){
                #cat("found contrast:", out1$rating, out1$keep, "|", out2$keep, out2$rating,"\n")
                count <- count+1
                if(out1$rating>=out2$rating){
                    found[[count]] <- list(targets=allnames[i], predictors=out1$keep, transform=list(), subsetObs=list(split1), subsetFeats=list())
                }else{
                    found[[count]] <- list(targets=allnames[i], predictors=out2$keep, transform=list(), subsetObs=list(split2), subsetFeats=list())
                }
                rating <- c(rating, abs(out1$rating - out2$rating))
            } #else {
                #cat("no contrast", out1$keep, out2$keep, "\n")
            #}

        }

    }

    newfound <- list()
    neworder <- order(rating, decreasing=TRUE)
    for(i in 1:length(rating)){
        newfound[[i]] <- found[[ neworder[i] ]]
    }

    if(!is.null(top)){
        top <- min(top, length(newfound))
    } else {
        top <- sum((rating/mean(rating))>1.1)
    }
    newfound <- newfound[1:top]

    return(newfound)

}

## Use Item Cluster Analysis to find sets of variables that are better explained than individual variables

disco.ICA <- function(data, n=3, top=3){

    allnames <- names(data)
    k <- nrow(cor)
    r <- min(k-1,n)  # How many predictor variables to keep
    found <- list()
    count <- 0
    rating <- NULL

    cor <- tryCatch(cor(data, use='pairwise.complete.obs'), error=function(e) matrix(0)) # this will default to a 1x1 matrix with a 0
    cor[cor==1] <- 0        # don't use variables that are perfect
    diag(cor) <- 0

    for(i in 1:length(allnames)){
        temporder <- order(abs(cor[i,]), decreasing=TRUE)[1:(n+1)]
        tempdata <- data[,temporder[2:length(temporder)]]
        tempdata$newvar <- data[,i] + data[, temporder[1]]
        newcor <- tryCatch(cor(tempdata, use='pairwise.complete.obs'), error=function(e) matrix(0)) # this will default to a 1x1 matrix with a 0
        newcor[newcor==1] <- 0        # don't use variables that are perfect
        diag(newcor) <- 0

        #if(sum(abs(newcor[(n+1),])) > sum(abs(cor[i,temporder[2:length(temporder)] ]))){
            count <- count + 1
            newtarget <- paste(allnames[i], "_", allnames[temporder[1]], sep="")
            transform <- paste(newtarget, "=", allnames[i], "+", allnames[temporder[1]] )
            found[[count]] <- list(targets=allnames[i], predictors=allnames[temporder[2:length(temporder)]], transform=list(transform), subsetObs=list(), subsetFeats=list())
            rating[count] <- sum(abs(newcor[(n+1),])) - sum(abs(cor[i,temporder[2:length(temporder)] ]))
        #}

    }

    newfound <- list()
    neworder <- order(rating, decreasing=TRUE)
    for(i in 1:length(rating)){
        newfound[[i]] <- found[[ neworder[i] ]]
    }

    top <- min(top, length(newfound))
    newfound <- newfound[1:top]

    return(newfound)

}
