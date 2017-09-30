##
##  rookpipeline.r
##
##  9/15/17
##


pipeline.app <- function(env){

    ## Define paths for output.
    ## Also set `production` toggle:  TRUE - Production, FALSE - Local Development.
    source("rookconfig.R") 

    warning<-FALSE
    result <-list()

    if(production){
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    valid <- jsonlite::validate(request$POST()$solaJSON)
    print(valid)
    if(!valid) {
        warning <- TRUE
        result <- list(warning="The request is not valid json. Check for special characters.")
    }

    if(!warning) {
        everything <- jsonlite::fromJSON(request$POST()$solaJSON)
        print(everything)
    }

	if(!warning){
		mydv <- everything$zdv
        if(length(mydv) == 0){
			warning <- TRUE
			result<-list(warning="No dependent variable selected.")
		}
        if(length(mydv) > 1){
			warning <- TRUE
			result<-list(warning="Too many dependent variables selected.  Please choose only one.")
		}
	}

	if(!warning){
        myedges<-everything$zedges
        print(myedges)
	}

    if(!warning){
        mysessionid <- everything$zsessionid
        mylogfile<-logFile(mysessionid, production)
        if(mysessionid==""){
            warning <- TRUE
            result <- list(warning="No session id.")
        }
    }

    if(!warning){
        mysubset <- parseSubset(everything$zsubset)
        if(is.null(mysubset)){
            warning <- TRUE
            result <- list(warning="Problem with subset.")
        }
    }
    
    if(!warning){
        mygroup1 <- everything$zgroup1
        mygroup2 <- everything$zgroup2
        if(is.null(mygroup1) | is.null(mygroup2)){
            warning <- TRUE
            result <- list(warning="Problem with groups.")
        }
    }

	if(!warning){
        mynoms <- everything$znom
		myformula <- buildFormula(dv=mydv, linkagelist=myedges, varnames=NULL, nomvars=mynoms, groups=mygroup1) #names(mydata))
		if(is.null(myformula)){
			warning <- TRUE
			result<-list(warning="Problem constructing formula expression.")
		}
	}

    if(warning){
        print(warning)
        print(result)
    }
    
    if(!warning){
        ## switching this over to separate data and targets for d3m--not assuming a merged dataset
        #mydataurl <- everything$zdataurl
        #mydataurl <- paste("../",mydataurl,sep="")
        #mydata <- read.delim(mydataurl)
        #writeme <- paste("mydata <- read.delim(\"",mydataurl,"\")", sep="")
        #print(writeme)
        #write(writeme,mylogfile,append=TRUE)
        
        mytargeturi <- everything$zd3mtarget
        #        mytargeturi <- paste("../",mytargeturi,sep="")
        mydata <- read.csv(mytargeturi)
        #writeme <- paste("mydata <- read.delim(\"",mydataurl,"\")", sep="")
        #print(writeme)
        #write(writeme,mylogfile,append=TRUE)
    }

	if(!warning){
        tryCatch({
            predictors <- all.vars(myformula[[3]])
            depvar <- all.vars(myformula[[2]])
            dvvalues <- mydata[,depvar]
            result <- list(predictors=predictors, depvar=depvar, dvvalues=dvvalues)
        },
        error=function(err){
            warning <<- TRUE
            result <<- list(warning=paste("Pipeline form error: ", err))
        })
	}

    result<-jsonlite:::toJSON(result)

    print(result)
    if(production){
        sink()
    }
    response$write(result)
    response$finish()
}
