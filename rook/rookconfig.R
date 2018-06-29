## This is a configuration file for Rook apps

# ----------------------------------------------
# START: Event data specific config variables
# ----------------------------------------------

EVENTDATA_ROOK_URL_BASE = Sys.getenv(x='EVENTDATA_ROOK_URL_BASE', unset="http://127.0.0.1:8000")

# Default is FALSE, setting an env variable to "yes", will set the mode to TRUE
#
EVENTDATA_PRODUCTION_MODE <- identical(Sys.getenv(x='EVENTDATA_PRODUCTION_MODE', unset="no"), "yes")

# Event data server addresses
#	- local server
# - default prod server
#
EVENTDATA_LOCAL_SERVER_ADDRESS <- Sys.getenv(x='EVENTDATA_LOCAL_SERVER_ADDRESS', unset="mongodb://localhost:27017")
EVENTDATA_MONGO_USERNAME <- Sys.getenv(x='EVENTDATA_MONGO_USERNAME', unset="TwoRavens")
EVENTDATA_MONGO_PASSWORD <- Sys.getenv(x='EVENTDATA_MONGO_PASSWORD', unset=NA)

# Load prod server from ENV variable.  If it doesn't exist, use the PHOENIX address
#
EVENTDATA_PHOENIX_SERVER_ADDRESS <- 'http://149.165.156.33:5002/api/data?'
EVENTDATA_PRODUCTION_SERVER_ADDRESS <- Sys.getenv(x='EVENTDATA_PRODUCTION_SERVER_ADDRESS', unset=EVENTDATA_PHOENIX_SERVER_ADDRESS)

# API KEY, Load from ENV variable.  If it doesn't exist, use the default
#
EVENTDATA_DEFAULT_API_KEY <- 'api_key=CD75737EF4CAC292EE17B85AAE4B6'
EVENTDATA_SERVER_API_KEY <- Sys.getenv(x='EVENTDATA_SERVER_API_KEY', unset=EVENTDATA_DEFAULT_API_KEY)
# ----------------------------------------------
# END: Event data specific config variables
# ----------------------------------------------
# ----------------------------------------------
# ----------------------------------------------



# ----------------------------------------------
# Variables used for TwoRavens (non-eventdata)
# ----------------------------------------------
production <- identical(Sys.getenv(x='ROOK_USE_PRODUCTION_MODE', unset="no"), "yes")

print(paste("production: ", production, sep=""))


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
