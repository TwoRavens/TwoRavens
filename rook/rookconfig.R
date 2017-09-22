## This is a configuration file for Rook apps

## Define modes
production <- FALSE
d3m_mode <- TRUE

#use_path <- "rook-files/"
use_path <- "data/d3m/output/"


## Set paths where rook apps can write output
if(production){
	pre_path <- "/var/www/rook/"
	server_name <- "http://0.0.0.0"
} else {
	pre_path <- "../"
	server_name <- "http://127.0.0.1:8080"
}




