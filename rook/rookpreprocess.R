##
##  rookpreprocess.r
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
    #print(valid)
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

    ##  preprocess location is now constructed from rookconfig.R 

    #if(!warning){
    #    mypreprocessloc <- everything$preprocess
    #    if(length(mypreprocessloc) == 0){ # rewrite to check for data file?
    #        warning <- TRUE
    #        result<-list(warning="No preprocess location.")
    #    }
    #}

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
    


    merge_name_stub <- sub("(.*\\/)([^.]+)(\\.[[:alnum:]]+$)", "\\2", mydataloc)        # extract the filename stub from the provided training data path

    rook_output_data <- paste(pre_path, use_path, mydatastub, "/data/", sep="")                   
    rook_output_images <- paste(pre_path, use_path, mydatastub, "/images/", sep="")               
    rook_output_preprocess <- paste(pre_path, use_path, mydatastub, "/preprocess/", sep="")       

    print(rook_output_data)
    print(rook_output_images)
    print(rook_output_preprocess)


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




    #outloc <- paste("../",mypreprocessloc,sep="")
    outloc <- paste(rook_output_preprocess, "preprocess.json", sep="")                    # set in rookconfig.R configuration file

    #mydataloc <- strsplit(x=mydataloc, split='\\.')[[1]]
    #outdata <- paste("../",mydataloc,"merged.tsv",sep="")
    filenamestub <- sub("(.*\\/)([^.]+)(\\.[[:alnum:]]+$)", "\\2", mydataloc)        # extract the filename stub from the provided training data path
    outdata <- paste(rook_output_data, merge_name_stub, "merged.tsv",sep="")

    write(ppJSON, outloc)
    write.table(mydata, outdata[1], row.names=FALSE, col.names=TRUE, sep="\t")


    result<-jsonlite:::toJSON(result)
    
    print(result)
    if(production){
        sink()
    }

    response$write(result)
    response$finish()
}
