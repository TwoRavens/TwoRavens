Reference material for apache setup with Django and RApache


- File: `002-tworavens.conf`
    - Initial apache test file for use on a docker container running ubuntu 16.04

- File: `003-tworavens.conf`
    - Starting to integrate RApache code

- container commands to move new conf file

```
cp setup/apache-setup/003-tworavens.conf /etc/apache2/sites-enabled/
cp /etc/apache2/sites-enabled/003-tworavens.conf /etc/apache2/sites-available/
service apache2 restart
```
