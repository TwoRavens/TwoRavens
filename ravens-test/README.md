# Cypress tests (dev notes)

- For running this as a kubernetes job, also see these notes:
  - https://github.com/TwoRavens/two-ravens-deploy/blob/master/gce/README-TESTRUNNER.md

## Run locally from directory

```
cd ravens-test

# Run if not already installed
npm i

# Run cypress against a locally running TwoRavens system
export CYPRESS_TWO_RAVENS_BASE_URL=http://127.0.0.1:8080
npm run cypress:open

# In UI, click on two_ravens_test_01.js
```

## Run using official cypress docker image

```
# Run single test file via docker image
#

docker run  -it\
 -v $PWD:/e2e\
 -e CYPRESS_TWO_RAVENS_BASE_URL=http://metadata.2ravens.org\
 --network="host"\
 -w /e2e cypress/included:3.2.0\
 run\
 --spec "cypress/integration/two_ravens_test_01.js"

```

## Build/push cypress docker image

```
# from within the TwoRavens/ravens-test directory
#
docker build -t tworavens/tworavens-test-runner:latest .
docker login
docker push tworavens/tworavens-test-runner:latest
```

## Run the custom built docker image

```
docker run\
 --env CYPRESS_TWO_RAVENS_BASE_URL=http://2ravens.org\
 --env CYPRESS_TA3TA2_API_VERSION=2019.2.27\
 --rm\
 --name raven_ci_test\
 tworavens/tworavens-test-runner:latest
```
