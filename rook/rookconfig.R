## This is a configuration file for Rook apps



# ----------------------------------------------
# Variables used for TwoRavens (non-eventdata)
# ----------------------------------------------
production <- identical(Sys.getenv(x='ROOK_USE_PRODUCTION_MODE', unset="no"), "yes")

print(paste("production: ", production, sep=""))


d3m_mode <- TRUE
addPrivacy<-TRUE      ## Toggle:  TRUE - Add .apps for differential privacy, FALSE - Do not add privacy .apps

# -------------------------------------
# start: rook output file path
# -------------------------------------
# Set the path where rook apps can write output
#
default_output_path <- paste(getwd(), "/rook-files/", sep="")
PREPROCESS_OUTPUT_PATH <- Sys.getenv(x='PREPROCESS_OUTPUT_PATH', unset=default_output_path)

# Make sure the path exists
#
if (nchar(PREPROCESS_OUTPUT_PATH)==0){
	print("EXISTING: PREPROCESS_OUTPUT_PATH is not set.")
	stop()
}

# Make sure the path ends with "/"
#
if(substring(PREPROCESS_OUTPUT_PATH, nchar(PREPROCESS_OUTPUT_PATH)) != "/"){
	 PREPROCESS_OUTPUT_PATH <- paste(PREPROCESS_OUTPUT_PATH, "/", sep="")
}
print(paste("PREPROCESS_OUTPUT_PATH: ", PREPROCESS_OUTPUT_PATH, sep=""))

# -------------------------------------
# end: rook output file path
# -------------------------------------

if(production){
	server_name <- ""
} else {
	server_name <- "http://127.0.0.1:8080"
}
