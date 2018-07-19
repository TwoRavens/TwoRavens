7/18/2018

## OS X install (Rough notes)

- used brew to install Mongo
  - reference: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/
- Am running mongo manually for now:
    ```
    mongod --config /usr/local/etc/mongod.conf
    ```

## Loading from archived databases (easier)

- Collection files:
  - https://drive.google.com/open?id=18EOwNYVaOZt3wJM23RHybpiFCg80H6PP
- Load command
    ```
    mongorestore -d event_data --archive=path/to/file
    ```


## Loading csv collections

- Based on notes from @Shoeboxam notes.

### Dataset downloads

- Phoenix Data from the Cline Center
    - https://clinecenter.illinois.edu/project/machine-generated-event-data-projects/phoenix-data
    - Download the three datasets in the page above
- @Shoeboxam setup instructions:
    - https://github.com/TwoRavens/TwoRavens/tree/EventData_generalization/rook/eventdata/initialization
    - That README.md file is missing my formatting, the raw link is easier to read:
      - https://raw.githubusercontent.com/TwoRavens/TwoRavens/EventData_generalization/rook/eventdata/initialization/README.md
- Load collections to Mongo: `step 1_mongoimports.txt`
    - RP note: for the Phoenix datasets, I needed:
      1. Remove the header line:
          ```
          tail -n +2 PhoenixNYT_1945-2005.csv > PhoenixNYT.csv
          ```
      1. Use the resulting file for loading (e.g. PhoenixNYT.csv)
- To subset on dates:` 2_construct_dates.py`
- For now: skip filenames 3 and up




```
> show collections
cline_phoenix_fbis
cline_phoenix_nyt
> db.cline_phoenix_nyt.find().count()
1092211
> db.cline_phoenix_fbis.find().count(0
... )
817955
>
```
