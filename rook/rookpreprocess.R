##
##  rookpreprocess.r
##
##  8/25/17
##


preprocess.app <- function(env){

    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    warning<-FALSE
    result <-list()
    ppJSON <- list()
    mydataloc <- ""
    mydata <- data.frame()

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
		mydataloc <- everything$data
        if(length(mydataloc) == 0){ # rewrite to check for data file?
			warning <- TRUE
			result<-list(warning="No data location.")
		}
	}
    if(!warning){
        mytargetloc <- everything$target
        if(length(mytargetloc) == 0){ # rewrite to check for data file?
            warning <- TRUE
            result<-list(warning="No target location.")
        }
    }
    if(!warning){
        mypreprocessloc <- everything$preprocess
        if(length(mypreprocessloc) == 0){ # rewrite to check for data file?
            warning <- TRUE
            result<-list(warning="No preprocess location.")
        }
    }

	if(!warning){
        tryCatch({
            if(!production) {
                mydataloc2 <- paste("../",mydataloc,sep="")
                mytargetloc <- paste("../",mytargetloc,sep="")
                mydata <- read.csv(mydataloc2)
                mytarget <- read.csv(mytargetloc)
                
                # not robust merging code, but it'll work if there's one overlapping ID to merge on
                mergeCol <- colnames(mytarget)[which(colnames(mytarget) %in% colnames(mydata))]
                targetVars <- colnames(mytarget)#[!(which(colnames(mytarget) %in% colnames(mydata)))]
                mydata <- merge(mydata, mytarget, by=mergeCol)
                ppJSON<-preprocess(testdata=mydata)
                result <- list(targets=targetVars)
            }
        },
        error=function(err){
            warning <<- TRUE ## assign up the scope bc inside function
            result <<- list(warning=paste("Preprocess error: ", err))
        })
	}
    
    result<-jsonlite:::toJSON(result)
    
    print(result)
    if(production){
        sink()
    }
    outloc <- paste("../",mypreprocessloc,sep="")
    mydataloc <- strsplit(x=mydataloc, split='\\.')[[1]]
    outdata <- paste("../",mydataloc,"merged.tsv",sep="")
    write(ppJSON, outloc)
    #print(outdata[1])
    write.table(mydata, outdata[1], row.names=FALSE, col.names=TRUE, sep="\t")
    response$write(result)
    response$finish()
}
