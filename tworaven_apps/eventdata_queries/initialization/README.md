Updated process for MID/GED/GTD/Terrier datasets:
0. verify that all columns in the dataset consist of atomic data. if not, split the data entry so it is atomic
1. construct the date columns (see 2_construct_dates.py and date_standardization.py)
	resulting columns:	TwoRavens_start date
						TwoRavens_end date
						TwoRavens_date info
2. construct the location columns (see scripts 3-8, and refer to the ones wiht *new.py)
	minimum resulting columns:	TwoRavens_country
								TwoRavens_country_historic (if date present and original regional data present)
3. construct actor columns if countries used as source/targets
	minimum resulting columns:	TwoRavens_country_src
								TwoRavens_country_tgt
								TwoRavens_country_historic_src
								TwoRavens_country_historic_tgt
4. export the database: mongodump -d event_data -c <COLLECTION> --archive=<PATH TO DUMP FILE> --gzip
5. scp the dump files to the remote server: scp <PATH TO DUMP FILE> <SERVER>:<PATH TO DUMP>
6. restore the dump files: mongorestore --archive=<PATH TO ARCHIVE> --gzip --nsFrom "<ORIGINAL DB.*" --nsTo "<NEW DB>.*"

For datasets that do not have an aggregated field (eg Terrier's actor fields), to create one by merging existing fields, use:
db.<collection>.aggregate([{$addFields: {"TwoRavens_source_actor": {$concat: ["$<field1>", "$<field2>", ...]}, "TwoRavens_target_actor": {$concat: ["$<field3>", "$<field4>", ...]}}}, {$out: "<collection>"}])

LOCAL SETUP STEPS:
0. If on windows, use Ubuntu on a virtualbox to prevent this error:
      Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8000/custom/eventdataapp. (Reason: CORS header ‘Access-Control-Allow-Origin’ missing).

1. Install mongodb. Queries are tested to work on version 3.6, but 4.0 should not break compatibility.
    NOTE: for Ubuntu DO NOT do the obvious `sudo apt-get install mongo`, that package is unofficial. Use this link:
    https://docs.mongodb.com/manual/administration/install-community/

2. Start a mongo server. Server port is 27017 by default
     run `mongod` or if that doesn't work, `sudo service mongod start`
     If you get an error about `/data/db`, then create the folder `/data/db` in the root directory.

3. Create a new database using the mongoimport utility in the mongo bin (via cmd from ~/TwoRavens/)
     Import statements are in ./1_mongoimports.txt
     3a. To check that the csv data is available, run in new CMD:
         (connects to mongo server on default port, opens mongo prompt)
           mongo
      b. Switch to event_scrape database
           use event_data
      c. Return all data from the phoenix_events table
           db.cline_speed.find({})

4. Construct date and location columns. Follow the filename steps in this folder.
     Note that mongod must be running, and pymongo must be installed in your python interpreter. Python 3 features were used.
     Note the data for constructing location columns is stored in a mongoexport file that is not in this repository.
     If you are just doing a local setup, then skip scripts 3-7 and just run 8.
     Scripts 3-6 are for constructing arcgis locations, and 7 is for applying them to your datasets.
     Step 8 will fill in missing country fields from steps 3-7, but is sufficient alone to be able to run a local setup.

5. Run 'fab run_eventdata_dev' to get Django running. Requests for data pass through endpoints in `/tworavens_apps/eventdata_queries/`

6. If you still have problems, try to permit CORS on your browser. This doesn't seem to work on Windows
     7a. Google Chrome: start with terminal argument
            google-chrome --disable-web-security
      b. Mozilla Firefox: in about:config settings
            security.fileuri.strict_origin_policy - set to False
