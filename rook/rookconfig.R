# This is a configuration file for Rook apps

production <- FALSE
d3m_mode <- TRUE

if(production){
	rook_output_images <- "/var/www/rook-files/images"
	rook_output_preprocess <- "/var/www/rook-files/preprocess"
	server_name <- "http://0.0.0.0"
} else {
	rook_output_images <- "/rook-files/images"
	rook_output_preprocess <- "/rook-files/preprocess"
	server_name <- "http://127.0.0.1:8080"
}
