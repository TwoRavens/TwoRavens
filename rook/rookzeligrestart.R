##
##  rookzeligrestart.r
##
##  simple restart of the R.server
##

print('> restart step 1')
#R.server$stop()
R.server$remove(all=TRUE)
rm(list=ls())

print('> restart step 2')
source("rooksource.R")
