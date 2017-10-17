This note is for PipelineExecuteResult (in JSON format) and similar structures that contain Uris to result files.

Last month we decided to embed the contents of the result file(s) into the JSON response sent back to the UI.  For example:

- If you see a file uri:

```json
{
    "progressInfo": "COMPLETED",
    "pipelineId": "pipeline_1",
    "pipelineInfo": {
        "predictResultUris": [
           "file:///test_responses/files/samplePredReg.csv",
           "file:///file-not-there.csv"
        ],
    }
}
```

- Embed the results, in JSON format, under "predictResultData":

```json
{
   "progressInfo":"COMPLETED",
   "pipelineId":"pipeline_1",
   "pipelineInfo":{
      "predictResultUris":[
         "file:///test_responses/files/samplePredReg.csv",
         "file:///file-not-there.csv"
      ],
      "predictResultData":{
         "file_1":[
            {
               "preds":"36.17124"
            },
            {
               "preds":"29.85256"
            },
            {
               "preds":"30.35607"
            }
         ],
         "file_2" : "File not found: file:///file-not-there.csv"
      }
   }
}
```

However, an updated structure is needed in cases where:
  - A file is not found/reachable
  - The file is not a .csv (or other format that can be embedded)
  - The file is too large.  e.g. A threshold can be set.

For these cases, the return structure can be something similar to:

```json
{
   "progressInfo":"COMPLETED",
   "pipelineId":"pipeline_1",
   "pipelineInfo":{
      "predictResultUris":[
         "file:///test_responses/files/samplePredReg.csv",
         "file:///test_responses/files/file-not-found.csv",
         "file:///test_responses/files/cannot-open.csv",
         "file:///test_responses/files/wrong-type.sql",
         "file:///test_responses/files/giant-very-big-file.csv"
      ],
      "predictResultData":{
         "file_1":{
            "success":true,
            "data":[
               {
                  "preds":"36.17124"
               },
               {
                  "preds":"29.85256"
               },
               {
                  "preds":"30.35607"
               }
            ]
         },
         "file_2":{
            "success":false,
            "err_code":"FILE_NOT_FOUND",
            "message":"The file was not found."
         },
         "file_3":{
            "success":false,
            "err_code":"FILE_NOT_REACHABLE",
            "message":"The file exists but could not be opened."
         },
         "file_4":{
            "success":false,
            "err_code":"FILE_NOT_EMBEDDABLE",
            "message":"This file type could not be embedded.  The type was not .csv (or others)"
         },
         "file_5":{
            "success":false,
            "err_code":"FILE_TOO_LARGE_TO_EMBED",
            "message":"This file was too large to embed. Size was xxxx but the limit is xxxx."
         }
      }
   }
}
```
