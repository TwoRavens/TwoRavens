##
##  Build a folder structure and metadata to resemble MIT-LincolnLabs seed datasets
##

rm(list=ls())

library(jsonlite)
library(foreign)

seed_skeleton <- function(data, name, samplesize=NULL, fraction=0.2, ID=NULL, citation="", description="", depvarname=NULL, taskType=NULL, taskSubType="", metric=NULL, seed=123){

  set.seed=seed

  if (is.null(ID)){
    ID=name
  }

  myTargetIndex <- 0
  myresID <- "learningData"


  # Sample number of observations

  if(!is.null(samplesize)){
    data[is.na(data)] <- 0  # Hack for present
    #data<-na.omit(data)
    cat("sampling dataset")
    ## NOTE: Should check there are enough cases to subsample
    ## NOTE: Should check subsample argument value is valid
    if (samplesize>nrow(data))
      myreplace = TRUE
    else
      myreplace = FALSE
    myindex<-sample(1:nrow(data), size=samplesize, replace=myreplace)
    data<-data[myindex,]
  }


  ## add d3mIndex

  d3mIndex <- 1:nrow(data)
  data <- cbind(d3mIndex, data)


  if(!(fraction>=0) & !(fraction<1)){
    print("Argument `fraction` should be 0 <= fraction < 1 and represent the fraction of the data to put reserve for the test data.")
  }



  paths <- c(paste(name, c("_dataset","_problem","_solution","_dataset/tables"), sep=""),
            "SCORE", paste("TEST", c("","/dataset_TEST","/dataset_TEST/tables","/problem_TEST"), sep=""),
            paste("TRAIN", c("","/dataset_TRAIN","/dataset_TRAIN/tables","/problem_TRAIN"), sep="") )

  print(paths)

  paths <- paste(name, "/", paths, sep="")

  for(i in 1:length(paths)){
    if (!dir.exists(paths[i])){
        dir.create(paths[i], recursive = TRUE)
    }
  }

  ## Divide datasets and write out data

  n <- nrow(data)
  if(fraction>0){
    testindex <- sample(x=1:n, size=ceiling(n*fraction), replace = FALSE,)
    testdata <- data[testindex,]
    traindata <- data[-testindex,]
    write.csv(data, paste(name, "/", name, "_dataset/tables/learningData.csv", sep=""), row.names=FALSE)
    write.csv(testdata, paste(name, "/", "TEST/dataset_TEST/tables/learningData.csv", sep=""), row.names=FALSE)
    write.csv(traindata, paste(name, "/", "TRAIN/dataset_TRAIN/tables/learningData.csv", sep=""), row.names=FALSE)
  } else {
    write.csv(data, paste(name, "/", name, "_dataset/tables/learningData.csv", sep=""), row.names=FALSE)
    write.csv(data, paste(name, "/", "TRAIN/dataset_TRAIN/tables/learningData.csv", sep=""), row.names=FALSE)    
  }



  ## Write various versions of datasetDoc.json

  columnlist = list()
  allNames <- names(data)
  locatedDV <- FALSE

  for(i in 1:ncol(data)){

    tempdata <- data[,i]


    if(allNames[i] == depvarname){
      temprole <- "suggestedTarget"
      depvarColIndex <- i-1
      locatedDV <- TRUE
    }else if (i==1){
      temprole <- "index"
    }else {
      temprole <- "attribute"
    }

    # can't judge categorical
    typevar <- na.omit(tempdata)
    if(!is.numeric(typevar)){
      temptype <- "categorical"
    } else if(any(!(round(typevar)==typevar))){
      temptype <- "real"
    } else {
      temptype <- "integer"
    }

    temp <- list(colIndex=i-1, colName=allNames[i], colType=temptype, role=I(temprole))
    columnlist[[i]]<- temp
  }


  if(!locatedDV){
    print("No variable name in dataset matched supplied `depvarname` argument.")
  }

  dataResourcesList <- list(resID="0", resPath="tables/learningData.csv", resType="table", resFormat=I("text/csv"), isCollection=FALSE, columns=columnlist)

  datasetID <- paste(ID,"_dataset",sep="")

  datasetdoclist <- list(about=list(datasetID=name, datasetName=ID, description=description, citation=citation, datasetSchemaVersion= "4.0.0"), dataResources=list(dataResourcesList))
  datasetDoc <- toJSON(datasetdoclist, auto_unbox=TRUE, pretty=TRUE)

  fileConn<-file(paste(name, "/", name, "_dataset/datasetDoc.json", sep=""))
  writeLines(datasetDoc, fileConn)
  close(fileConn)

  fileConn<-file(paste(name, "/TEST/dataset_TEST/datasetDoc.json", sep=""))
  writeLines(datasetDoc, fileConn)
  close(fileConn)

  fileConn<-file(paste(name, "/TRAIN/dataset_TRAIN/datasetDoc.json", sep=""))
  writeLines(datasetDoc, fileConn)
  close(fileConn)


  ## Write various versions of datasetDoc.json

  if(is.null(taskSubType)){
    mytaskKeywords <- list(taskType)
  } else {
    mytaskKeywords <- list(taskType, taskSubType)
  }

  problemdoclist <- list(about=list(problemID=paste(name,"_problem",sep=""), problemName=ID, problemDescription=description, taskKeywords=mytaskKeywords, problemVersion="4.0.0", problemSchemaVersion="4.0.0"),
    inputs=list(data=list(list(datasetID=datasetID, targets=list(list(targetIndex= myTargetIndex, resID=myresID, colIndex=depvarColIndex, colName=depvarname)) )),
    dataSplits=list(method="holdOut", testSize=fraction), performanceMetrics=list(list(metric=metric))),
    expectedOutputs=list(predictionsFile="predictions.csv"))

  problemDoc <- toJSON(problemdoclist, auto_unbox=TRUE, pretty=TRUE)

  fileConn<-file(paste(name, "/", name, "_problem/problemDoc.json", sep=""))
  writeLines(problemDoc, fileConn)
  close(fileConn)

  fileConn<-file(paste(name, "/TEST/problem_TEST/problemDoc.json", sep=""))
  writeLines(problemDoc, fileConn)
  close(fileConn)

  fileConn<-file(paste(name, "/TRAIN/problem_TRAIN/problemDoc.json", sep=""))
  writeLines(problemDoc, fileConn)
  close(fileConn)

}




#ethdata <- read.csv("PHEM_Weekly_24.csv")
#seed_skeleton(data=ethdata, name="TR10_Ethiopia_Health", samplesize=1000, depvarname="TMalaria_OutP_Cases", ID="Ethiopia_Health", description="Emergency Health data at the weekly reporting level, by woreda", taskType="regression", taskSubType="", metric="rootMeanSquaredError")
#seed_skeleton(data=ethdata, name="TR13_Ethiopia_Health", samplesize=1000, depvarname="TMalariaOutPCases", ID="Ethiopia_Health", description="Emergency Health data at the weekly reporting level, by woreda", taskType="regression", taskSubType="", metric="rootMeanSquaredError")

#fldata <- read.dta("repdata.dta")
#seed_skeleton(data=fldata, name="TR1_Greed_Versus_Grievance", depvarname="onset", ID="Greed_Versus_Grievance", description="Replication data for Fearon and Laitin greed versus grievance analysis", taskType="classification", taskSubType="binary", metric="f1Macro")


#fldata <- read.dta("repdata.dta")
#fldata$onset[fldata$onset==4] <- 1
#seed_skeleton(data=fldata, samplesize=100000, name="TR24_Large_Scale_Greed", depvarname="onset", ID="Greed_Versus_Grievance", description="Replication data for Fearon and Laitin greed versus grievance analysis", taskType="classification", taskSubType="binary", metric="f1Macro")



#pitfdata1<-read.delim("pitf_tab1_mod1.tsv")
#pitfdata2<-read.delim("pitf_tab3_modFL.tsv")
#pitfdata3<-read.delim("pitf_tab3_modPITF.tsv")
#seed_skeleton(data=pitfdata1, name="TR3a_PITF", depvarname="sftpcons", ID="Forecasting_Political_Instability", description="Replication data for Goldstone et al. A Global Model for Forecasting Political Instability, primary model.", taskType="classification", taskSubType="binary", metric="f1Macro")
#seed_skeleton(data=pitfdata2, name="TR3b_PITF", depvarname="sftpcons", ID="Forecasting_Political_Instability", description="Replication data for Goldstone et al. A Global Model for Forecasting Political Instability, with Fearon and Laitin comparison.", taskType="classification", taskSubType="binary", metric="f1Macro")
#seed_skeleton(data=pitfdata3, name="TR3c_PITF", depvarname="sftpcons", ID="Forecasting_Political_Instability", description="Replication data for Goldstone et al. A Global Model for Forecasting Political Instability, primary model on Fearon Laitin observations", taskType="classification", taskSubType="binary", metric="f1Macro")
