(dev notes)


# cypress tests with docker

```
# Run single test file via docker image
#
docker run  -it -v $PWD:/e2e -w /e2e cypress/included:3.2.0 run --spec "cypress/integration/two_ravens_test_01.js"


# Run single test file via docker image, against localhost
#
docker run  -it\
 -v $PWD:/e2e\
 -e APP_BASE_URL=http://metadata.2ravens.org\
 --network="host"\
 -w /e2e cypress/included:3.2.0\
 run\
 --spec "cypress/integration/two_ravens_test_01.js"

```


## Docker container for cypress

- ref: https://medium.com/@zite/so-you-want-to-get-cypress-running-in-docker-7e8fb2837731

```
docker build -t tworavens-test-runner:latest .
docker run --rm --name raven_ci_test raven-test:latest
docker run --rm --name raven_ci_test raven-test:latest --spec "cypress/integration/two_ravens_test_01.js"

# docker run -it --rm --name raven_ci_test raven-test:latest /bin/bash

# Run against Dockerhub image from TwoRavens
#
docker run --rm --name raven_ci_test tworavens/tworavens-test-runner:latest --spec "cypress/integration/two_ravens_test_01.js"
```
