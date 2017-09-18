FROM ubuntu:16.04
MAINTAINER Raman Prasad (raman_prasad@harvard.edu)

ADD VERSION .

# Install git and download TwoRavens repository
#
RUN apt-get update && \
    apt-get -y install git && \
    apt-get -y install vim && \
    apt-get -y install software-properties-common && \
    mkdir -p /app && \
    cd /app && \
    git clone https://github.com/vjdorazio/TwoRavens.git
#    cd TwoRavens && \
#    git checkout rp-django

# ----------------
# install more tools for R packages
# ----------------
RUN apt-get -y install libxml2-dev && \
    apt-get -y install libssh2-1-dev && \
    apt-get -y install libssl-dev && \
    apt-get -y install libcurl4-openssl-dev

# Install R & upgrade R to 3.4
#  ref: https://askubuntu.com/questions/909689/upgrading-r-version-3-3-in-ubuntu-16-04
#
RUN apt-get -y install r-base r-base-dev && \
    add-apt-repository ppa:marutter/rrutter && \
    apt -y update && \
    apt -y full-upgrade

# Install R packages for TwoRavens
#
RUN  R -e 'install.packages("Rcpp", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("VGAM", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("AER", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("dplyr", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("quantreg", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("geepack", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("maxLik", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("Rook", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("jsonlite", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("rjson", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("devtools", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("DescTools", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("nloptr", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("XML", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("Zelig", repos="http://cran.rstudio.org")'

#ADD rook-app.R /app/rook-app.R
#ADD run.R /app/run.R

EXPOSE 8000

WORKDIR /app/TwoRavens/rook

CMD Rscript /app/TwoRavens/rook/rook_nonstop.R
