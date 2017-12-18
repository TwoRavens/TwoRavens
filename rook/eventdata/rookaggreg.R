print("entered r aggreg app")

eventdata_aggreg.app <- function(env) {

	

	request <- Request$new(env)
	response <- Response$new()
    response$header("Access-Control-Allow-Origin", "*")  # Enable CORS

    
    if (request$options()) {
		print("Preflight from aggreg")
		response$status = 200L

		# Ensures CORS header is permitted
		response$header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		response$header("Access-Control-Allow-Headers", "origin, content-type, accept")
		return(response$finish())
    }

    print("return from aggreg")
	response$write("aggreg from R")
    return(response$finish())

}
