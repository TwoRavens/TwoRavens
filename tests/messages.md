The following is a hypothetical set of messages from a user session for a D3M problem.


## Note on JSON's from the frontend:

The JSON's from the frontend are sent as strings.
The JSON strings currently have a name prepended as string to the JSON.   For example the estimate message has "solaJSON=" before the JSON
The quote character " actually comes as \"


## Note on Protocol Buffers to/from TA2:

The protocol buffers are encoded binary, so the representation below is not how they appear on the wire.

Note the standards are for messages to be CamelCase, fields to be lower_case_underscore_separated, and values to ALL_CAPS_UNDERSCORE_SEPARATED,
which helps in interpreting a little:
https://developers.google.com/protocol-buffers/docs/style


But the way I'm describing them seems to be a standard way to textually represent the decoded message.
You can interpret the following message:
```javascript
OneMessage{
	some_field = 3 : "HELLO"
}
```

to read as Message "A", send Field "b" with Value "3" which via the defined codebook enumerates to "HELLO"
Messages are made up of fields, which have predefined types.  However, the type of a field can itself be a message,
thus messages can be wrapped inside other messages such as:

```javascript
TwoMessage{
	ThreeMessage{
		field_d = "some string"            // a string
		field_e = 2 : "FAILED"             // an integer (2), that has an enumerated meaning ("FAILED"), given by the gRPC code
	}
	field_f = "something else"
}
```


Messages
========

## (A) Start Session

- Message [A1] from Django to TA2 to start session

```javascript
SessionRequest {
    user_agent = "TwoRavensUser";     // or some name ID for us
    version = "2017.8.23";            // version numbering for the protocol buffer defintion, which are presently release dates
}
```


- Message [A2] from TA2 to Django as response to [A1]

```javascript
SessionResponse {
    Response {                        // Note "Response" is a common message, used on it's own as a common response to a request, and here embedded with other details
		Status {
			code = 1 : OK
			details = ""
	}
}
    user_agent = "TheTA2Name";
    version = "2017.8.23";
    SessionContext{
    	session_id = "XYZ987"  // Some unique session identifier
    }
}
```

- **JSON format**: Message [A2] from TA2 to Django as response to [A1]

    ```json
    { "responseInfo": {
        "status": {
          "code": "OK"
        }
      },
      "userAgent": "ta2_stub 0.1",
      "version": "2017.9.x_pre",
      "context": {
        "sessionId": "f58p9t7"
      }
    }
    ```

## (B) update problem definition

- Message [B1] from Frontend to Django to update problem definition

```json
{  
    "taskType":"regression",
    "taskSubtype":"none",
    "outputType":"real",
    "metric":"rootMeanSquaredError"
}
```

- Message [B2] from Django to TA2 to update problem definition

```javascript
UpdateProblemSchemaRequest{
		ReplaceProblemSchemaFieldField{
			task_type = 2 : "REGRESSION"
		},
		ReplaceProblemSchemaFieldField{
			task_subtype = 1 : "NONE"
		},
		ReplaceProblemSchemaFieldField{
			output_type = 3 : "REAL"
		},
		ReplaceProblemSchemaFieldField{
			metric_type = 11 : "ROOT_MEAN_SQUARED_ERROR"
		}
}
```

- Message [B3] from TA2 to Django, as possible response to message [B2]

```javascript
Response {  
	Status {
		code = 1 : OK
		details = ""
	}
}
```

- Message [B4] as possible reponse from Django to frontend  (presently nothing like this exists or is expected from frontend)

```json
{
	"status": {
		"code": "ok",
		"details": ""
	}
}
```

## (C) Estimate model/create pipeline


- Message [C1] from Frontend to Django to find solution (estimate model/create pipeline)

```json
{  
    "zdata":"o_196seed",
    "zedges":[  
        [  
            "horsepower",
            "class"
        ]
    ],
    "ztime":[  

    ],
    "znom":[  

    ],
    "zcross":[  

    ],
    "zmodel":"ls",
    "zvars":[  
        "cylinders",
        "displacement",
        "horsepower",
        "weight",
        "acceleration",
        "model",
        "origin",
        "class"
    ],
    "zdv":[  
        "class"
    ],
    "zgroup1":[  
        "cylinders",
        "displacement",
        "horsepower",
        "weight",
        "acceleration",
        "model",
        "origin"
    ],
    "zgroup2":[  

    ],
    "zdataurl":"data/d3m/o_196seed/data/trainDatamerged.tsv",
    "zsubset":[  
        [  

        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  

        ],
        [  
            "",
            ""
        ]
    ],
    "zsetx":[  
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ],
        [  
            "",
            ""
        ]
    ],
    "zmodelcount":0,
    "zplot":[  

    ],
    "zsessionid":"3669CFF3-78C2-4487-AE4C-DADEDDEEBD75",
    "zdatacite":"Dataverse,
    Admin,
    2015,
    \"Smoke test\",
    http://dx.doi.org/10.5072/FK2/WNCZ16,
    Root Dataverse,
    V1    [  
        UNF:6:iuFERYJSwTaovVDvwBwsxQ==
    ]    ",
    "callHistory":[  

    ]
}
```



- Message [C2] from Django to TA2 to find solution
  - (this is the RPC CreatePipelines call)

```javascript
message PipelineCreateRequest {
    SessionContext{
    	session_id = "XYZ987"  // Some unique session identifier
    }
    feature_id = "some name"; // id of feature within dataset
    data_uri = "some uri";   // uri of dataset containing feature
    task = 2 : "REGRESSION"
    task_subtype = 1 : "NONE"
    output_type = 3 : "REAL"
    metric_type = 11 : "ROOT_MEAN_SQUARED_ERROR"
    task_description = "";
    output_type = 3 : "REAL"
    metrics = 11 : "ROOT_MEAN_SQUARED_ERROR";           // specify a list of evaluation metrics
    target_features = [8,11,15]; 						// specify a list of targets to predict
    max_pipelines = 1;              					// maximum number of pipelines to return
}
```

- Message [C3a] from TA2 to Django, as possible response to message [C2], as pipeline starts
  - (this is a possible response to the RPC ExecutePipelines call)

// Message []

```javascript
message PipelineCreateResult {
    Response {                 // This is the standard response message we often see
		Status {
			code = 0 : OK
			details = ""
		}
	}
    progress_info = 1 : "RUNNING";
    string pipeline_id = "ABC123";   //some unique id string
    message Pipeline {       	// sent when pipeline finished - default values otherwise, as below
    	repeated string predict_result_uris = 0;  // output path to predicted results on training data
    	output = 0;
    	scores {
    		metric = 11 : "MEAN_SQUARED_ERROR";
    		value = 0;
		}
	}
}
```

- Message [C3a] from TA2 to Django, as possible response to message [C2], as pipeline starts
  - (this is the final response to the RPC ExecutePipelines call)

```javascript
message PipelineCreateResult {
	Response {                 // This reponse message might be omitted second time,
		Status {               // in which case it would come across as default values
			code = 0 : OK      // which are still 0:OK and empty string ""
			details = ""
		}
	}
	progress_info = 3 : "COMPLETED";
    string pipeline_id = "ABC123";   //some unique id string
    message Pipeline {       	// sent when pipeline finished
    	repeated string predict_result_uris = 1;  // output path to predicted results on training data
    	output = 3 : REAL;
    	scores {
    		metric = 11 : "MEAN_SQUARED_ERROR";
    		value = 2345.7;
		}
	}
}
```


- Message [C4] from Django to Frontend passing on information from [C3]
  - Do not know what this should look like presently.
