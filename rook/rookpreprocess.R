##
##  rookpreprocess.r
##
##  Used presently only in D3M mode.  
##  Creates directory structure for storing data related products for Rook, specific to a dataset.
##  Merges files from seed problems together into one dataset.
##  Constructs preprocess metadata file.
##
##  8/25/17
##


preprocess.app <- function(env){

    ## Define paths for output.
    ## Also set `production` toggle:  TRUE - Production, FALSE - Local Development.
    source("rookconfig.R") 
    
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
        mydatastub <- everything$datastub
        if(length(mydatastub) == 0){ # rewrite to check for data file?
            warning <- TRUE
            result<-list(warning="No dataset stub name.")
        }
    }

	if(!warning){
        tryCatch({
            if(d3m_mode) {                                       # Note presently this entire app is only ever called in d3m mode, but we might generalize its function
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

    merge_name_stub <- sub("(.*\\/)([^.]+)(\\.[[:alnum:]]+$)", "\\2", mydataloc)   # Extract the filename stub from the provided training data path.  Generally "trainData".

    rook_output_data <- paste(PRE_PATH, mydatastub, "/data/", sep="")                   
    rook_output_images <- paste(PRE_PATH, mydatastub, "/images/", sep="")               
    rook_output_preprocess <- paste(PRE_PATH, mydatastub, "/preprocess/", sep="")       

    # R won't write to a directory that doesn't exist.
    if (!dir.exists(rook_output_data)){
        dir.create(rook_output_data, recursive = TRUE)
    }
    if (!dir.exists(rook_output_images)){
        dir.create(rook_output_images, recursive = TRUE)
    }
    if (!dir.exists(rook_output_preprocess)){
        dir.create(rook_output_preprocess, recursive = TRUE)
    }

    outloc <- paste(rook_output_preprocess, "preprocess.json", sep="")                
    outdata <- paste(rook_output_data, merge_name_stub, "merged.tsv",sep="")

    write(ppJSON, outloc)
    write.table(mydata, outdata[1], row.names=FALSE, col.names=TRUE, sep="\t")

    # Return the preprocess file 
    if(!warning){
        result<-ppJSON
    }

    #result<-jsonlite:::toJSON(result)
    
    print(result)
    if(production){
        sink()
    }

    response$write(result)
    response$finish()
}
