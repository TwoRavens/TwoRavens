# Vagrant install

This is the only tested method to run TwoRavens on Windows, but works on anything with support for Vagrant. To get started:

1) download and install [Vagrant](https://www.vagrantup.com/downloads.html)
2) download and install [VirtualBox](https://www.virtualbox.org/wiki/Downloads)

(you almost certainly want the 64-bit versions)

Once Vagrant is installed, in the terminal enter:

    mkdir 2ravens 
    cd 2ravens 
    vagrant box add ubuntu/xenial64
    vagrant init
    
Replace the Vagrantfile the last command created with [this one](https://github.com/TwoRavens/TwoRavens/blob/master/Vagrantfile). Then:

    vagrant box update
    vagrant up
    vagrant ssh
    
The last command boots you into a virtual machine running Ubuntu Linux. Next, update Ubuntu to use the latest version of R:

    sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys E298A3A825C0D65DFD57CBB651716619E084DAB9
    sudo add-apt-repository 'deb [arch=amd64,i386] https://cran.rstudio.com/bin/linux/ubuntu xenial/'
    sudo apt-get update
    
Install the dependencies that TwoRavens relies upon:

    sudo apt install libcurl4-openssl-dev libxml2-dev nodejs-legacy npm pkg-config python3-pip r-base libpoppler-cpp-dev libcairo2-dev librsvg2-dev libwebp-dev libgdal-dev libxt-dev
    pip3 install --upgrade pip
    pip3 install --user virtualenvwrapper

Add this to the end of ~/.bashrc:

    export WORKON_HOME=$HOME/.virtualenvs
    export PROJECT_HOME=$HOME/Devel
    VIRTUALENVWRAPPER_PYTHON=/usr/bin/python3
    source ~/.local/bin/virtualenvwrapper.sh
   
Once that is saved, run:

    source ~/.bashrc
    
Clone TwoRavens and install the Node dependencies:

    git clone https://github.com/TwoRavens/TwoRavens.git
    cd TwoRavens
    npm install
    
Follow the rest of the directions in the regular install [starting here](https://github.com/TwoRavens/TwoRavens/blob/master/docs/local_install.md#make-a-virtualenv-and-install-requirements).
