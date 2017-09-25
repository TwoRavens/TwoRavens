
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

These two environment variables may be in docker-compose (or kubernetes)

- Specify a TA2 server for gRPC communcation
  - **variable**: TA2_TEST_SERVER_URL
  - **example**: TA2_TEST_SERVER_URL=rprasad2r.local:50051
  - Note: The container exposes port `50051` -- other ports aren't reachable without changing the Dockefile itself

- Set a path to load a D3M config file:
  - **variable**: ENV_D3M_CONFIG_FILEPATH
  - **example**:  ENV_D3M_CONFIG_FILEPATH=/ravens_volume/config_o_196seed.json
  - Note: Every container has the volume `/ravens_volume` which may be linked to an external directory

### 2. rook-service
  - **variable**: ROOK_USE_PRODUCTION_MODE
  - **example**:  ROOK_USE_PRODUCTION_MODE=yes
  - Note: We want the value to be "yes" so that `rook_nonstop.R` will run. Otherwise, it will fail as a container.

### 3. nginx
  - Nginx serves via port 80 and proxies to the other services
  - Near-term updates: serve django static files and potentially rook files via mounted volumes
