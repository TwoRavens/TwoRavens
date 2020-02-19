FROM r-base:3.5.1
MAINTAINER Raman Prasad (raman_prasad@harvard.edu)

LABEL organization="Two Ravens" \
      2ra.vn.version="0.1-beta" \
      2ra.vn.release-date="2019-07-10" \
      description="Image for the base of the Two Ravens R service."

# ----------------------------------------------------
# This contains R and specific packages
# needed to run the TwoRavens rook application
#
# - The Image from this Dockerfile is used as a base
#   to copy in the Rook files and run the app in /rook
#
# ----------------------------------------------------

# -------------------------------------
# Install tools needed for R packages
# -------------------------------------
RUN apt-get update && \
    apt-get -y install apt-utils && \
    apt-get -y install libxml2-dev && \
    apt-get -y install libssh2-1-dev && \
    apt-get -y install libssl-dev && \
    apt-get -y install libcurl4-openssl-dev

# -------------------------------------
# Install Tex
# -------------------------------------
RUN apt-get -y install pandoc texlive-full && \
  tlmgr init-usertree

# -------------------------------------
# Install R packages for TwoRavens
# -------------------------------------
RUN  R -e 'install.packages("Rcpp", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("VGAM", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("dplyr", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("Amelia", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("Rook", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("jsonlite", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("devtools", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("DescTools", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("nloptr", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("XML", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("rpart", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("tidyverse", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("lubridate", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("data.table", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("stargazer", repos="http://cran.rstudio.org")' && \
    R -e 'install.packages("doParallel", repos="http://cran.rstudio.org")'


EXPOSE 8000
