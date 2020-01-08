
plotData.app <- function(everything) {
  production <- FALSE
  result <- list()

  if (production) {
    sink(file=stderr(), type="output")
  }

  print("everything: ")
  print(everything)

  dataurl <- everything$zd3mdata
  if (is.null(dataurl)) {
    return(jsonlite::toJSON(errResult("No data url.")))
  }

  plottype <- everything$plottype
  if (is.null(plottype)) {
    return(jsonlite::toJSON(errResult("Problem with plottype.")))
  }

  vars <- everything$plotvars
  if (is.null(vars)) {
    return(jsonlite::toJSON(errResult("Problem with zvars.")))
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
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
             })
  }

  if(plottype=="box" | plottype=="strip" | plottype=="facetbox") {
    tryCatch({
               plotdata <<- list()

               ## plot data
               plotd <- as.data.frame(mydata[,vars])
               colnames(plotd) <- vars
               plotd <- na.omit(plotd)
               if (nrow(plotd) > 1000) {
                 plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
               }

               plotdata <- jsonlite::toJSON(plotd)
               rm(plotd)

               if (length(plotdata) !=0) {
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
             })
  }

  if(plottype=="scatter" | plottype=="aggbar" | plottype=="binnedscatter" | plottype=="histogram" | plottype=="scattermeansd" | plottype=="scattermatrix" | plottype=="simplebar" | plottype=="areauni"| plottype=="histogrammean" | plottype=="trellishist" | plottype=="interactivebarmean" | plottype=="dot" | plottype=="binnedcrossfilter" | plottype=="scattertri" | plottype=="bubbletri" | plottype=="horizgroupbar" | plottype=="bubbleqqq" | plottype=="scatterqqq" | plottype=="trellisscatterqqn" | plottype=="heatmapnnq" | plottype=="dotdashqqn"| plottype=="tablebubblennq" | plottype=="facetheatmap" | plottype=="groupedbarnqq") {
    tryCatch({
               plotdata <<- list()

               ## plot data
               plotd <- as.data.frame(mydata[,vars])
               colnames(plotd) <- vars
               plotd <- na.omit(plotd)
               if (nrow(plotd) > 1000) {
                 plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),,drop=FALSE]
               }

               plotdata <- jsonlite::toJSON(plotd)
               rm(plotd)

               if (length(plotdata) !=0) {
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
             })
  }

  if(plottype=="stackedbar" | plottype=="groupedbar" | plottype=="averagediff" | plottype=="stackedbarnnn") {
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
               plotdata <- jsonlite::toJSON(plotd)
               rm(plotd)

               if (length(plotdata) !=0) {
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata, uniqueY=uniqueY))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
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
               plotdata <- jsonlite::toJSON(plotd)
               rm(plotd)

               if (length(plotdata) !=0) {
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata, uniqueZ=uniqueZ))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
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
               plotdata <- jsonlite::toJSON(plotd)
               rm(plotd)

               if (length(plotdata) !=0) {
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
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
               plotdata <- jsonlite::toJSON(plotd)
               rm(plotd)


               if (length(plotdata) !=0) {
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
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
               plotdata <- jsonlite::toJSON(plotd)
               rm(plotd)

               if (length(plotdata) !=0) {
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata,meanY=meanY))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
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
                 return(jsonlite::toJSON(okResult(list(plottype=plottype, vars=vars, plotdata=plotdata))))
               } else {
                 return(jsonlite::toJSON(errResult("No plot data.")))
               }
             },
             error = function(err) {
               result <<- errResult(paste("error: ", err))
             })
  }

  return(jsonlite::toJSON(result))
}