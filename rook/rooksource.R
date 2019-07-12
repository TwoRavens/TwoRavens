##
##  rooksource.R
##
##  8/19/15
##


## Define paths for output.
## Also set `production` toggle:  TRUE - Production, FALSE - Local Development.
source("rookconfig.R")

print(paste("production: ", production, sep=""))

if(!production){
  print(paste("load packages...", sep=""))

    packageList.reports <- c('rmarkdown', 'ggplot2', 'knitr', 'reshape2', 'grid', 'gridExtra', 'xtable')
    packageList.rooksolver <- c('caret', 'R.utils', "rpart", "ranger", "naivebayes", "stargazer", "doParallel")
    packageList<-c("Rcpp","VGAM", "dplyr", "Amelia", "Rook", "jsonlite","rjson", "devtools", "DescTools", "nloptr", "XML", packageList.rooksolver, packageList.reports)

    # Find an available repository on CRAN
    availableRepos <- getCRANmirrors()
    flag <- availableRepos$Country=="USA" & grepl("https",availableRepos$URL,)
    useRepos <- sample(availableRepos$URL[flag],1)

    ## install missing packages, and update if newer version available
    for(i in 1:length(packageList)){
        if (!require(packageList[i],character.only = TRUE)){
            install.packages(packageList[i], repos=useRepos)
        }
     }
    update.packages(ask = FALSE, dependencies = c('Suggests'), oldPkgs=packageList, repos=useRepos)
}

library(Rook)
library(rjson)
library(jsonlite)

# library(lazyeval) # added 5/21/2019
# library(processx) # added 5/21/2019

library(devtools)
library(DescTools)
library(rpart)
library(stargazer)
library(ranger)

source(paste(getwd(),"/preprocess/preprocess.R",sep="")) # load preprocess function

if(production) {
  myPort <- "8000"
  myInterface <- "0.0.0.0"
} else {
  myPort <- "8000"
  myInterface <- "0.0.0.0"
}

# ---------------------------
# start: Run Rook server
# ---------------------------
httpd_status <- -1  # variable for checking the status

# Run C_startHTTPD or startHTTPD depending on R version
#
if (as.integer(R.version[["svn rev"]]) > 72310) {
    httpd_status <- .Call(tools:::C_startHTTPD, myInterface, myPort)
} else {
    httpd_status <- .Call(tools:::startHTTPD, myInterface, myPort)
}

# Check the httpd service
#
if( httpd_status!=0 ){
    print("WARNING: Error setting interface or port")
    stop()
}

# Allow listening outside of the local host
#
unlockBinding("httpdPort", environment(tools:::startDynamicHelp))
assign("httpdPort", myPort, environment(tools:::startDynamicHelp))

# Start the http server
#
R.server <- Rhttpd$new()

cat("Type:", typeof(R.server), "Class:", class(R.server))

# Set the IP Address and Port
#
#R.server$start(listen=myInterface, port=myPort) # doesn't work with unlockBinding; redundant?
R.server$listenAddr <- myInterface
R.server$listenPort <- myPort

# ---------------------------
# end: Run Rook server
# ---------------------------

# -------------------------------------
# start: Load modules for apps
# -------------------------------------
#source("rookselector.R")
source("rooksubset.R")
source("rooktransform.R")
#source("rookzelig.R")
source("rookutils.R")
source("rookdata.R")
#source("rookwrite.R")   # jh - believe this is a legacy of early exploration of user-level metadata
source("rookpreprocess.R")
source("rookpipeline.R")
source("rookhealthcheck.R")
source("rookexplore.R")
source("rookpartials.R")
source("rookplotdata.R")
source("rooktree.R")
source("rooksolver.R")
source("rookreport.R")
source("rookmkdocs.R")

# -------------------------------------
# end: Load modules for apps
# -------------------------------------


parsePOST <- function(env, app) {

  if(production) sink(file = stderr(), type = "output")

  request <- Rook::Request$new(env)
  parameters <- request$POST()

  body <- paste0(rawToChar(request$body()$postBody, multiple = T), collapse="")

  if (request$content_type() == 'application/json') {
    if(!jsonlite::validate(body))
    return(list(
    success=jsonlite::unbox(FALSE),
    message=jsonlite::unbox('The request is not valid json. Check for special characters.')
    ))
    body <- jsonlite::fromJSON(body)
  }

  result <- app(parameters, body)

  response <- Response$new(headers = list("Access-Control-Allow-Origin"="*"))
  response$write(jsonlite::toJSON(result))
  response$finish()
}


# -------------------------------------
# start: Add rook apps
# -------------------------------------
#R.server$add(app = zelig.app, name = "zeligapp")
R.server$add(app = subset.app, name="subsetapp")
R.server$add(app = transform.app, name="transformapp")
R.server$add(app = data.app, name="dataapp")
#R.server$add(app = write.app, name="writeapp")  # jh - believe this is a legacy of early exploration of user-level metadata
R.server$add(app = preprocess.app, name="preprocessapp")
R.server$add(app = pipeline.app, name="pipelineapp")
R.server$add(app = healthcheck.app, name="healthcheckapp")
R.server$add(app = explore.app, name="exploreapp")
R.server$add(app = function(post) parsePOST(post, rookReport.app), name = "reportGeneratorApp")
R.server$add(app = File$new(paste0(getwd(), '/rook-files/')), name = "rook-files")
R.server$add(app = partials.app, name="partialsapp")
R.server$add(app = plotdata.app, name="plotdataapp")
R.server$add(app = tree.app, name="treeapp")
R.server$add(app = solver.app, name="solverapp")
R.server$add(app = mkdocs.app, name="mkdocsapp")

# Serve files directly from rook
R.server$add(app = File$new(REPORT_OUTPUT_PATH), name = "rook-reports")
R.server$add(app = File$new(PREPROCESS_OUTPUT_PATH), name = "rook-files")
#   R.server$add(app = selector.app, name="selectorapp")
print(R.server)
# -------------------------------------
# end: Add rook apps
# -------------------------------------
