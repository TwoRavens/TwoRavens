FROM tworavens/r-service-base:latest
MAINTAINER Raman Prasad (raman_prasad@harvard.edu)

LABEL organization="Two Ravens" \
      2ra.vn.version="0.1-alpha" \
      2ra.vn.release-date="2019-01-4" \
      description="Image for the Two Ravens R service which runs on rook."

RUN  R -e 'install.packages("doParallel", repos="http://cran.rstudio.org")'

# -------------------------------------
# Copy the repo over
#   - future: ignore the tworavens django dirs
#     and assets, be more selective
# -------------------------------------
RUN mkdir -p /var/webapps/TwoRavens && \
    mkdir -p /var/webapps/TwoRavens/assets && \
    mkdir -p /ravens_volume

# Copy over the repository
COPY ./rook /var/webapps/TwoRavens/rook
COPY ./LICENSE /var/webapps/TwoRavens
COPY ./README.md /var/webapps/TwoRavens


# -------------------------------------
# Set production environment variable
# -------------------------------------
ENV ROOK_USE_PRODUCTION_MODE=yes

# -------------------------------------
# Create a volume for outside info
# -------------------------------------
VOLUME /ravens_volume

# -------------------------------------
# Expose port for the web (rook)
# -------------------------------------
EXPOSE 8000

WORKDIR /var/webapps/TwoRavens/rook

# -------------------------------------
# Run django with "rook_nonstop.R"
# -------------------------------------
CMD Rscript rook_nonstop.R

# -----------------------------------------
# -- Dev notes --
#
# build local:
# >docker build -t rook1 -f ./Dockerfile-r-service .
#
# shell access:
# >docker run -ti  -p 8000:8000 rook1 /usr/bin/bash
#
# run app
# >docker run -p 8000:8000 rook1
# go to: http://0.0.0.0:8000/subsetapp
# -----------------------------------------
