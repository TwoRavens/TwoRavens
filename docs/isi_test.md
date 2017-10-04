
## Run against the ISI docker image

### Bind the /ravens_volume directory

#### Make symlink

This allows the locally running TwoRavens to access ravens_volume as `/ravens_volume`
  - Find the fullpath to your directory ../TwoRavens/ravens_volume
  - `cd /; sudo ln -s (full path)/ravens_volume .`
    - example:
      - `cd /`
      - `sudo ln -s /Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume .`
  - `chmod -R +r /ravens_volume`

The new `/ravens_volume` "directory" needs to be cleared via Docker
  - Open the Docker application (Mac)
  - Go to "Preferences"
  - Select File Sharing
  - Click "+"
  - Add "" `/ravens_volume`


### Terminal 1:  Run the ISI docker image

- Run this command:

```
docker run --rm --name isi_test  -v /ravens_volume:/ravens_volume -v /tmp/dsbox-ta2:/tmp/dsbox-ta2 -p 50051:50051 registry.datadrivendiscovery.org/ta2/isi_ta2:python3
```


### Terminal 2: Run TwoRavens

- cd into TwoRavens, then:
1. `workon 2ravens`
2. `export TA2_STATIC_TEST_MODE=False`
3. `fab run`

- Note: To switch back to canned responses:
1. stop this Terminal
2. `export TA2_STATIC_TEST_MODE=True`
3. `fab run`

### Stopping the ISI TA2:

- in a new Terminal
```
docker stop isi_test
```
  - This will take a few seconds

- clearing out ISI data
  - `rm -rf /tmp/dsbox-ta2`


### Create pipelines test call

- Note: Use a valid session id

```json
{
   "context":{
      "session_id":"390c1687-0596-4484-9fc7-7e42d5aaecec"
   },
   "trainFeatures":[
      {
         "featureId":"cylinders",
         "dataUri":"/ravens_volume/test_data/o_196seed/data"
      },
      {
         "featureId":"displacement",
         "dataUri":"/ravens_volume/test_data/o_196seed/data"
      },
      {
         "featureId":"horsepower",
         "dataUri":"/ravens_volume/test_data/o_196seed/data"
      },
      {
         "featureId":"weight",
         "dataUri":"/ravens_volume/test_data/o_196seed/data"
      },
      {
         "featureId":"acceleration",
         "dataUri":"/ravens_volume/test_data/o_196seed/data"
      },
      {
         "featureId":"model",
         "dataUri":"/ravens_volume/test_data/o_196seed/data"
      },
      {
         "featureId":"origin",
         "dataUri":"/ravens_volume/test_data/o_196seed/data"
      }
   ],
   "task":"REGRESSION",
   "taskSubtype":"UNIVARIATE",
   "output":"REAL",
   "metrics":[
      "ROOT_MEAN_SQUARED_ERROR"
   ],
   "targetFeatures":[
      {
         "featureId":"class",
         "dataUri":"/ravens_volume/test_data/o_196seed/data"
      }
   ],
   "maxPipelines":10
}
```
