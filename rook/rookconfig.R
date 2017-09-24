## This is a configuration file for Rook apps

## Define modes
production <- FALSE
d3m_mode <- TRUE


## Set paths where rook apps can write output
if(production){
	PRE_PATH <- "/var/www/rook/rook-files/"
	server_name <- "http://0.0.0.0"
} else {
	PRE_PATH <- paste(getwd(), "/rook-files/", sep="")
	server_name <- "http://127.0.0.1:8080"
}
