[(I'm already set-up, I just want to run the local dev. environment again)](#running-the-local-environment-after-setup)


# Local Installation Instructions

The following is tested on a Mac (OS 10.12.6). The Ubuntu install is based on 18.04, which will also work on [Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/install-win10).

Due to a required dependency, this will not install on "regular" Windows.

## A. Clone the repository

- Use Github Desktop to pull down the [TwoRavens repository](https://github.com/TwoRavens/TwoRavens)
- Alternately, use the command line:
    ```
    git clone https://github.com/TwoRavens/TwoRavens.git

    # Two Ravens uses a submodule -- the inclusion of another GitHub repository
    git submodule init
    git submodule update
    ```

## B. Install Node.js

- Mac:
  - [Install brew](https://brew.sh/#install)
  - The node install command is:
    ```
    brew install node
    ```
- Ubuntu:
  - Instructions are from here: https://github.com/nodesource/distributions/blob/master/README.md
    ```
    curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```

## C. Install the NPM libraries for TwoRavens

- `cd` into the TwoRavens repository
  - This directory contains the file ```webpack.config.js```
- Run the following command which will create a directory named `node_modules` and install npm packages:
   ```
   npm install
   ```

- 6/27/2018
  - if you get a python error, that you should use a version lower than 3.6, try:
    ```
    npm config set python [path to python 2]
    ```
    - e.g.: `npm config set python /usr/bin/python`

## D. Install Python/Django

Note: The TwoRavens application requires python 3.6+

  - Mac: [Install python 3 using brew](http://docs.python-guide.org/en/latest/starting/install3/osx/)
    - If you have brew:
        ```
        brew install python3
        ```
    - This will also install ```pip3```


### D1. Install [virtualenvwrapper](http://virtualenvwrapper.readthedocs.io/en/latest/install.html#basic-installation)

* The virtualenvwrapper may be installed via ```pip3```:

    ```
    pip3 install virtualenvwrapper
    ```

* Set the shell/Terminal to use virtualenvwrapper.

#### Mac users:
  1. Open a new terminal
  2. Open your ```~/.bash_profile``` for editing
      - If you don't have a ```~/.bash_profile``` file, then create it
  3. Add these lines
      ```
      export WORKON_HOME=$HOME/.virtualenvs
      export PROJECT_HOME=$HOME/Devel
      VIRTUALENVWRAPPER_PYTHON=/usr/local/bin/python3
      source /usr/local/bin/virtualenvwrapper.sh
      ```
  4. Reference: http://virtualenvwrapper.readthedocs.org/en/latest/install.html#shell-startup-file

#### Ubuntu users:
  1. Open a new terminal
  2. Open your ```~/.bashrc``` for editing
  3. Add these lines
     ```
     export WORKON_HOME=$HOME/.virtualenvs
     export PROJECT_HOME=$HOME/Devel
     VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3
     source /usr/local/bin/virtualenvwrapper.sh
     ```
  4. You may need to install virtualenv:
     ```
     sudo apt install virtualenv
     ```
  5. Start new terminals to reload .bashrc

### D2. Make a virtualenv and install requirements

- From the Terminal and within the TwoRavens repository.
- Run the following commands (May take a couple of minutes)

    ```
    mkvirtualenv -p python3.6 2ravens
    pip install -r requirements/dev.txt
    # note: within the virtualenv, pip defaults to pip3
    ```
- Notes:
  - Ubuntu: You will need to install several dependencies prior to this step:
    `sudo apt install libcurl4-openssl-dev libssl-dev swig`
    `pip install Cython`
  - The D3M python package is not yet compatible with Python 3.7. Waiting for:
    `https://gitlab.com/datadrivendiscovery/d3m/merge_requests/199`
  - Mac: Python 3.6 installation can be done like this:
    `https://stackoverflow.com/a/54443920`
  - Ubuntu: If you get the error `OSError: mysql_config not found`, then run
  `sudo apt-get install libmysqlclient-dev`
  - Mac: If you run into Xcode (or other errors) when running the install, google it.
    - Sometimes the [Xcode license agreement hasn't been accepted](http://stackoverflow.com/questions/26197347/agreeing-to-the-xcode-ios-license-requires-admin-privileges-please-re-run-as-r/26197363#26197363)
  - Mac: If you run into issues installing libcurl, then run

        brew install gnutls
        brew install libgcrypt
        export PYCURL_SSL_LIBRARY=gnutls

### D3. Configure your virtualenv

* Edit the [```postactivate``` script for the virtualenvwrapper](http://virtualenvwrapper.readthedocs.org/en/latest/scripts.html#postactivate).
  - Note: 'atom' below may be any text editor
      ```
      atom $VIRTUAL_ENV/bin/postactivate
      ```

* Add this line to the end of the ```postactivate``` file and save the file
    ```
    export DJANGO_SETTINGS_MODULE=tworavensproject.settings.local_settings
    ```

* Test the ```postactivate``` script from your open Terminal:
    ```
    deactivate
    workon 2ravens
    echo $DJANGO_SETTINGS_MODULE
    ```

- You should see ```tworavensproject.settings.local_settings```

### D4. Run the Postgres database via Docker container

- Open a _new_ Terminal and `cd` into the ```TwoRavens``` directory
- Use the following commands to start Postgres
    ```
    workon 2ravens  # activate the virtualenv
    fab postgres_run  # Run Postgres via Docker
    ```

### D5. Check Django configuration. Initialize and run the web server

- In the Terminal from Step D3, run this command within the ```TwoRavens``` directory with the virtualenv activated:
    ```
    python manage.py check
    ```
- If there are no errors, initialize and run the web server with the following command:
    ```
    fab run_with_ta2
    ```
    - The command above will will:
      - (1) Initialize the database, if needed
      - (2) Create a "dev_admin" superuser, if needed
           - password:  "admin" (printed to Terminal--save it for a later step)
      - (3) Start the django test web server
          - shortcut for: ```python manage.py runserver 8080```
      - (4) Start webpack
         - shortcut for ```npm start```

- If you get an error about webpack not being installed:
`npm install --only=dev`

- Check if the application is running:
    - Go to: http://127.0.0.1:8080/
    - You will probably see an error!  That's OK.  Several other services need to be started for the system to work.

## E. Create a symlink for /ravens_volume

- "/**ravens_volume**" is a directory shared by multiple system components. In development, this directory includes test datasets. On deployment, there are multiple shared directories specified via environment variables

- Symlink the "ravens_volume" directory within the TwoRavens repository to your local machine:

    ```
    ln -s [location of TwoRavens repo]/TwoRavens/ravens_volume/ /ravens_volume
    ```

- The "/ravens_volume" location on your local machine will be used by a TA2 system running within a docker container


# 2. Run Redis/Celery

## 2a. Redis


**_Without_ docker**

1. Install Redis
      - example: https://medium.com/@petehouston/install-and-config-redis-on-mac-os-x-via-homebrew-eb8df9a4f298
2. From a new Terminal and within the TwoRavens repository, run the following commands

    ```
    workon 2ravens
    fab redis_run
    ```

**With docker:**

    ```
    docker run --rm -p 6379:6379 -v /ravens_volume:/ravens_volume redis:4
    ```


## 2b. Celery

1. Open a new Terminal
1. `cd` into the TwoRavens repository
1. Run the following commands:
    ```
    workon 2ravens
    fab celery_run_with_ta2
    ```


# 3. Run Flask servers

## 3.a Flask-wrapped R
Download and install R at https://www.r-project.org. R versions 3.4+ should work.

1. Open a new Terminal
1. `cd` into the TwoRavens repository
1. Run the following commands:
    ```
    workon 2ravens
    fab run_R
    ```
1. Go to: http://0.0.0.0:8000/healthCheck.app
  - There should be a message similar to: "Health check. Looks good."

## 3.b Flask-wrapped automated machine learning solvers

1. Open a new terminal
1. `cd` into the TwoRavens repository
1. Run the following commands:
    ```
    workon 2ravens
    fab run_automl
    ```
    On Mac, you may need to run this flag to allow forking:
    `export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES`
Some solvers require additional setup:
    On Mac, you may need to install libomp for some solvers to work (like tpot)
        `brew install libomp`
    For h2o, you will need to install a java version less than 9. If not already installed:
        ```
        brew cask install homebrew/cask-versions/adoptopenjdk8
        ```
    On Linux, install auto_sklearn dependencies:
        `sudo apt-get install build-essential swig`

# 4. Run a local MongoDB instance

- [Install](https://docs.mongodb.com/manual/installation/) and run MongoDB locally
- Sample Mac command to start the Mongo server:
  ```
  mongod --config /usr/local/etc/mongod.conf
  ```

# 5. Configure/Run a TA2 Docker image

## 5a. Docker configuration

The TA2 systems require several Docker updates.

1. Open your Docker application and go to the **Advanced** section.  Make the following updates (or as close as possible):
    - **CPUs**: 4
    - **Memory**: 10.0 GiB
    - **Swap**: 1.0 Gib
2. Within the Docker application, go to **File Sharing**. Add the following directory:
    - `/ravens_volume`
    - Note: Make sure you've completed the previous step titled **Create a symlink for /ravens_volume**

## 5b. Run the TA2

This next step requires access to the TA2 registry. Please talk to team members for details.

The example below uses the Brown TA2 (9/29/2019)

- Make sure you have the Brown TA2 image.  Running `docker images` in a Terminal should show the entry:
  - ```registry.datadrivendiscovery.org/zshang/docker_images:ta2-new```

- Run the TA2 using the command below.  Note, the TA2 may a minute or two to start up
  ```
  # This command will give a list of possible datasets
  #
  fab run_ta2_brown_choose_config

  # Run with a dataset such as `DA_poverty_estimation`.
  #
  fab run_ta2_brown_choose_config:24

  ```

- After giving the TA2 some time to start up, revisit:
  - http://127.0.0.1:8080
  - Note: Running the TA2 will set an initial dataset for the system, removing the error seen earlier.



---

## Running the Local Environment after Setup

This setup involves running several processes.
    - The manual method is detailed below.
    - Contact team members for Mac an ubuntu scripts to speed up this process.

### Run many, many Terminals...

- Open 6 separate Terminals
- **Terminal 1**: Run the Mongo server.
  - Sample command: `mongod --config /usr/local/etc/mongod.conf`
- For each of the other Terminals:
    - ```cd``` into the TwoRavens directory
    - ```workon 2ravens```
- Commands to run--one for each Terminal
    - **Terminal 2: Main app**:
      ```
      fab run_with_ta2
      ```
    - **Terminal 3. R services**:
      ```
      fab run_R
      ```
    - **Terminal 4. Redis**:
      ```
      docker run --rm -p 6379:6379 redis:4
      ```
      - If you don't have docker:
        - install redis (see above)
        - redis: ```fab redis_run```
    - **Terminal 5. Celery**:
      ```fab celery_run_with_ta2```
    - **Terminal 6. Postgres**:
      ```fab postgres_run```
    - **Terminal 7. TA2**.
      - Example using the Brown TA2:
        - List datasets: ```fab run_ta2_brown_choose_config```
        - Pick a dataset based on its number.
          - Example: ```fab run_ta2_brown_choose_config:24```

### Go to the site

- Visit: http://127.0.0.1:8080/
- Go to the Django admin: http://127.0.0.1:8080/admin
    - username: `dev_admin`
    - password: [from create superuser step above](#create-a-django-superuser-optional)

## Misc.

### Access the database via command line

1. Open a Terminal and ```cd``` into the TwoRavens directory
2. Activate the virtual environment and run the shell

    ```
    workon 2ravens
    python manage.py dbshell
    ```

## Subsequent updates

If you run a ```git pull``` to update your repo, please run the commands below to include possible pip requirements and database changes.

These commands will:
  1. Update/add packages specified in updated requirements files.
  1. Apply updates to the database structure.  (New tables, columns, updated fields, etc)

### Preliminaries

  1. Open a Terminal
  2. ```cd``` into the TwoRavens directory
  3. Activate the virtual environment
      ```
      workon 2ravens
      ```

### Commands

- Submodule update for the [TwoRavens common library](https://github.com/TwoRavens/common)
    ```
    cd assets/common/
    git checkout develop
    git pull
    ```

- Submodule update for the [TwoRavens test datasets library](https://github.com/TwoRavens/tworavens-test-datasets )
    ```
    cd /ravens_volume/test_data
    git checkout master
    git pull
    ```

- Update requirements
    ```
    pip install -r requirements/dev.txt
    ```

- Migrate database changes (if needed)
    ```
    fab init_db
    ```
