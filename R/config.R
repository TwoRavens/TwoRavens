## This is a configuration file for R apps



# ----------------------------------------------
# Variables used for TwoRavens (non-eventdata)
# ----------------------------------------------
production <- identical(Sys.getenv(x='FLASK_USE_PRODUCTION_MODE', unset="no"), "yes")

#print(paste("production: ", production, sep=""))

d3m_mode <- TRUE

# -------------------------------------
# start: rook output file path
# -------------------------------------
# Set the path where rook apps can write output
#
default_report_path <- "/ravens_volume/reports"
REPORT_OUTPUT_PATH <- Sys.getenv(x='REPORT_OUTPUT_PATH', unset=default_report_path)

default_models_path = '/ravens_volume/solvers/models/'
SAVED_MODELS_PATH = Sys.getenv(x='SAVED_MODELS_PATH', unset=default_models_path)

default_solver_service = 'http://localhost:8080/solver-service/'
DJANGO_SOLVER_SERVICE = Sys.getenv(x='DJANGO_SOLVER_SERVICE', unset=default_solver_service)
RECEIVE_ENDPOINT = paste0(DJANGO_SOLVER_SERVICE, 'Receive')

options(error=traceback, warn=1)
