[(I'm already set-up, I just want to run the local dev. environment again)](#running-the-local-environment-after-setup)


# Local Installation Instructions

This is a 1st run at dev. install instructions, tested on a Mac (OS 10.12.6)

## Get the repository

- Use Github Desktop to pull down the [TwoRavens repository](https://github.com/vjdorazio/TwoRavens)
- Alternately, use the command line:
    ```
    git clone git@github.com:vjdorazio/TwoRavens.git
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

* On Ubuntu 17.04 (and probably Debian systems), an alternative is:     
    ```
    apt install virtualenv
    
    ...
    export WORKON_HOME=$HOME/.virtualenvs
    export PROJECT_HOME=$HOME/Devel
    VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3
    source ~/.local/bin/virtualenvwrapper.sh
    ```

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


## Install R / Run Rook

(directions from @aaron-lebo)

Download and install R at https://www.r-project.org. Execute the following with R to install R packages:

  ```
  install.packages(c("VGAM", "AER", "dplyr", "quantreg", "geepack", "maxLik", "Amelia", "Rook","jsonlite","rjson", "devtools", "DescTools", "Zelig"))
  ```

Note: this requires libssl-dev on Ubuntu 17.04.

Then set your working directory to ~TwoRavens/rook, for example:

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

## Running the Local Environment after Setup

### Run the server


1. Open a Terminal and ```cd``` into the TwoRavens directory
2. Activate the virtual environment and run the server
    ```
    workon 2ravens
    # the next line runs the django server AND starts webpack to monitor .js changes
    fab run
    ```
3. Start an R interactive shell
    1. Set your working directory to ~TwoRavens/rook, for example:
        ```
        setwd("/Users/vjdorazio/Desktop/github/TwoRavens/rook")
        ```
    1. Source rooksource.R to get the app up:
        ```
        source("rooksource.R")
        ```
4. Go to Two Ravens: http://127.0.0.1:8080/
  - Go to the Django admin: http://127.0.0.1:8080/admin
    - username: `dev_admin`
    - password: [from create superuser step above](#create-a-django-superuser-optional)





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

- Update requirements
    ```
    pip install -r requirements/dev.txt
    ```

- Migrate database changes (if needed)
    ```
    fab init_db
    ```
