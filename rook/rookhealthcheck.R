##
##  rookhealthcheck.R
##
##  Return a response to show the server is up
##



healthcheck.app <- function(env){

    sink();

    #request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    response$write("rook is up")
    response$finish()
}
