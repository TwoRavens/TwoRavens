
### (1) current JSON from UI:

```json
{
   "task_type":"regression",
   "task_subtype":"none",
   "output_type":"real",
   "metric":"rootMeanSquaredError"
}
```

### (2) JSON that maps exactly to `UpdateProblemSchemaRequest`:

This is the result of Google's gRPC -> JSON utility function.  

This can be run through the JSON -> gRPC utitlity and sent off to the TA2 service:
  
```json
{
   "updates":[
      {
         "taskType":"REGRESSION"
      },
      {
         "taskSubtype":"TASK_SUBTYPE_UNDEFINED"
      },
      {
         "outputType":"REAL"
      },
      {
         "metric":"ROOT_MEAN_SQUARED_ERROR"
      }
   ]
}
```

### (3) Updated JSON to construct in the front end.  

- This is similar to the original in (1)
- It uses the names such as "REGRESSION" that are straight from the proto file.
  - As a reference, here's the gRPC proto file: https://gitlab.datadrivendiscovery.org/d3m/ta3ta2-api/blob/devel/core.proto#L79

```
{  
   "taskType":"REGRESSION",
   "taskSubtype":"TASK_SUBTYPE_UNDEFINED",
   "outputType":"REAL",
   "metric":"ROOT_MEAN_SQUARED_ERROR"
}
```


### Summary:

- Frontend sends the JSON in (3)
- The server side (python):
  - converts it to the JSON in (2)
  - uses google's function to convert to gRPC, 
  - sends it off to TA2
