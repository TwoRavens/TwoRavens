##
##  Used presently only in D3M mode.
##  Creates dataset used to calculate feature importance by partial plots, using a TwoRavens metadata file.
##
##  6/23/19
##
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

partials.app <- function(partialsParams) {
    print('entering partials app')
    requirePackages(packageList.any)

    pathOutput <- partialsParams$path_output
    if (is.null(pathOutput) || !file.exists(pathOutput))
        return(jsonlite::toJSON(errResult(paste0('Invalid output path: ', toString(pathOutput)))))

    md <- partialsParams$metadata
    if (is.null(md))
        return(jsonlite::toJSON(errResult('"metadata" is a required field.')))

    md$d3mIndex <- NULL

    print(jsonlite::toJSON(md))

    dataResult <- tryCatch({

        #########################################################
        ## Construct dataset of partials from metadata values

        k <- length(md)
        s <- 10

        index <- rep(0,k+1)  # 0 if no leading observation of means, 1 if leading observation of means
        natures <- rep(NA,k)
        for(i in 1:k){
            natures[i] <- md[[i]][['nature']]
            if(md[[i]][['validCount']]==0){
                index[i+1]<-index[i] + 2
            }else if(natures[i]=="nominal"){
                index[i+1]<-index[i] + min(length(names(md[[i]][['plotValues']])),s)       # Or md[[i]][['uniqueCount']], but includes NA
            }else if((natures[i]=="ordinal") && (md[[i]][['binary']]=="yes")){
                index[i+1]<-index[i] + 2
            }else{
                index[i+1]<-index[i] + s
            }
        }

        l <- index[k+1]

        baseline <- list()
        allnames <- rep(NA,k)
        movement <- list()

        print("index")
        print(index)


        for(i in 1:k){

            #nature currently is {"nominal" , "ordinal" , "interval" , "ratio" , "percent" , "other"}
            nature <- natures[i]
            print(md[[i]][['name']])

            if (md[[i]][['validCount']] == 0){      # Some variables come out of augmentation with no valid values
                print("escaped due to no valid values")
                temp <- rep("",l)
                tempseq <- rep("", index[i+1]-index[i] )
                print(tempseq)
                tdf <- data.frame(tempseq)
                names(tdf) <- md[[i]][['name']]
                movement[[i]] <- tdf
                baseline[[i]] <- temp
            } else if (nature == "nominal") {
                temp <- rep(md[[i]][['mode']], l)    # But might be NA?
                tempseq <- sort(sample(names(md[[i]][['plotValues']]), size=min(s,index[i+1]-index[i])))      # shouldn't these agree by this point?
                print(tempseq)
                temp[(index[i]+1):index[i+1]] <- tempseq

                tdf <- data.frame(tempseq)
                names(tdf) <- md[[i]][['name']]
                movement[[i]] <- tdf

                baseline[[i]] <- temp
            }else if(nature=="ordinal"){
                temp <- rep(md[[i]][['median']], l)  # But might not be value in dataset? Or NA.
                if(md[[i]][['binary']]=="yes"){
                    tempseq <- c(md[[i]][['min']], md[[i]][['max']])
                }else{
                    tempseq <- seq(from=md[[i]][['min']], to=md[[i]][['max']], length=s)
                }
                print(tempseq)
                temp[(index[i]+1):index[i+1]] <- tempseq

                tdf <- data.frame(tempseq)
                names(tdf) <- md[[i]][['name']]
                movement[[i]] <- tdf

                baseline[[i]] <- temp
            }else if(nature=="interval"){
                baseline[[i]] <- "interval"
            }else if(nature=="ratio"){
                temp <- rep(md[[i]][['median']], l)
                print(tempseq)
                tempseq <- seq(from=md[[i]][['min']], to=md[[i]][['max']], length=s)
                temp[(index[i]+1):index[i+1]] <- tempseq

                tdf <- data.frame(tempseq)
                names(tdf) <- md[[i]][['name']]
                movement[[i]] <- tdf

                baseline[[i]] <- temp
            }else if(nature=="percent"){
                temp <- rep(md[[i]][['median']], l)
                tempseq <- seq(from=md[[i]][['min']], to=md[[i]][['max']], length=s)
                print(tempseq)

                temp[(index[i]+1):index[i+1]] <- tempseq

                tdf <- data.frame(tempseq)
                names(tdf) <- md[[i]][['name']]
                movement[[i]] <- tdf

                baseline[[i]] <- temp
            }else if(nature=="other"){
                baseline[[i]] <- "other"
            }else{
                baseline[[i]] <- NA
            }
            allnames[i] <- md[[i]][['name']]

        }
        mydata <- data.frame(matrix(unlist(baseline), nrow=l, byrow=FALSE),stringsAsFactors=FALSE)
        names(mydata) <- allnames
        mydata <- cbind(d3mIndex=rownames(mydata), mydata)
        names(movement) <- allnames
        
        okResult(list(datatable=mydata, movement=movement))

    }, error=function(err) errResult(paste0("Partials construction error: ", toString(err))))

    if (!dataResult$success) return(jsonlite::toJSON(dataResult))
    data <- dataResult$data$datatable
    movement <- dataResult$data$movement

    print(data)
    print(movement)

    #########################################################
    ## Write dataset of partials to desired location

    pathTables <- file.path(pathOutput, "tables")
    pathData <- file.path(pathTables, "learningData.csv")
    pathSummary <- file.path(pathOutput, "partialsSummary.json")
    pathDatasetDoc <- file.path(pathOutput, "datasetDoc.json")
    
    if (dir.exists(pathTables)) unlink(pathTables, recursive=T)
    dir.create(pathTables, recursive=TRUE)
  
    write.csv(data, pathData, row.names=FALSE, col.names=TRUE,quote=FALSE)
    write(jsonlite:::toJSON(movement), pathSummary)

    jsonlite::toJSON(okResult(list(
        partialsDatasetDocPath=jsonlite::unbox(pathDatasetDoc),
        partialsDatasetPath=jsonlite::unbox(pathSummary)
    )))
}

# partials.app(list(
#     metadata=list(
#         variables=jsonlite::fromJSON(readLines('/home/shoe/Desktop/variableSummaries.json'))
#     ),
#     path_output='/home/shoe/Desktop/partialsTest'
# ))