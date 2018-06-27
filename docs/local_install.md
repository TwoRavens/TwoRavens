[(I'm already set-up, I just want to run the local dev. environment again)](#running-the-local-environment-after-setup)


# Local Installation Instructions

For the recommended and easiest route, try the [Vagrant install](https://github.com/TwoRavens/TwoRavens/blob/master/docs/vagrant_install.md), which will allow you to run TwoRavens within a virtual machine on Mac, Windows, or Linux.

Note: the Vagrant install will also work natively on an Ubuntu 16.04 (Xenial) system.

The following is tested on a Mac (OS 10.12.6).

## Get the repository

- Use Github Desktop to pull down the [TwoRavens repository](https://github.com/TwoRavens/TwoRavens)
- Alternately, use the command line:
    ```
    git clone https://github.com/TwoRavens/TwoRavens.git
    #git submodule init
    #git submodule update
    ```

## Install Node.js

Mac:
  - [Install brew](https://brew.sh/#install)
  - The node install command is:
    ```
    brew install node
    ```

#### Install the NPM libraries for TwoRavens

- `cd` into the TwoRavens repository
  - This directory contains the file ```webpack.config.js```
- Run the following command which will create a directory named `node_modules` and install npm packages:
   ```
   npm install
   ```

## Install Python/Django

Mac:
  - [Install python 3 using brew](http://docs.python-guide.org/en/latest/starting/install3/osx/)
    - If you have brew:
        ```
        brew install python3
        ```
    - This will also install ```pip3```


### Install [virtualenvwrapper](http://virtualenvwrapper.readthedocs.io/en/latest/install.html#basic-installation)

* The virtualenvwrapper may be installed via ```pip3```:

    ```
    pip3 install virtualenvwrapper
    ```

* Set the shell/Terminal to use virtualenvwrapper.
  - For Mac users:
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

### Make a virtualenv and install requirements

- From the Terminal and within the TwoRavens repository.
- Run the following commands (May take a couple of minutes)

    ```
    mkvirtualenv -p python3 2ravens  
    pip install -r requirements/dev.txt  
    # note: within the virtualenv, pip defaults to pip3
    ```

- Mac note: If you run into Xcode (or other errors) when running the install, google it.  
  - Sometimes the [Xcode license agreement hasn't been accepted](http://stackoverflow.com/questions/26197347/agreeing-to-the-xcode-ios-license-requires-admin-privileges-please-re-run-as-r/26197363#26197363)

### Configure your virtualenv

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


### See if Django is configured ok and create the database

This command is run within the ```TwoRavens``` directory with the virtualenv activated:

  ```
  python manage.py check
  ```

If there are no errors, create the database:

  ```
  fab init_db
  ```

Create a example NIST configuration file as:

  ```
  fab make_d3m_config
  ```


(The command above is a short cut for ```python manage.py migrate```)

### Create a django superuser (optional)

This should only be used in local (laptop) test environments.  After running the command, the admin password will be printed on the screen.

  ```
  fab create_django_superuser
  ```

This creates a django super with:
  - username: ```dev_admin```
  - password: (printed to Terminal--save it for a later step)

## Run the Django dev server and webpack

The following command will start the Django webserver as well as webpack.

  ```
  fab run
  ```

  - The command above runs two commands: ```python manage.py runserver 8080``` and ```npm start```

- Go to: http://127.0.0.1:8080/

- You will probably see an error!  Follow the step below and then go back to the url above and try again.

# Run Redis/Celery

## Redis

**With docker:**


```
docker run --rm -p 6379:6379 -v /ravens_volume:/ravens_volume redis:4
```

**_Without_ docker**

1. Install Redis
      - example: https://medium.com/@petehouston/install-and-config-redis-on-mac-os-x-via-homebrew-eb8df9a4f298
2. From a new Terminal and within the TwoRavens repository, run the following commands

      ```
      workon 2ravens
      fab redis_run
      ```

## Celery

1. Open a new Terminal
1. `cd` within the TwoRavens repository directory
1. Run the following commands:
    ```
    workon 2ravens
    fab celery_run
    ```


# Install R / Run Rook

Download and install R at https://www.r-project.org. If you followed the Vagrant install guide, you've already done this.

The following must be run within R. On the Vagrant install, this is done via:

    sudo -i R

Then, in the R shell:

  ```
  install.packages(c("VGAM", "AER", "dplyr", "quantreg", "geepack", "maxLik", "Amelia", "Rook","jsonlite","rjson", "devtools", "DescTools", "XML", "Zelig", "rappdirs", "sourcetools", "processx", "rex", "evaluate", "highr", "brglm", "ROCR", "praise", "commonmark", "hunspell", "knitr", "rprojroot", "rpart"))
  ```

Then set your working directory to ~/TwoRavens/rook. On the Vagrant install, this is:

  ```
  setwd("/home/ubuntu/TwoRavens/rook")
  ```

On Mac it will look more like:

  ```
  setwd("/Users/vjdorazio/Desktop/github/TwoRavens/rook")
  ```

Then source rooksource.R to get the app up:

  ```
  source("rooksource.R")
  ```

Note that this may install many packages, depending on what already exists. If it asks, just say that you want to install things from the source. The local server with the apps should be up and R should say something like:

  ```
  *Server started on host...*
  ```

- Try the app again:
  - Go to: http://127.0.0.1:8080/
  - Hit shift+refresh on the browser

As a shortcut to the above, assuming R is installed, from the command line, you can try:
  ```
  fab run_rook
  ```

## Running the Local Environment after Setup

### Run the server

6/20 - This setup involves running several processes.  The manual method is as follows:

#### _Without_ a TA2 (test mode)

1. Open 4 separate Terminals
1. For each Terminal:
    - ```cd``` into the TwoRavens directory
    - ```workon 2ravens```
1. Next are commands to run--one for each Terminal
    1. Main app: ```fab run```
    1. Rook: ```fab run_rook```
    1. Redis: ```docker run --rm -p 6379:6379 redis:2.8```
         - If you don't have docker:
             - install redis (see above)
             - redis: ```fab run_redis```
    1. Celery: ```fab celery_run```
1. Go to Two Ravens: http://127.0.0.1:8080/
    - Go to the Django admin: http://127.0.0.1:8080/admin
      - username: `dev_admin`
      - password: [from create superuser step above](#create-a-django-superuser-optional)


#### _With_ a TA2

Read fully before going through the step.

1. Follow the steps in previous section **EXCEPT**:
     - For step (3)(i), the "Main app", use ```fab run_with_ta2```


### Run the python shell (if needed)

1. Open a Terminal and ```cd``` into the TwoRavens directory
2. Activate the virtual environment and run the shell

    ```
    workon 2ravens
    python manage.py shell
    ```

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
  1. ```cd``` into the TwoRavens directory
  2. Activate the virtual environment
      ```
      workon 2ravens
      ```

### Commands

- x Submodule updates
    ```
    #git submodule update
    ```

- Update requirements
    ```
    pip install -r requirements/dev.txt
    ```

- Migrate database changes (if needed)
    ```
    fab init_db
    ```
