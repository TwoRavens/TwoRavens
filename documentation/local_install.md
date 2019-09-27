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
Ubuntu:
  - Instructions from here: https://github.com/nodesource/distributions/blob/master/README.md
  ```
  curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

#### Install the NPM libraries for TwoRavens

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

  - For Ubuntu users:
    1. Open a new terminal
    2. Open your ```~/.bashrc``` for editing
    3. Add these lines
       ```
       export WORKON_HOME=$HOME/.virtualenvs
       export PROJECT_HOME=$HOME/Devel
       VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3
       source ~/.local/bin/virtualenvwrapper.sh
       ```
    4. You may need to install virtualenv:
       ```
       sudo apt install virtualenv
       ```
    5. Start new terminals to reload .bashrc

### Make a virtualenv and install requirements

- From the Terminal and within the TwoRavens repository.
- Run the following commands (May take a couple of minutes)

    ```
    mkvirtualenv -p python3 2ravens  
    pip install -r requirements/dev.txt  
    # note: within the virtualenv, pip defaults to pip3
    ```

- Ubuntu note: If you get the error `OSError: mysql_config not found`, then run  
  `sudo apt-get install libmysqlclient-dev`
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


### See if Django is configured ok, initialize and run the web server

This command is run within the ```TwoRavens``` directory with the virtualenv activated:

  ```
  python manage.py check
  ```

If there are no errors, run the following command:

  ```
  fab run_with_ta2
  ```

This will:
  1. Initialize the database, if needed
  2. Create a "dev_admin" superuser, if needed
    - password:  "admin" (printed to Terminal--save it for a later step)
  3. Start the django test web server
    - shortcut for: ```python manage.py runserver 8080```
  4. Start webpack
    - shortcut for ```npm start```


- Go to: http://127.0.0.1:8080/

- You will probably see an error!  That's OK.  Several other services need to be started

## Create a symlink for /ravens_volume

Symlink the "ravens_volume" directory within the TwoRavens repository to:

```
ln -s (location of TwoRavens repo)/TwoRavens/ravens_volume/ /ravens_volume
```

The "/ravens_volume" location on your local machine will be used by a TA2 system running within a docker container


# 1. Run Redis/Celery

## Redis


**_Without_ docker**

1. Install Redis
      - example: https://medium.com/@petehouston/install-and-config-redis-on-mac-os-x-via-homebrew-eb8df9a4f298
2. From a new Terminal and within the TwoRavens repository, run the following commands

```
workon 2ravens
fab redis_run
```

**With docker:**

- Note: not tested recently with docker redis

```
docker run --rm -p 6379:6379 -v /ravens_volume:/ravens_volume redis:4
```


## Celery

1. Open a new Terminal
1. `cd` within the TwoRavens repository directory
1. Run the following commands:
    ```
    workon 2ravens
    fab celery_run_with_ta2
    ```


# Install R / Run Flask-wrapped R

Download and install R at https://www.r-project.org. R versions 3.4+ should work.

1. Open a new Terminal
1. `cd` within the TwoRavens repository directory
1. Run the following commands:
    ```
    workon 2ravens
    fab run_flask
    ```
1. Go to: http://0.0.0.0:8000/healthCheck.app
  - There should be a message: "Health check. Looks good."
    - Or similar


# Run a local Mongo instance

- Install and run Mongo locally
- Sample Mac command:
  ```
  mongod --config /usr/local/etc/mongod.conf
  ```

# Run a TA2

- This next steps requires access to the 

# Next steps need updating... (9/27)



## Running the Local Environment after Setup

### Run the server

6/20 - This setup involves running several processes.  The manual method is as follows:

#### _Without_ a TA2 (test mode)

1. Open 4 separate Terminals
2. For each Terminal:
    - ```cd``` into the TwoRavens directory
    - ```workon 2ravens```
3. Next are commands to run--one for each Terminal
    i. Main app: ```fab run```
    j. Rook: ```fab run_rook```
    k. Redis: ```docker run --rm -p 6379:6379 redis:2.8```
         - If you don't have docker:
             - install redis (see above)
             - redis: ```fab run_redis```
    l. Celery: ```fab celery_run```
4. Go to Two Ravens: http://127.0.0.1:8080/
    - Go to the Django admin: http://127.0.0.1:8080/admin
      - username: `dev_admin`
      - password: [from create superuser step above](#create-a-django-superuser-optional)


#### _With_ a TA2

Read fully before going through the step.
Use the instructions in `./ta2-notes/ta3_run.md`.

If error due to /ravens_volume/test_data not found:
    A symlink is needed from root to `ravens_volume`. Adjust path as necessary. On Ubuntu:
    ```sudo ln -s /home/shoe/TwoRavens/ravens_volume /```

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
  2. ```cd``` into the TwoRavens directory
  3. Activate the virtual environment
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
