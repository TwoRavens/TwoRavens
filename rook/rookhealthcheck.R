##
##  rookhealthcheck.R
##
##  Return a response to show the server is up
##



healthcheck.app <- function(env){

    #sink();
        source("rookconfig.R")
    request <- Request$new(env)

    print('(1)----------------------------------------')
    print(request$POST())

    print('(2)----------------------------------------')
    print(request$POST()$solaJSON)

    print('(3)----------------------------------------')
    valid <- jsonlite::validate(request$POST()$solaJSON)
    print(valid)

    print('(4)----------------------------------------')
    everything <- jsonlite::fromJSON(request$POST()$solaJSON)
    print(everything)
    print('----------------------------------------')

    #request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    response$write("rook is up")
    response$finish()
}
