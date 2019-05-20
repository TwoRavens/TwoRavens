# Update problem doc

- **url:** `http://127.0.0.1:8080/d3m-service/write-user-problem`

### Example of success

- Input (right now this is any valid JSON)

```json
{  
    "taskType":"regression",
    "taskSubtype":"none",
    "outputType":"real",
    "metric":"rootMeanSquaredError"
}
```

- Output

```json
{
    "success": true,
    "message": "Problem written: /ravens_volume/test_output/d3m_output_185_baseball/user_problems_root/user_prob_185_ba_afxf_2018-01-31_21-07-15.json",
    "data": {
        "filepath": "/ravens_volume/test_output/d3m_output_185_baseball/user_problems_root/user_prob_185_ba_afxf_2018-01-31_21-07-15.json"
    }
}
```

### Example of failure

- Input (taskType is missing first quote)

```json
{  
    taskType":"regression",
    "taskSubtype":"none",
    "outputType":"real",
    "metric":"rootMeanSquaredError"
}
```

- Output

```json
{
    "success": false,
    "message": "Failed to convert request body to JSON: Expecting property name enclosed in double quotes: line 2 column 5 (char 8)"
}
```
