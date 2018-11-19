# variation on http://jeffreyhorner.tumblr.com/post/33814488298/deploy-rook-apps-part-ii

source('rooksource.R')

# Now make the console go to sleep. Of course the web server will still be
# running.
while (TRUE) {
  print('(> rook restarts are every 1 hour)')
  #Sys.sleep(1 * 60 * 1) # restart every 1 minute
  Sys.sleep(1 * 60 * 60) # restart every 1 hour

  print('> begin rook restart...')
  source("rookzeligrestart.R")

}
# If we get here then the web server didn't start up properly
warning("Oops! Couldn't start Rook app")
