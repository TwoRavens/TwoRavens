 FROM cypress/included:3.2.0
 MAINTAINER Raman Prasad (raman_prasad@harvard.edu)


 LABEL organization="Two Ravens" \
       2ra.vn.version="0.0.3-beta" \
       2ra.vn.release-date="2019-05-13" \
       description="Basic cypress test"

# -------------------------------------
# Set the working directory
# -------------------------------------
WORKDIR /e2e

# -------------------------------------
# Install cypress via npm
# -------------------------------------
COPY ./package.json ./package.json

RUN npm i

# -------------------------------------
# Copy over the tests
# -------------------------------------
COPY ./cypress/ ./cypress/
COPY ./cypress.json ./cypress.json
COPY ./README.md ./README.md

# -------------------------------------
# Set the env variable
#  NOTE: Within cypress, the "CYPRESS_" prefix is dropped.
#   e.g. CYPRESS_TWO_RAVENS_BASE_URL -> TWO_RAVENS_BASE_URL
#   e.g. CYPRESS_TA3TA2_API_VERSION -> TA3TA2_API_VERSION
# -------------------------------------
env CYPRESS_TWO_RAVENS_BASE_URL=http://2ravens.org
env CYPRESS_TA3TA2_API_VERSION=2019.2.27

# --------------------------------------------------------
# When the pod is, tests within /e2e/cypress/integration will be run
# --------------------------------------------------------



# ........
# --------------------------------------------------------
# dev work below ...
# --------------------------------------------------------

# CMD npm run --spec "cypress/integration/two_ravens_test_01.js"
# RUN npx cypress run --spec "/e2e/cypress/integration/two_ravens_test_01.js"
# CMD npx cypress run --spec "/e2e/cypress/integration/two_ravens_test_01.js"

# ENTRYPOINT tail -f /dev/null

# COPY ./cypress/integration/two_ravens_test_01.js ./cypress/integration/two_ravens_test_01.js

# CMD docker run  -it\
# -v $PWD:/e2e\
# -e APP_BASE_URL=http://metadata.2ravens.org\
# --network="host"\
# -w /e2e cypress/included:3.2.0\
# run\
# --spec "cypress/integration/two_ravens_test_01.js"
