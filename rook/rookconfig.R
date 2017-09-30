## This is a configuration file for Rook apps

## Define modes

# Use production mode if env variable ROOK_USE_PRODUCTION_MODE = "yes"
#
production <- identical(Sys.getenv(x='ROOK_USE_PRODUCTION_MODE', unset="no"), "yes")


d3m_mode <- TRUE
addPrivacy<-TRUE      ## Toggle:  TRUE - Add .apps for differential privacy, FALSE - Do not add privacy .apps

# to differentiate older Rapache code
is_rapache_mode <- FALSE


## Set paths where rook apps can write output
PRE_PATH <- paste(getwd(), "/rook-files/", sep="")

if(production){
	server_name <- ""
} else {
	server_name <- "http://127.0.0.1:8080"
}
