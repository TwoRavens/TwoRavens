LOCAL SETUP STEPS:
0. If on windows, use Ubuntu on a virtualbox to prevent this error:
      Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8000/custom/eventdataapp. (Reason: CORS header ‘Access-Control-Allow-Origin’ missing).

1. Install mongodb

2. Start a mongo server. Server port is 27017 by default
     sudo service mongod start

3. Create a new database using the mongoimport utility in the mongo bin (via cmd from ~/TwoRavens/)
     Import statements are in ./mongoimports.txt
     3a. To check that the csv data is available, run in new CMD:
         (connects to mongo server on default port, opens mongo prompt)
           mongo
      b. Switch to event_scrape database
           use event_data
      c. Return all data from the phoenix_events table
           db.cline_speed.find({})

4. Preprocess the event data by running ./preprocess.py. This script may take several hours to run.
     Note that mongod must be running, and pymongo must be installed in your python interpreter.

5. Start a local R server to make this file available here:
     http://localhost:8000/custom/eventdatasubsetapp

     4a. Install/run R, to enter R prompt
      b. Run source('rooksource.R') to start R server
         Note: Rook, the R package that runs the R server, does not seem to recognize file updates,
               so the server must be restarted after each edit.
      c. The RMongo package requires java - `sudo apt-get install default-jdk`

6. Submit query from local python server via eventdata web gui. This script will return the subsetted data

7. If you still have problems, try to permit CORS on your browser. This doesn't seem to work on Windows
     7a. Google Chrome: start with terminal argument
            google-chrome --disable-web-security
      b. Mozilla Firefox: in about:config settings
            security.fileuri.strict_origin_policy - set to False
NOTE: Use quit() to close the R server. Otherwise the ports will not correctly be released.
      If you use Rstudio, modify the IDE config so that it won't share the same port as the R server
