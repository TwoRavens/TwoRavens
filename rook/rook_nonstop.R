# variation on http://jeffreyhorner.tumblr.com/post/33814488298/deploy-rook-apps-part-ii

source('rooksource_nonstop.R')

# Now make the console go to sleep. Of course the web server will still be
# running.
while (TRUE) {
  Sys.sleep(24 * 60 * 60) # restart every 24 hours
  source("rookzeligrestart.R")
}
# If we get here then the web server didn't start up properly
warning("Oops! Couldn't start Rook app")
