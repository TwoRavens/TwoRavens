##
##  rookhealthcheck.R
##
##  Return a response to show the server is running
##
healthcheck.app <- function(env){

    source("rookconfig.R")

    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    response$write(paste("rook is running<br />(", Sys.time(), ")", sep=""))
    response$finish()
}
