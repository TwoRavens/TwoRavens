send <- function(res) {
  res <- jsonlite:::toJSON(res)
  if(production){
    sink()
  }
  write(res, "../assets/result.json")

  response <- Response$new(headers=list("Access-Control-Allow-Origin"="*"))
  response$write(res)
  response$finish()
}

plotdata.app <- function(env) {
  print(env)
  production <- FALSE
  result <- list()

  if (production) {
    sink(file=stderr(), type="output")
  }

  request <- Request$new(env)
  valid <- jsonlite::validate(request$POST()$solaJSON)
  if (!valid) {
    return(send(list(warning="The request is not valid json. Check for special characters.")))
  }

  everything <- jsonlite::fromJSON(request$POST()$solaJSON, flatten=TRUE)
  print("everything: ")
  print(everything)

  dataurl <- everything$zd3mdata
  if (is.null(dataurl)) {
    return(send(list(warning="No data url.")))
  }

  plottype <- everything$plottype
  if (is.null(plottype)) {
    return(send(list(warning="Problem with plottype.")))
  }

  vars <- everything$plotvars
  if (is.null(vars)) {
    return(send(list(warning="Problem with zvars.")))
  }

    mydata <- read.csv(dataurl)
  
    if(plottype=="scatter-org") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- mydata[,vars]
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),]
        }
        for (j in 1:ncol(plotd)) {
            plotd.coords <- plotd[,j]
            lab <- colnames(plotd)[j]
            plotdata[[lab]] <- list(varname=lab, data=plotd.coords)
        }
        rm(plotd)
    
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
  if(plottype=="box" | plottype=="strip") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- as.data.frame(mydata[,vars])
        colnames(plotd) <- vars
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
        }
        
        plotdata <- jsonlite:::toJSON(plotd)
        rm(plotd)
        
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
  if(plottype=="scatter" | plottype=="aggbar" | plottype=="binnedscatter" | plottype=="histogram" | plottype=="scattermeansd" | plottype=="scattermatrix" | plottype=="simplebar" | plottype=="areauni"| plottype=="histogrammean" | plottype=="trellishist" | plottype=="interactivebarmean" | plottype=="dot" | plottype=="binnedcrossfilter" | plottype=="scattertri" | plottype=="bubbletri" | plottype=="horizgroupbar" | plottype=="bubbleqqq" | plottype=="scatterqqq" | plottype=="trellisscatterqqn" | plottype=="heatmapnnq") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- as.data.frame(mydata[,vars])
        colnames(plotd) <- vars
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
        }
        
        plotdata <- jsonlite:::toJSON(plotd)
        rm(plotd)
        
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
  if(plottype=="stackedbar" | plottype=="groupedbar" | plottype=="averagediff") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- as.data.frame(mydata[,vars])
        colnames(plotd) <- vars
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
        }
        
        uniqueY <- unique(plotd[,2])
        plotdata <- jsonlite:::toJSON(plotd)
        rm(plotd)
        
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata, uniqueY=uniqueY)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
    if(plottype=="groupedbartri") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- as.data.frame(mydata[,vars])
        colnames(plotd) <- vars
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
        }
        
        uniqueZ <- unique(plotd[,3])
        plotdata <- jsonlite:::toJSON(plotd)
        rm(plotd)
        
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata, uniqueZ=uniqueZ)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
  if(plottype=="line" | plottype=="step") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- as.data.frame(mydata[,vars])
        colnames(plotd) <- vars
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
        }
        
        uniqueY <- unique(plotd[,2])
        plotdata <- jsonlite:::toJSON(plotd)
        rm(plotd)
        
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
  if(plottype=="area") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- as.data.frame(mydata[,vars])
        colnames(plotd) <- vars
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
        }
        
        uniqueY <- unique(plotd[,2])
        plotdata <- jsonlite:::toJSON(plotd)
        rm(plotd)
        
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
  if(plottype=="horizon") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- as.data.frame(mydata[,vars])
        colnames(plotd) <- vars
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
        }
        
        meanY <- mean(plotd[,2])
        plotdata <- jsonlite:::toJSON(plotd)
        rm(plotd)
        
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata,meanY=meanY)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
  if(plottype=="tableheat" | plottype=="binnedtableheat") {
        tryCatch({
        plotdata <<- list()

        ## plot data
        plotd <- as.data.frame(mydata[,vars])
        colnames(plotd) <- vars
        plotd <- na.omit(plotd)
        if (nrow(plotd) > 1000) {
            plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
        }
        
        uniqueY <- unique(plotd[,2])
        plotdata <- jsonlite:::toJSON(plotd)
        rm(plotd)
        
        if (length(plotdata) !=0) {
            return(send(list(plottype=plottype, vars=vars, plotdata=plotdata)))
        } else {
            return(send(list(warning="No plot data.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        })
  }
  
  return(send(result))
}
