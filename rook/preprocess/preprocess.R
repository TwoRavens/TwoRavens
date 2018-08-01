##
##  preprocess.R
##
##  May 29, 2015
##

library(rjson)
library(DescTools)
library(XML)


preprocess<-function(hostname=NULL, fileid=NULL, testdata=NULL, types=NULL, filename=NULL){
    
  #config=jsonlite::fromJSON("config.json")  
  #metadataurl=config$metadata
  metadataurl=NULL
  
  
  histlimit<-13
    
    if(!is.null(testdata)){
        mydata<-testdata
       
    }else if(!is.null(filename)){
        mydata<-tryCatch(expr=read.delim(file=filename), error=function(e) NULL)
    }else{
        path<-paste("http://",hostname,"/api/access/datafile/",fileid,sep="")
        mydata<-tryCatch(expr=read.delim(file=path), error=function(e) NULL)
        #mydata<-getDataverse(hostname=hostname, fileid=fileid) #could use this function if we set up a common set of utilities with the rook code.
    }
   
    
    defaulttypes <- typeGuess(mydata)
    
    # Note: types can be passed directly to preprocess, as would be the case if a TwoRavens user tagged a variable as "nominal"
    if(is.null(types)) { # no types have been passed, so simply copying the defaults into the type fields
      
        types$numchar <- defaulttypes$defaultNumchar
        types$nature <- defaulttypes$defaultNature
        types$binary <- defaulttypes$defaultBinary
        types$interval <- defaulttypes$defaultInterval
        types$time <- defaulttypes$defaultTime
        types <- c(types, defaulttypes)
    }else{ # types have been passed, so filling in the default type fields and accounting for the possibility that the types that have been passed are ordered differently than the default types
     
      for(i in 1:length(types$varnamesTypes)) {
            t <- which(defaulttypes$varnamesTypes==types$varnamesTypes[i])
            types$defaultNumchar[i] <- defaulttypes$defaultNumchar[t]
            types$defaultNature[i] <- defaulttypes$defaultNature[t]
            types$defaultBinary[i] <- defaulttypes$defaultBinary[t]
            types$defaultInterval[i] <- defaulttypes$defaultInterval[t]
            types$defaultTime[i] <- defaulttypes$defaultTime[t]
        }
    }
    
    
    # calculating the summary statistics
    mySumStats <- calcSumStats(mydata, types)
    
    k<-ncol(mydata)
    varnames<-names(mydata)
    hold<-list()
    holdcdf<-list()
    count<-0
    metadataflag<-0

    
    if(!is.null(metadataurl) && metadataurl!="")
    {
      metadataflag=1
      metadataurl<-sub("~/TwoRavens","..",metadataurl) # note this may not work like this in production
      data <- xmlParse(metadataurl)
      mydt=xmlToList(data)
      myjsondt=rjson::toJSON(mydt)
      testdt=rjson::fromJSON(myjsondt)
      StudyDesc=testdt$stdyDscr
      FileDesc=testdt$fileDscr
      vars=testdt$dataDscr
    }
    
    for(i in 1:k){
        nat <- types$nature[which(types$varnamesTypes==varnames[i])]
        myint <- types$interval[which(types$varnamesTypes==varnames[i])]
        if(nat!="nominal"){
            uniqueValues<-sort(na.omit(unique(mydata[,i])))
            lu <- length(uniqueValues)
            cdf_func <- ecdf(mydata[,i])
            if(lu< histlimit){
                output<- table(mydata[,i])
                hold[[i]]<- list(plottype="bar", plotvalues=output)
                
                cdfX <- seq(from=uniqueValues[1],to=uniqueValues[lu],length.out=lu)
                cdfY <- cdf_func(cdfX)
                holdcdf[[i]] <- list(cdfplottype="bar", cdfplotx=cdfX, cdfploty=cdfY)
            }else{
                output<- density( mydata[,i], n=50, na.rm=TRUE )
                hold[[i]]<- list(plottype="continuous", plotx=output$x, ploty=output$y)
                if(lu>=50 | (lu<50 & myint != "discrete")) { # if num uniques greater than 50, we get a cumulative density point for each unique
                    cdfX <- seq(from=min(mydata[,i],na.rm=TRUE),to=max(mydata[,i],na.rm=TRUE),length.out=50)
                } else { # if num uniques between histlimit and 50 and interval is discrete, we get a cumulative density point for each unique
                    cdfX <- seq(from=min(mydata[,i],na.rm=TRUE),to=max(mydata[,i],na.rm=TRUE),length.out=lu)
                }
                cdfY <- cdf_func(cdfX)
                holdcdf[[i]] <- list(cdfplottype="continuous", cdfplotx=cdfX, cdfploty=cdfY)
            }
            
        }else{
            output<- table(mydata[,i])
            hold[[i]]<- list(plottype="bar", plotvalues=output)
            holdcdf[[i]] <- list(cdfplottype="NULL", cdfplotx="NULL", cdfploty="NULL")
        }
        
        if(metadataflag==1)
        lablname=vars[i]$var$labl$text
        else
          lablname=""
        
        hold[[i]] <- c(hold[[i]],holdcdf[[i]], labl=lablname,lapply(mySumStats, `[[`,which(mySumStats$varnamesSumStat==varnames[i])),lapply(types, `[[`,which(types$varnamesTypes==varnames[i])))
    }
    names(hold)<-varnames
    
    
    
    #if(file.exists(xmlfile)){
    #if metadata file URL is given, the metadata flag is 1, and we take dataset info values from the xml meta data file supplied by dataverse.
    #else, we initialise the keys with blank values.
    
    if(metadataflag==1){ 
     dataseinf=list(stdyDscr=StudyDesc,fileDscr=FileDesc)
      datasetLevelInfo<-list(private=FALSE,stdyDscr=StudyDesc,fileDscr=FileDesc)

      
      jsontest<-rjson:::toJSON(datasetLevelInfo)
    #  write(jsontest,file="test.json")  
      
    }
    
    else{
    datasetLevelInfo<-list(private=FALSE,stdyDscr=list(citation=list(titlStmt=list(titl="",IDNo=list("-agency"="","#text"="")),rspStmt=list(Authentry=""),biblcit="No Data Citation Provided")),fileDscr=list("-ID"="",fileTxt=list(fileName="",dimensns=list(caseQnty="",varQnty=""),fileType=""),notes=list("-level"="","-type"="","-subject"="","#text"="")))    # This signifies that that the metadata summaries are not privacy protecting
    }
    #datasetitationinfo
    
    print("dataset level info")
    print(datasetLevelInfo)
    
    # adding the covariance matrix for all numeric variables to the datasetLevelInfo
    # using 'complete.obs' is safer than 'pairwise.complete.obs', although it listwise deletes on entire data.frame
    mydata2 <- mydata
    # If only two unique (non-missing) values, coerce to numeric for correlation matrix
    for(i in 1:ncol(mydata2)){
        temp<-mydata2[,i]
        if(!is.numeric(temp)){
            if(length(unique(na.omit(temp)))==2){
                mydata2[,i]<-as.numeric(as.factor(mydata2[,i]))
            }
        }
    }
    mydata2 <- mydata2[sapply(mydata2,is.numeric)]

    mycov <- tryCatch(cov(mydata2, use='complete.obs'), error=function(e) matrix(0)) # this will default to a 1x1 matrix with a 0
    mycor <- tryCatch(cor(mydata2, use='pairwise.complete.obs'), error=function(e) matrix(0)) # this will default to a 1x1 matrix with a 0

    if(!identical(mycor,0)){
        mydisco<-disco(names(mydata2), mycor, n=3)
    }else{
        mydisco<-NULL
    }

    # Add problems that use discovered splits and constructed variables
    mydisco <- c(mydisco, disco2(mydata2, top=3), disco3(mydata2, top=3))  

    datasetLevelInfo[["covarianceMatrix"]] <- mycov
    datasetLevelInfo[["discovery"]] <- mydisco
    
    jsontest<-rjson:::toJSON(datasetLevelInfo)
    write(jsontest,file="test.json")
      ## Construct Metadata file that at highest level has list of dataset-level, and variable-level information
    largehold<- list(dataset=datasetLevelInfo, variables=hold)
    
    jsonHold<-rjson:::toJSON(largehold)
    
    return(jsonHold)
}

## calcSumStats is a function that takes as input a dataset and the types for each variable, as returned by typeGuess()
calcSumStats <- function(data, types) {
    
    Mode <- function(x, nat) {
        out <- list(mode=NA, mid=NA, fewest=NA, freqmode=NA, freqfewest=NA, freqmid=NA)
        ux <- unique(x)
        tab <- tabulate(match(x, ux))
        
        out$mode <- ux[which.max(tab)]
        out$freqmode <- max(tab)
        
        out$mid <- ux[which(tab==median(tab))][1] # just take the first
        out$fewest <- ux[which.min(tab)]
        
        out$freqmid <- median(tab)
        out$freqfewest <- min(tab)
        
        return(out)
    }
    
    k <- ncol(data)
    out<-list(varnamesSumStat=colnames(data), median=as.vector(rep(NA,length.out=k)), mean=as.vector(rep(NA,length.out=k)), mode=as.vector(rep(NA,length.out=k)), max=as.vector(rep(NA,length.out=k)), min=as.vector(rep(NA,length.out=k)), invalid=as.vector(rep(NA,length.out=k)), valid=as.vector(rep(NA,length.out=k)), sd=as.vector(rep(NA,length.out=k)), uniques=as.vector(rep(NA,length.out=k)), herfindahl=as.vector(rep(NA,length.out=k)), freqmode=as.vector(rep(NA,length.out=k)), fewest=as.vector(rep(NA,length.out=k)), mid=as.vector(rep(NA,length.out=k)), freqfewest=as.vector(rep(NA,length.out=k)), freqmid=as.vector(rep(NA,length.out=k)) )
    
    for(i in 1:k) {
        
        v <- data[,i]
        nc <- types$numchar[which(types$varnamesTypes==out$varnamesSumStat[i])]
        
        nat <- types$nature[which(types$varnamesTypes==out$varnamesSumStat[i])]
        
        # this drops the factor
        v <- as.character(v)
        
        out$invalid[i] <- length(which(is.na(v)))
        out$valid[i] <- length(v)-out$invalid[i]
        
        v[v=="" | v=="NULL" | v=="NA" | v=="."]  <- NA
        v <- v[!is.na(v)]
        
        tabs <- Mode(v, nat)
        out$mode[i] <- tabs$mode
        out$freqmode[i] <- tabs$freqmode
        
        out$uniques[i] <- length(unique(v))
        
        if(nc=="character") {
            out$fewest[i] <- tabs$fewest
            out$mid[i] <- tabs$mid
            out$freqfewest[i] <- tabs$freqfewest
            out$freqmid[i] <- tabs$freqmid
            
            herf.t <- table(v)
            out$herfindahl[i] <- Herfindahl(herf.t)
            
            out$median[i] <- "NA"
            out$mean[i] <- "NA"
            out$max[i] <- "NA"
            out$min[i] <- "NA"
            out$sd[i] <- "NA"
            
            next
        }
        
        # if not a character
        v <- as.numeric(v)
        
        out$median[i] <- median(v)
        out$mean[i] <- mean(v)
        out$max[i] <- max(v)
        out$min[i] <- min(v)
        out$sd[i] <- sd(v)
        
        out$mode[i] <- as.character(signif(as.numeric(out$mode[i]), 4))
        out$fewest[i] <- as.character(signif(as.numeric(tabs$fewest,4)))
        out$mid[i] <- as.character(signif(as.numeric(tabs$mid,4)))
        out$freqfewest[i] <- as.character(signif(as.numeric(tabs$freqfewest,4)))
        out$freqmid[i] <- as.character(signif(as.numeric(tabs$freqmid,4)))
        
        herf.t <- table(v)
        out$herfindahl[i] <- Herfindahl(herf.t)
    }
    return(out)
}


## typeGuess() is a function that takes as input a dataset and returns our best guesses at types of variables. numchar is {"numeric" , "character"}, interval is {"continuous" , "discrete"}, nature is {"nominal" , "ordinal" , "interval" , "ratio" , "percent" , "other"}. binary is {"yes" , "no"}. if numchar is "character", then by default interval is "discrete" and nature is "nominal".
typeGuess <- function(data) {
    
    k <- ncol(data)
    
    out<-list(varnamesTypes=colnames(data), defaultInterval=as.vector(rep(NA,length.out=k)), defaultNumchar=as.vector(rep(NA,length.out=k)), defaultNature=as.vector(rep(NA,length.out=k)), defaultBinary=as.vector(rep("no",length.out=k)), defaultTime=as.vector(rep("no",length.out=k)))
  
    numchar.values <- c("numeric", "character")
    interval.values <- c("continuous", "discrete")
    nature.values <- c("nominal", "ordinal", "interval", "ratio", "percent", "other")
    binary.values <- c("yes", "no")
    time.values <- c("yes", "no")
    
    
    Decimal <-function(x){
        result <- FALSE
        level <- floor(x)
        if(any(x!=level)) result <- TRUE
        
        return(result)
    }
    
    # Nature() takes a column of data x, and a boolean c that is true if x is continuous, and a vector nat that is the values of nature and returns a guess at the nature field
    Nature <- function(x, c, nat) {
        if(c) { # interval is continuous
            if(all(x >=0 & x <=1)) {
                return(nat[5])
            }
            else if(all(x >=0 & x <=100) & min(x) < 15 & max(x) > 85){
                return(nat[5])
            } else {
                return(nat[4]) # ratio is generally the world we're going to be in
            }
        } else { # interval is discrete
            return(nat[2]) # if it is a continuous, discrete number, assume ordinal
        }
    }
    
    # Time() takes a column of data x and returns "yes" or "no" for whether x is some unit of time
    Time <- function(x){
        # eventually, this should test the variable against known time formats
        return("no")
    }
    
    
    for(i in 1:k){
        
        v<- data[,i]
        
        # time
        out$defaultTime[i] <- Time(v)
        
        # if variable is a factor or logical, return character
        if(is.factor(v) | is.logical(v)) {
            out$defaultInterval[i] <- interval.values[2]
            out$defaultNumchar[i] <- numchar.values[2]
            out$defaultNature[i] <- nature.values[1]
            
            v <- as.character(v)
            v[v=="" | v=="NULL" | v=="NA"]  <- NA
            v <- v[!is.na(v)]
            
            if(length(unique(v))==2) {out$defaultBinary[i] <- binary.values[1]}
            next
        }
        
        v <- as.character(v)
        v[v=="" | v=="NULL" | v=="NA"]  <- NA
        v <- v[!is.na(v)]
        
        # converts to numeric and if any do not convert and become NA, numchar is character
        v <- as.numeric(v)
        
        if(length(unique(v))==2) {out$defaultBinary[i] <- binary.values[1]} # if there are only two unique values after dropping missing, set binary to "yes"
        
        if(any(is.na(v))) { # numchar is character
            out$defaultNumchar[i] <- numchar.values[2]
            out$defaultNature[i] <- nature.values[1]
            out$defaultInterval[i] <- interval.values[2]
        } else { # numchar is numeric
            out$defaultNumchar[i] <- numchar.values[1]
            
            d <- Decimal(v)
            if(d) { # interval is continuous
                out$defaultInterval[i] <- interval.values[1]
                out$defaultNature[i] <- Nature(v,TRUE, nature.values)
            } else { # interval is discrete
                out$defaultInterval[i] <- interval.values[2]
                out$defaultNature[i] <- Nature(v,FALSE, nature.values)
            }
        }
    }
    
    return(out)
}

## Function that runs discovery, finding potential models of interest, here by highest correlated variables.

disco <- function(names, cor, n=3){

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
            
            ## VJD: adding fields to found list for more advanced problem discovery. 0 means do nothing with them
            found[[count]] <- list(target=names[i], predictors=keep, transform=0, subsetObs=0, subsetFeats=0) 
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

disco2 <- function(data, n=3, samplesize=2000, top=NULL){

    varfind <- function(data,i,r){
        names <- names(data)
        cor <- cor(data) 
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
            
            cat("--\n")
            cat(split1, "\n")
            print(myformula)
            cat("--\n")

            print(summary(tempCART))

            flag1 <- eval(parse(text=paste("data$", split1, sep="")))
            #flag2 <- eval(parse(text=paste("temp$", split2, sep="")))

            subdata1 <- data[ flag1, -splitvar.pos]     # split variables should not be used any more
            subdata2 <- data[!flag1, -splitvar.pos]

            iposition <- match(allnames[i], names(subdata1))
            out1 <- varfind(data=subdata1, i=iposition, r=r)
            out2 <- varfind(data=subdata2, i=iposition, r=r)

            if(!identical(out1$keep,out2$keep)){
                #cat("found contrast:", out1$rating, out1$keep, "|", out2$keep, out2$rating,"\n")
                count <- count+1
                if(out1$rating>=out2$rating){
                    found[[count]] <- list(target=allnames[i], predictors=out1$keep, transform=0, subsetObs= split1, subsetFeats=0)
                }else{
                    found[[count]] <- list(target=allnames[i], predictors=out2$keep, transform=0, subsetObs= split2, subsetFeats=0)
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

disco3 <- function(data, n=3, top=3){

    allnames <- names(data)
    k <- nrow(cor)
    r <- min(k-1,n)  # How many predictor variables to keep
    found <- list()
    count <- 0
    rating <- NULL

    cor <- cor(data)
    cor[cor==1] <- 0        # don't use variables that are perfect
    diag(cor) <- 0

    for(i in 1:length(allnames)){
        temporder <- order(abs(cor[i,]), decreasing=TRUE)[1:(n+1)]
        tempdata <- data[,temporder[2:length(temporder)]]
        tempdata$newvar <- data[,i] + data[, temporder[1]]
        newcor <- cor(tempdata)
        newcor[newcor==1] <- 0        # don't use variables that are perfect
        diag(newcor) <- 0

        #if(sum(abs(newcor[(n+1),])) > sum(abs(cor[i,temporder[2:length(temporder)] ]))){
            count <- count + 1
            newtarget <- paste(allnames[i], "_", allnames[temporder[1]], sep="")
            transform <- paste(newtarget, "=", allnames[i], "+", allnames[temporder[1]] )
            found[[count]] <- list(target=allnames[i], predictors=allnames[temporder[2:length(temporder)]], transform=transform, subsetObs=0, subsetFeats=0)
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

