FROM ubuntu:16.04
MAINTAINER Raman Prasad (raman_prasad@harvard.edu)

ENV DEBIAN_FRONTEND noninteractive

# For TwoRavens
RUN apt-get -y update && \
    apt-get install -y --no-install-recommends apt-utils

# ---------------------------------------------
# Install packages including git, apache2, and pip3
# ---------------------------------------------
RUN apt-get -y install vim && \
    apt-get -y install wget && \
    apt-get -y install net-tools && \
    apt-get -y install libssl-dev && \
    apt-get -y install libcurl4-openssl-dev && \
    apt-get -y install libxml2-dev && \
    apt-get -y install uuid-runtime && \
    apt-get -y install git && \
    apt-get -y install apache2 apache2-doc apache2-utils && \
    apt-get -y install python3-pip && \
    pip3 install --upgrade pip

# ---------------------------------------------
# Install RApache
# ---------------------------------------------
RUN apt-get install software-properties-common python-software-properties && \
    add-apt-repository ppa:opencpu/rapache && \
    apt-get install libapache2-mod-r-base

# for testing
#RUN apt-get -y install apache2 apache2-doc apache2-utils

# Clone the TwoRavens repository--the "rp-django" branch
RUN mkdir /srv/webapps && \
    cd /srv/webapps && \
    git clone https://github.com/vjdorazio/TwoRavens.git && \
    cd TwoRavens && \
    git checkout rp-django

# Install additional R libraries
RUN cd /srv/webapps/TwoRavens/setup/r-setup && \
    ./r-setup.sh 


# ---------------------------------------------
# Configure Apache
# Put new .conf files in place and restart
# ---------------------------------------------
COPY setup/apache-setup/003-tworavens.conf /etc/apache2/sites-available
COPY setup/apache-setup/ports.conf /etc/apache2/

RUN a2dissite 000-default; a2ensite 003-tworavens.conf; service apache2 reload

EXPOSE 8080



ENV DEBIAN_FRONTEND teletype
