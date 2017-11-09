# Vagrant install

This is the only tested method to run TwoRavens on Windows, but works on anything with support for Vagrant. To get started:

1) download and install [Vagrant](https://www.vagrantup.com/downloads.html)
2) download and install [VirtualBox](https://www.virtualbox.org/wiki/Downloads)

(you almost certainly want the 64-bit versions)

Once Vagrant is installed, in the terminal enter:

    mkdir 2ravens 
    cd 2ravens 
    vagrant init
    vagrant box add hashicorp/xenial64
    vagrant box update
    vagrant up
    vagrant ssh
    
The last command boots you into a virtual machine running Ubuntu Linux. Now we need to install TwoRavens:

    sudo apt install libcurl4-openssl-dev libxml2-dev nodejs-legacy npm pkg-config python3-pip r-base
