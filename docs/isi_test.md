
## Run against the ISI docker image

- Use the latest master as of 10/2, 3pm

### Terminal 1:  Run the ISI docker image

- Run this command substituting (raven path) with your local path to `../ravens_volume`:

```
docker run --rm --name isi_test  -v (raven path):/ravens_volume -v /tmp/dsbox-ta2:/tmp/dsbox-ta2 -p 50051:50051 registry.datadrivendiscovery.org/ta2/isi_ta2:python3
```

- Example with path filled in:

```
docker run --rm --name isi_test  -v /Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume_test:/ravens_volume -v /tmp/dsbox-ta2:/tmp/dsbox-ta2 -p 50051:50051 registry.datadrivendiscovery.org/ta2/isi_ta2:python3
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
