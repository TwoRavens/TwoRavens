#!/bin/bash

# ------------------------------------
echo "--> apt-utils"
# ------------------------------------
apt-get -y update
apt-get install -y --no-install-recommends apt-utils

# ---------------------------------------------
# Install packages including git, apache2, and pip3
# ---------------------------------------------
# ---------------------------------------------
echo "--> Install basic packages"
# ---------------------------------------------
apt-get -y install vim
apt-get -y install wget
apt-get -y install net-tools
apt-get -y install bash

# ---------------------------------------------
echo "--> Needed for retrieving R packages"
# ---------------------------------------------
apt-get -y install libssl-dev
apt-get -y install libcurl4-openssl-dev
apt-get -y install libxml2-dev

# ---------------------------------------------
echo "--> To generate rook sessions numbers"
# ---------------------------------------------
apt-get -y install uuid-runtime

# ---------------------------------------------
echo "--> git"
# --------------------------------------------
apt-get -y install git

# ---------------------------------------------
echo "--> apache (fix later: apache2-dev - to get the apxs package for mod_wsgi)"
# --------------------------------------------
apt-get -y install apache2-dev apache2-doc apache2-utils

# ---------------------------------------------
echo "--> python3 (fix later: apache2-dev - to get the apxs package for mod_wsgi)"
# --------------------------------------------
apt-get -y install python3-pip
ln -sf /usr/bin/python3 /usr/bin/python


# ---------------------------------------------
echo "--> Clone the TwoRavens repository--the rp-django branch"
# ---------------------------------------------
mkdir -p /srv/webapps
cd /srv/webapps
git clone https://github.com/vjdorazio/TwoRavens.git
cd TwoRavens
git checkout rp-django
