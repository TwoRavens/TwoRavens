#!/bin/bash

# ---------------------------------------------
# Install packages including git, apache2, and pip3
# ---------------------------------------------

echo "# ---------------------------------------------"
echo "--> Install basic packages"
echo "# ---------------------------------------------"
apt-get -y install vim
apt-get -y install wget
apt-get -y install net-tools
apt-get -y install bash

echo "# ---------------------------------------------"
echo "--> Needed for retrieving R packages"
echo "# ---------------------------------------------"
apt-get -y install libssl-dev
apt-get -y install libcurl4-openssl-dev
apt-get -y install libxml2-dev

echo "# ---------------------------------------------"
echo "--> To generate rook sessions numbers"
echo "# ---------------------------------------------"
apt-get -y install uuid-runtime

echo "# ---------------------------------------------"
echo "--> apache (fix later: apache2-dev - to get the apxs package for mod_wsgi)"
# --------------------------------------------
apt-get -y install apache2 apache2-dev apache2-doc apache2-utils

echo "# ---------------------------------------------"
echo "--> python3"
echo "# ---------------------------------------------"
apt-get -y install python3-pip
ln -sf /usr/bin/python3 /usr/bin/python
