## This is a configuration file for Rook apps

## Define modes
production <- FALSE
d3m_mode <- TRUE

data_path <- "/rook-files/data/"
image_path <- "/rook-files/images/"
preprocess_path <- "/rook-files/preprocess/"

## Set paths where rook apps can write output
if(production){
	rook_output_data <- paste("/var/www/", data_path, sep="") 
	rook_output_images <- paste("/var/www/", image_path, sep="") 
	rook_output_preprocess <- paste("/var/www/", preprocess_path, sep="") 
	server_name <- "http://0.0.0.0"
} else {
	rook_output_data <- paste(getwd(), data_path, sep="") 
	rook_output_images <- paste(getwd(), image_path, sep="") 
	rook_output_preprocess <- paste(getwd(), preprocess_path, sep="") 
	server_name <- "http://127.0.0.1:8080"
}

# R won't write to a directory that doesn't exist.
if (!dir.exists(rook_output_data)){
	dir.create(rook_output_data, recursive = TRUE)
}
if (!dir.exists(rook_output_images)){
	dir.create(rook_output_images, recursive = TRUE)
}
if (!dir.exists(rook_output_preprocess)){
	dir.create(rook_output_preprocess, recursive = TRUE)
}
