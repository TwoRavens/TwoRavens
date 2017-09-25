
This document lists/describes the configurations needed to deploy the TwoRavens application as 3 containers:

Quick Description of containers

1. *tworavens*
  - UI and middleware
  - port 8080 web service
    - exposed to the outside via nginx
  - port 50051 for gRPC communication
  - Serves the UI via a Django app
  - Makes internal requests to *rook* service below
1. *rook-service*
  - R applications
  - port 8000 web service
    - not exposed to the outside for D3M
  - receives requests from *tworavens*
  - writes files, including essential preprocess files
1. *nginx*
  - port 80: public web frontend
  - routes requests to *tworavens*
  - non D3M mode, forwards some file requests to *rook-service*

## Configuration for each container

### 1. tworavens

- 
