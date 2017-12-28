send <- function(res) {
  res <- jsonlite:::toJSON(res)
  if(production){
    sink()
  }
  write(res, "myresult2.json")

  response <- Response$new(headers=list("Access-Control-Allow-Origin"="*"))
  response$write(res)
  response$finish()
}

explore.app <- function(env) {
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

  modelcount <- everything$zmodelcount
  if (identical(modelcount,"")) {
    return(send(list(warning="No model count.")))
  }

  plot <- everything$zplot
  if (is.null(plot)) {
    return(send(list(warning="Problem with zplot.")))
  }

  nature <- everything$znature
  if (is.null(nature)) {
    return(send(list(warning="Problem with znature.")))
  }

  vars <- everything$zvars
  if (is.null(vars)) {
    return(send(list(warning="Problem with zvars.")))
  }

  lookup <- data.frame(vars=vars, nature=nature)
  edges <- everything$zedges
  print("edges:")
  print(edges)

  vars <- unique(edges)
  print("vars:")
  print(vars)

  sessionid <- everything$zsessionid
  logfile <- logFile(sessionid, production)
  ##if (sessionid == "") {
    ##return(send(list(warning="No session id.")))
  ##}

  if (production){
    mydata <- readData(sessionid=sessionid, logFile=logfile)
    write(deparse(bquote(mydata <- read.delim(file=.(paste("data_", sessionid,".tab", sep=""))))), logfile, append=TRUE)
  } else {
    mydata <- read.delim(everything$zd3mdata, header=TRUE, sep=",")
    write("data <- read.delim(everything$zd3mdata, header=TRUE, sep=\",\")", logfile, append=TRUE)
  }

  history <- everything$callHistory
  t <- jsonlite::toJSON(history)
  write(deparse(bquote(history <- jsonlite::fromJSON(.(t)))), logfile, append=TRUE)

  if(is.null(history)){
    return(send(list(warning="callHistory is null.")))
  }

  tryCatch({
    ## 1. prepare data so that it is identical to the representation of the data in TwoRavens
    mydata <- executeHistory(data=mydata, history=history)
    write("mydata <- executeHistory(data=mydata, history=history)", logfile, append=TRUE)
    imageVector <<- list()
    statistical <<- list()
    tabular <<- list()
    plotdata <<- list()
    plotcount <- 0

    ## plot data
    plotd <- mydata[,vars]
    if (nrow(plotd) > 1000) {
      plotd <- plotd[sample(1:nrow(plotd), 1000, replace=FALSE),]
    }
    for (j in 1:ncol(plotd)) {
      plotd.coords <- plotd[,j]
      lab <- colnames(plotd)[j]
      plotdata[[lab]] <- list(varname=lab, data=plotd.coords)
    }
    rm(plotd)
    ## end plot data

    for (i in 1:nrow(edges)) {
      usepair <- unique(edges[i,])
      usedata <- mydata[,c(usepair)]

      missmap <- !is.na(usedata)
      isobserved <- apply(missmap, 1, all)
      usedata <<- usedata[isobserved,]

      colv <- colnames(usedata)[2]
      rowv <- colnames(usedata)[1]
      colvNature <- lookup[which(lookup[,1] == colv), 2]
      rowvNature <- lookup[which(lookup[,1] == rowv), 2]

      # what will be returned in "statistical"
      if (colvNature != "nominal" & rowvNature != "nominal") {
        p <-round(cor(usedata[,1], usedata[,2], use="complete.obs", method="pearson"), 4)
        corp <- paste("Pearson correlation:", p, sep="")
        s <-round(cor(usedata[,1], usedata[,2], use="complete.obs", method="spearman"), 4)
        cors <- paste("Spearman correlation:", s, sep="")
        k <-round(cor(usedata[,1], usedata[,2], use="complete.obs", method="kendall"), 4)
        cork <- paste("Kendall correlation:", k, sep="")
      } else {
        myCor <- "No correlations reported"
      }

      statInfo <- list(var1=rowv, var2=colv, corp=corp, cors=cors, cork=cork)
      # what will be returned in "tabular"
      useTab <- usedata
      crosstab <- everything$zcrosstab
      var1name <- crosstab$var1.name
      var2name <- crosstab$var2.name
      var1value <- crosstab$var1.value
      var2value <- crosstab$var2.value
      var1buttontype <- crosstab$var1.buttonType
      var2buttontype <- crosstab$var2.buttonType

      # this is a default of 10 if greater than 10 unique values. eventually we can incorporate user input to define this
      if (length(var1buttontype) == 0
          || length(var2buttontype) == 0
          || length(var1value) == 0
          || length(var2value) == 0
          || length(var2name) == 0
          || length(var1name) == 0)
      {
        print("not defined value part")
        if (length(unique(useTab[,1])) > 10 & !isTRUE(rowvNature == "nominal")) {
          useTab[,1] <- cut(useTab[,1], breaks=10)
        }
        if (length(unique(useTab[,2])) > 10 & !isTRUE(colvNature == "nominal")) {
          useTab[,2] <- cut(useTab[,2], breaks=10)
        }
      } else if (var1buttontype == "equidistance") {
        print("equidistance var 1  called")
        if (length(unique(useTab[,1]))  >10 & !isTRUE(rowvNature == "nominal")) {
          useTab[,1] <- cut(useTab[,1], breaks=var1value)
        }
      } else if (var1buttontype == "equimass") {
        print("equimass var 1 called")
        # first arrange
        usethis <- sort(useTab[,1], decreasing=FALSE, na.last=NA)
        print("equimass usethis")
        print(usethis)
        if (length(unique(useTab[,1])) > 10 & !isTRUE(rowvNature == "nominal")) {
          useTab[,1] <- cut(usethis, breaks=var1value)
        }
      }

      if (var2buttontype == "equidistance") {
        print("equidistance var 2 called")
        if (length(unique(useTab[,2])) > 10 & !isTRUE(colvNature == "nominal")) {
          useTab[,2] <- cut(useTab[,2], breaks=var2value)
        }
      } else if(var2buttontype == "equimass") {
        print("equimass var 2 called")
        # first arrange
        usethis <- sort(useTab[,2], decreasing = FALSE, na.last = NA  )
        print("equimass usethis")
        print(usethis)
        if (length(unique(useTab[,2])) > 10 & !isTRUE(colvNature == "nominal")) {
          useTab[,2] <- cut(usethis, breaks=var2value)
        }
      }

      myTab <- table(useTab[,1], seTab[,2])
      rm(useTab)
      coln <- colnames(myTab)
      rown <- row.names(myTab)
      tabData <- list()
      for (j in 1:nrow(myTab)) {
        assign("tabData", c(tabData, list(eval(parse(text="myTab[j,]")))))
      }
      tabInfo <- list(colnames=coln, rownames=rown, colvar=colv, rowvar=rowv, data=tabData)
      almostCall <- "plot call"
      for (j in 1:2) {
        plotcount <- plotcount + 1
        if (j == 1) {
          spTEST <- "plot(usedata[,1], usedata[,2])"
          plotv <- "a"
        } else{
          spTEST <- "plot(usedata[,2], usedata[,1])"
          plotv <- "b"
        }

        if (production) {
          plotpath <- "png(file.path(\"/var/www/html/custom/pic_dir\", paste(sessionid, \"_\", modelcount, i, plotv, \".png\", sep=\"\")))"
        } else {
          plotpath <- "png(file.path(getwd(), paste(\"output\", modelcount, i, plotv, \".png\", sep=\"\")))"
        }
        eval(parse(text=plotpath))
        eval(parse(text=spTEST))
        dev.off()
        if (production) {
          imageVector[[plotcount]] <<- paste("https://beta.dataverse.org/custom/pic_dir/", sessionid, "_", modelcount, i, plotv, ".png", sep="")
        } else {
          imageVector[[plotcount]] <<- paste("rook/output", modelcount, i, plotv, ".png", sep="")
        }
      }
      images <- imageVector ## zplots() returns imageVector, just for consistency
      tabular[[i]] <<- tabInfo
      statistical[[i]] <<- statInfo
    }

    if (length(images) > 0) {
      names(images) <- apply(edges, 1, function(x) c(paste(x[1], x[2], sep="-"), paste(x[2], x[1], sep="-")))
      names(tabular) <- names(statistical) <- apply(edges, 1, function(x) paste(x[1], x[2], sep="-"))
      return(send(list(images=images, call=almostCall, tabular=tabular, statistical=statistical, plotdata=plotdata)))
    } else {
      return(send(list(warning="There are no graphs to show.")))
    }
  },
  error = function(err) {
    result <<- list(warning=paste("error: ", err))
  })
  return(send(result))
}
