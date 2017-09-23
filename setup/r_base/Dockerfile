FROM r-base:3.4.1
MAINTAINER Raman Prasad (raman_prasad@harvard.edu)

LABEL organization="Two Ravens" \
      2ra.vn.version="0.0.1-beta" \
      2ra.vn.release-date="2017-09-20" \
      description="Used as a base to build the Two Ravens R service."

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
    apt-get install -y \
    libcurl4-openssl-dev \
    libssh2-1-dev \
    libssl-dev \
    libxml2-dev

# -------------------------------------
# Install R packages for TwoRavens
# -------------------------------------
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


EXPOSE 8000
