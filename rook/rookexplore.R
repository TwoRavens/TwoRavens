##
##  rookexplore.R
##
##  First version: May 25, 2017
##


explore.app <- function(env){
   # print("explore app called")
    print(env)
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    warning<-FALSE  
    result <-list()

    if(production){
        sink(file = stderr(), type = "output")
    }
    
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
    
    valid <- jsonlite::validate(request$POST()$solaJSON)
   # valid1 <- jsonlite::validate(request$POST()$crossJSON)
    print("this is valid.........")
   # print(valid1)
    if(!valid) {
        warning <- TRUE
        result <- list(warning="The request is not valid json. Check for special characters.")
    }
    
    if(!warning)
    {
        everything <- jsonlite::fromJSON(request$POST()$solaJSON, flatten=TRUE )

        print("this is everything.........")
        print(everything)
    }

#	if(!warning){
#		mymodel <- everything$zmodel
#		if(identical(mymodel,"")){
#			warning <- TRUE
#			result<-list(warning="No model selected.")
#		}
#	}
    
	if(!warning){
		mymodelcount <- everything$zmodelcount
		if(identical(mymodelcount,"")){
			warning <- TRUE
			result<-list(warning="No model count.")
		}
	}
    
    if(!warning){
        myplot <- everything$zplot
        if(is.null(myplot)){
            warning <- TRUE
            result <- list(warning="Problem with zplot.")
        }
    }
    
    if(!warning){
        mynature <- everything$znature
        if(is.null(mynature)){
            warning <- TRUE
            result <- list(warning="Problem with znature.")
        }
        vars <- everything$zvars
        if(is.null(vars)){
            warning <- TRUE
            result <- list(warning="Problem with zvars.")
        }
        lookup <- data.frame(vars=vars, nature=mynature)
    }

	if(!warning){
        myedges<-everything$zedges
        print("this is myedges.........")
        print(myedges)
        
        myvars <- unique(myedges)
        print("this is myvars.........")
        print(myvars)
        ## Format seems to have changed:
        #		myedges<-edgeReformat(everything$zedges)
		#if(is.null(myedges)){
		#	warning <- TRUE
		#	result<-list(warning="Problem creating edges.")
		#}
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
        if(production){
            mydata <- readData(sessionid=mysessionid,logfile=mylogfile)
            write(deparse(bquote(mydata<-read.delim(file=.(paste("data_",mysessionid,".tab",sep=""))))),mylogfile,append=TRUE)
        }else{
            # This is the Strezhnev Voeten data:
            #   		mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
            # This is the Fearon Laitin data:
            mydata <- read.delim("../data/fearonLaitin.tsv")
            write("mydata <- read.delim(\"../data/fearonLaitin.tsv\")",mylogfile,append=TRUE)
            #mydata <- read.delim("../data/QualOfGovt.tsv")
        }
	}
    
    if(!warning){
        history <- everything$callHistory
        
        t<-jsonlite::toJSON(history)
        write(deparse(bquote(history<-jsonlite::fromJSON(.(t)))),mylogfile,append=TRUE)
        
        if(is.null(history)){
            warning<-TRUE
            result<-list(warning="callHistory is null.")
        }
    }

    if(warning){
        print(warning)
        print(result)
    }

	if(!warning){
      
        tryCatch({
          
          ## 1. prepare mydata so that it is identical to the representation of the data in TwoRavens
          mydata <- executeHistory(data=mydata, history=history)
           # print(mydata)
          write("mydata <- executeHistory(data=mydata, history=history)",mylogfile,append=TRUE)
          imageVector<<-list()
          statistical<<-list()
          tabular<<-list()
          plotdata<<-list()
          plotcount<-0








          ## plot data
          plotd <- mydata[,vars]
          if(nrow(plotd)>1000) {
              plotd <- plotd[sample(1:nrow(plotd), 1000,replace=FALSE),]
          }
          for(j in 1:ncol(plotd)) {
              plotd.coords <- plotd[,j]
              mylab <- colnames(plotd)[j]
              plotdata[[mylab]] <- list(varname=mylab, data=plotd.coords)
          }
          rm(plotd)
          ## end plot data
          
          
          for(i in 1:nrow(myedges)) {
              
              usepair <- unique(myedges[i,])
              usedata <- mydata[,c(usepair)]
              
              missmap<-!is.na(usedata)
              isobserved<-apply(missmap,1,all)
              usedata<<-usedata[isobserved,]
              
              colv <- colnames(usedata)[2]
              rowv <- colnames(usedata)[1]
              
              colvNature <- lookup[which(lookup[,1]==colv),2]
              rowvNature <- lookup[which(lookup[,1]==rowv),2]
              
              # what will be returned in "statistical"
              if(colvNature!="nominal" & rowvNature!="nominal") {
                  p <-round(cor(usedata[,1],usedata[,2], use="complete.obs", method="pearson"), 4)
                  corp <- paste("Pearson correlation: ", p, sep="")
                  s <-round(cor(usedata[,1],usedata[,2], use="complete.obs", method="spearman"), 4)
                  cors <- paste("Spearman correlation: ", s, sep="")
                  k <-round(cor(usedata[,1],usedata[,2], use="complete.obs", method="kendall"), 4)
                  cork <- paste("Kendall correlation: ", k, sep="")
              } else {
                  myCor <- "No correlations reported"
              }
              
              statInfo <- list(var1=rowv, var2=colv, corp=corp, cors=cors, cork=cork)
              
              # what will be returned in "tabular"
              useTab<-usedata
              #here the data comes from the json
              crosstab <- everything$zcrosstab
              #crosstab1<- new_crosstab$zcrosstab
              var1name <- crosstab$var1.name
              var2name <- crosstab$var2.name

              var1value <- crosstab$var1.value
              var2value <- crosstab$var2.value

              var1buttontype <- crosstab$var1.buttonType
              var2buttontype <- crosstab$var2.buttonType



              print(" var1 name");
                 print(var1name)
              print(" var2 name");
              print(var2name)
print(" var1 buttontype");
              print(var1buttontype)
              print(" var2 buttontype");
              print(var2buttontype)
              print(" var1 value");
              print(var1value)
              print(" var2 value" );
              print(var2value)



              # this is a default of 10 if greater than 10 unique values. eventually we can incorporate user input to define this
if(length(var1buttontype)==0 || length(var2buttontype)==0|| length(var1value)==0 || length(var2value)==0 || length(var2name)==0 ||length(var1name)==0)
{
    print("not defined value part")
    if(length(unique(useTab[,1]))>10 & !isTRUE(rowvNature=="nominal")) {
        useTab[,1] <- cut(useTab[,1], breaks=10)
    }
    if(length(unique(useTab[,2]))>10 & !isTRUE(colvNature=="nominal")) {
        useTab[,2] <- cut(useTab[,2], breaks=10)
    }
}

else
{

              if(var1buttontype == "equidistance")
            {
                print("equidistance var 1  called")
              if(length(unique(useTab[,1]))>10 & !isTRUE(rowvNature=="nominal")) {
                  useTab[,1] <- cut(useTab[,1], breaks=var1value)
              }

            }
            else if (var1buttontype == "equimass")
            {  print("equimass var 1 called")
                # first arrange
                usethis<- sort(useTab[,1], decreasing = FALSE, na.last = NA  )
                print("equimass usethis")
                print(usethis)

                if(length(unique(useTab[,1]))>10 & !isTRUE(rowvNature=="nominal")) {
                    useTab[,1] <- cut(usethis, breaks=var1value)
                }



            }

              if (var2buttontype == "equidistance")
              {

                  print("equidistance var 2  called")
                  if(length(unique(useTab[,2]))>10 & !isTRUE(colvNature=="nominal")) {
                      useTab[,2] <- cut(useTab[,2], breaks=var2value)
                  }
              }
              else if(var2buttontype == "equimass")
              {
                  print("equimass var 2  called")
                  # first arrange
                  usethis<- sort(useTab[,2], decreasing = FALSE, na.last = NA  )
                  print("equimass usethis")
                  print(usethis)
                  if(length(unique(useTab[,2]))>10 & !isTRUE(colvNature=="nominal")) {


                      useTab[,2] <- cut(usethis, breaks=var2value)
                  }
              }
                  }
              myTab <- table(useTab[,1],useTab[,2])
              rm(useTab)
              coln <- colnames(myTab)
              rown <- row.names(myTab)
              tabData <- list()
              
              for (j in 1:nrow(myTab)) {
                  #  assign(paste("row", j, sep = ""), c(rown[j],myTab[j,]))
                  assign("tabData", c(tabData, list(eval(parse(text="myTab[j,]")))))
              }
              tabInfo <- list(colnames=coln, rownames=rown, colvar=colv, rowvar=rowv, data=tabData)
              almostCall<-"plot call"
              
              for(j in 1:2) {
                  plotcount<-plotcount+1
                if(j==1){
                  spTEST <- "plot(usedata[,1],usedata[,2])"
                  plotv<-"a"
                  
                  # if(nrow(usedata)>1000) {
                  #    plotd <- usedata[sample(1:nrow(usedata), 1000,replace=FALSE),]
                  #} else {
                  #    plotd <- usedata
                  #}
                  #plotd.x <- plotd[,1]
                  #plotd.y <- plotd[,2]
                  #myxlab <- colnames(plotd)[1]
                  #myylab <- colnames(plotd)[2]
                  #rm(plotd)
                  #plotInfo <- list(myxlab=myxlab, myylab=myylab, xdata=plotd.x, ydata=plotd.y)
                } else{
                    spTEST <- "plot(usedata[,2],usedata[,1])"
                    plotv<-"b"
                }
              
                if(production){
                    plotpath <- "png(file.path(\"/var/www/html/custom/pic_dir\", paste(mysessionid,\"_\",mymodelcount,i,plotv,\".png\",sep=\"\")))"
                }else{
                    plotpath <- "png(file.path(getwd(), paste(\"output\",mymodelcount,i,plotv,\".png\",sep=\"\")))"
                }
              
                eval(parse(text=plotpath))
                eval(parse(text=spTEST))
                dev.off()
              
              # zplots() recreates Zelig plots
              #images <- zplots(s.out, plotpath, mymodelcount, mysessionid, production=production)
              #write("plot(s.out)",mylogfile,append=TRUE)
              
                if(production){
                    imageVector[[plotcount]]<<-paste("https://beta.dataverse.org/custom/pic_dir/", mysessionid,"_",mymodelcount,i,plotv,".png", sep = "")
                }else{
                    imageVector[[plotcount]]<<-paste("rook/output",mymodelcount,i,plotv,".png", sep = "")
                    #   statistical[[plotcount]]<<-myCor
                }
              }
            images<-imageVector ## zplots() returns imageVector, just for consistency
            tabular[[i]]<<-tabInfo
            statistical[[i]] <<-statInfo
            #plotdata[[i]] <<-plotInfo
          }
          
          if(length(images)>0){
              #  names(images)<-paste("output",1:length(images),sep="")
              names(images) <- apply(myedges,1,function(x) c(paste(x[1],x[2],sep="-"),paste(x[2],x[1],sep="-")))
              names(tabular) <- names(statistical) <- apply(myedges,1,function(x) paste(x[1],x[2],sep="-"))
              result<-list(images=images, call=almostCall, tabular=tabular, statistical=statistical, plotdata=plotdata)
          }else{
              warning<-TRUE
              result<-list(warning="There are no graphs to show.")
          }
        },
        
        error=function(err){
            warning <<- TRUE ## assign up the scope bc inside function
            result <<- list(warning=paste("Plot error: ", err))
        })
	}


    ## for the tabulation
    #   if(!warning){
    #    summaryMatrix <- summary(z.out$zelig.out$z.out[[1]])$coefficients
        
        #            sumColName <- c(" ", "Estimate", "SE", "t-value", "Pr(<|t|)")
        #sumInfo <- list(colnames=sumColName)
    
    #sumRowName <- row.names(summaryMatrix)
    #   row.names(summaryMatrix) <- NULL # this makes remaining parsing cleaner
    #   colnames(summaryMatrix) <- NULL
    
    #    for (i in 1:nrow(summaryMatrix)) {
    #       assign(paste("row", i, sep = ""), c(sumRowName[i],summaryMatrix[i,]))
    #      assign("sumInfo", c(sumInfo, list(eval(parse(text=paste("row",i,sep=""))))))
    #   }
    #   sumMat <- list(sumInfo=sumInfo)
    #
    #    result<- jsonlite:::toJSON(c(result,sumMat))   # rjson does not format json correctly for a list of lists
    #}else{
        result<-jsonlite:::toJSON(result)
        #}
    print("........this is result.........")
   # print(result)
    if(production){
        sink()
    }

     write(result, "myresult2.json")
    response$write(result)
    response$finish()
    

    
}


