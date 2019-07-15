##
##  rookpartialsdata.r
##
##  Used presently only in D3M mode.
##  Creates dataset used to calculate feature importance by partial plots, using a TwoRavens metadata file.
##
##  6/23/19
##


partials.app <- function(env){

    ## Define paths for output.
    ## Also set `production` toggle:  TRUE - Production, FALSE - Local Development.
    source("rookconfig.R")

    warning<-FALSE
    result <-list()
    mydataloc <- ""
    mydata <- data.frame()
    preprocessParams <- list()

    if(production){
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    valid <- jsonlite::validate(request$POST()$solaJSON)

    if(!valid) {
        warning <- TRUE
        result <- list(warning="The request is not valid json. Check for special characters.")
    }

    if(!warning) {
        partialsParams <- jsonlite::fromJSON(request$POST()$solaJSON)
    }

	if(!warning){
        md <- list()   # rebuild to resemble original structure in metadata file
        md$variables <- partialsParams$metadata

        if(length(md$variables) == 0){ 
                warning <- TRUE
                result <- list(warning="No metadata included.")
        }
	}

    #if(!warning){
    #    # mydatasetDoc <- partialsParams$datasetDoc
    #    mydatasetDocLoc <- partialsParams$datasetDocLoc
    #    print(mydatasetDocLoc)
    #
    #    if(length(mydatasetDocLoc) == 0){ 
    #            warning <- TRUE
    #            result <- list(warning="No datasetDoc location included.")
    #    }
    #}

    if(!warning){
        mydataloc <- partialsParams$dataloc

        if(length(mydataloc) == 0){ 
                warning <- TRUE
                result <- list(warning="No data location included.")
        }
    }

    #if(!warning){
    #    tryCatch({
    #        mydatasetDoc <- read(mydatasetDocLoc)
    #    },
    #    error=function(err){
    #        warning <<- TRUE
    #        result <<- list(warning=paste("Partials construction error: ", err))
    #    })
    #}

    if(!warning){
        tryCatch({

            #########################################################
            ## Construct dataset of partials from metadata values

            k <- length(md$variables)
            s <- 10

            index <- rep(0,k+1)  # 0 if no leading observation of means, 1 if leading observation of means
            natures <- rep(NA,k)
            for(i in 1:k){
                natures[i] <- md$variables[[i]]$nature
                if(natures[i]=="nominal"){
                    index[i+1]<-index[i] + min(length(names(md$variables[[i]]$plotvalues)),s)       # Or md$variables[[i]]$uniques, but includes NA
                }else if((natures[i]=="ordinal")  & (md$variables[[i]]$binary=="yes")){
                    index[i+1]<-index[i] + 2
                }else{
                    index[i+1]<-index[i] + s
                }
            }

            l <- index[k+1]

            baseline <- list()
            allnames <- rep(NA,k)
            movement <- list()


            for(i in 1:k){

                #nature currently is {"nominal" , "ordinal" , "interval" , "ratio" , "percent" , "other"}
                nature <- natures[i]
                if(nature=="nominal"){
                    temp <- rep(md$variables[[i]]$mode, l)    # But might be NA?
                    tempseq <- sort(sample(names(md$variables[[i]]$plotvalues), size=min(s,index[i+1]-index[i])))
                    temp[(index[i]+1):index[i+1]] <- tempseq

                    tdf <- data.frame(tempseq)
                    names(tdf) <- md$variables[[i]]$varnamesSumStat
                    movement[[i]] <- tdf

                    baseline[[i]] <- temp
                }else if(nature=="ordinal"){
                    temp <- rep(md$variables[[i]]$median, l)  # But might not be value in dataset? Or NA.
                    if(md$variables[[i]]$binary=="yes"){
                        tempseq <- c(md$variables[[i]]$min, md$variables[[i]]$max)
                    }else{
                        tempseq <- seq(from=md$variables[[i]]$min, to=md$variables[[i]]$max, length=s)
                    }
                    temp[(index[i]+1):index[i+1]] <- tempseq

                    tdf <- data.frame(tempseq)
                    names(tdf) <- md$variables[[i]]$varnamesSumStat
                    movement[[i]] <- tdf

                    baseline[[i]] <- temp
                }else if(nature=="interval"){
                    baseline[[i]] <- "interval"
                }else if(nature=="ratio"){
                    temp <- rep(md$variables[[i]]$median, l)
                    tempseq <- seq(from=md$variables[[i]]$min, to=md$variables[[i]]$max, length=s)
                    temp[(index[i]+1):index[i+1]] <- tempseq

                    tdf <- data.frame(tempseq)
                    names(tdf) <- md$variables[[i]]$varnamesSumStat
                    movement[[i]] <- tdf

                    baseline[[i]] <- temp
                }else if(nature=="percent"){
                    temp <- rep(md$variables[[i]]$median, l)
                    tempseq <- seq(from=md$variables[[i]]$min, to=md$variables[[i]]$max, length=s)
                    temp[(index[i]+1):index[i+1]] <- tempseq

                    tdf <- data.frame(tempseq)
                    names(tdf) <- md$variables[[i]]$varnamesSumStat
                    movement[[i]] <- tdf

                    baseline[[i]] <- temp
                }else if(nature=="other"){
                    baseline[[i]] <- "other"
                }else{
                    baseline[[i]] <- NA
                }
                allnames[i] <- md$variables[[i]]$varnamesSumStat

            }
            mydata <- data.frame(matrix(unlist(baseline), nrow=l, byrow=FALSE),stringsAsFactors=FALSE)
            names(mydata) <- allnames
            names(movement) <- allnames
        },
        error=function(err){
            warning <<- TRUE
            result <<- list(warning=paste("Partials construction error: ", err))
        })
    }


    #########################################################
    ## Write dataset of partials to desired location

    if(!warning){
        merge_name_data <- "/tables/learningData.csv"
        merge_name_summary <- "/tables/partialsSummary.json"
        merge_name_datasetDoc <- "/datasetDoc.json"
        merge_name_tables <- "/tables"
        outtables <- paste(mydataloc, merge_name_tables, sep="")
        outdata <- paste(mydataloc, merge_name_data, sep="")
        outdatasetDoc <- paste(mydataloc, merge_name_datasetDoc, sep="")
        outsummary <- paste(mydataloc, merge_name_summary, sep="")
        print(outdata[1])
        print(outdatasetDoc[1])

        # R won't write to a directory that doesn't exist.
        if (!dir.exists(outtables)){
            dir.create(outtables, recursive = TRUE)
        }

        write.csv(mydata, outdata[1], row.names=FALSE, col.names=TRUE)
        write(jsonlite:::toJSON(movement), outsummary[1])
        #write(mydatasetDoc, outdatasetDoc[1])

        # Path to partials dataset
        result <- list(
            partialsDatasetDocPath = jsonlite::unbox(outdatasetDoc[1]),
            partialsDatasetPath = jsonlite::unbox(outsummary[1]))
        result <- jsonlite:::toJSON(result)
    }


    if(production){
        sink()
    }

    response$write(result)
    response$finish()
}
