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

    check_ext <- function(filepath){
        if(!file.exists(filepath)){                                             # if file does not exist
            if(file.exists(paste(filepath,".gz",sep=""))){                      # check if .csv should be .csv.gz
                    filepath <- paste(filepath,".gz",sep="")
                    print(".csv extension swapped for .csv.gz")
                    print(filepath)
            } else if (file.exists( tools::file_path_sans_ext(filepath) ) ){    # then check if .csv.gz should be .csv
                    filepath <- tools::file_path_sans_ext(filepath)
                    print(".csv.gz extension swapped for .csv")
                    print(filepath)
            }
        }
        return(filepath)
    }


	if(!warning){
        tryCatch({

            if(d3m_mode) {                                       # Note presently this entire app is only ever called in d3m mode, but we might generalize its function

                mydataloc <- check_ext(mydataloc)
                mytargetloc <- check_ext(mytargetloc)

                #mydataloc2 <- paste("../",mydataloc,sep="")
                #mytargetloc <- paste("../",mytargetloc,sep="")
                if( identical(tools::file_ext(mydataloc), "csv" ) ){
                    mydata <- read.csv(mydataloc, check.names = FALSE)
                } else if (identical(tools::file_ext(mydataloc), "gz" )){
                    mydata <- read.csv(gzfile(mydataloc), check.names = FALSE)
                } else {
                    warning <- TRUE
                    return<-list(warning="Data file extension not recognized as .csv or .gz")
                }

                if(is.null(mytargetloc)){
                    print("No target data declared to be merged.")
                } else {
                    if( identical(tools::file_ext(mytargetloc), "csv" ) ){
                        mytarget <- read.csv(mytargetloc, check.names = FALSE)
                    } else if( identical(tools::file_ext(mytargetloc), "gz" ) ){
                        mytarget <- read.csv(gzfile(mytargetloc), check.names = FALSE)
                    } else {
                        warning <- TRUE
                        return<-list(warning="Target file extension not recognized as .csv or .gz")
                    }
                    # not robust merging code, but it'll work if there's one overlapping ID to merge on
                    mergeCol <- colnames(mytarget)[which(colnames(mytarget) %in% colnames(mydata))]
                    targetVars <- colnames(mytarget)#[!(which(colnames(mytarget) %in% colnames(mydata)))]
                    mydata <- merge(mydata, mytarget, by=mergeCol)
                }

                ppJSON<-preprocess(testdata=mydata)
                result <- list(targets=targetVars)
            }
        },
        error=function(err){
            warning <<- TRUE ## assign up the scope bc inside function
            result <<- list(warning=paste("Preprocess error: ", err))
        })
	}

    merge_name_stub <- "trainData"
    # This reg expression stopped working with .csv.gz extensions:
    #merge_name_stub <- sub("(.*\\/)([^.]+)(\\.[[:alnum:]]+$)", "\\2", mydataloc)   # Extract the filename stub from the provided training data path.  Generally "trainData".

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

    print(outloc)
    print(merge_name_stub)
    print(outdata)

    write(ppJSON, outloc)
    write.table(mydata, outdata[1], row.names=FALSE, col.names=TRUE, sep="\t")

    # Return the preprocess file 
    if(!warning){
        result<-ppJSON
    }

    #print(result)
    if(production){
        sink()
    }

    response$write(result)
    response$finish()
}
