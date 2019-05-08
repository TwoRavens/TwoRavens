
- Attempt at submission 2:

``{
   "datamart_id":0,
   "title":"Quality of governance indicators",
   "url":"http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv",
   "materialization":{
      "python_path":"general_materializer",
      "arguments":{
         "url":"http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv",
         "file_type":"csv",
         "index":0
      }
   },
   "variables":[
      {
         "datamart_id":1,
         "semantic_type":[

         ],
         "name":"vdem_delibdem",
         "description":"column name: vdem_delibdem, dtype: float64"
      },
      {
         "datamart_id":2,
         "semantic_type":[

         ],
         "name":"vdem_egaldem",
         "description":"column name: vdem_egaldem, dtype: float64"
      },
      {
         "datamart_id":3,
         "semantic_type":[

         ],
         "name":"vdem_gender",
         "description":"column name: vdem_gender, dtype: float64"
      },
      {
         "datamart_id":4,
         "semantic_type":[

         ],
         "name":"vdem_libdem",
         "description":"column name: vdem_libdem, dtype: float64"
      },
      {
         "datamart_id":5,
         "semantic_type":[

         ],
         "name":"vdem_mecorrpt",
         "description":"column name: vdem_mecorrpt, dtype: float64"
      },
      {
         "datamart_id":6,
         "semantic_type":[

         ],
         "name":"vdem_partipdem",
         "description":"column name: vdem_partipdem, dtype: float64"
      },
      {
         "datamart_id":7,
         "semantic_type":[

         ],
         "name":"vdem_polyarchy",
         "description":"column name: vdem_polyarchy, dtype: float64"
      },
      {
         "datamart_id":8,
         "semantic_type":[

         ],
         "name":"mycode",
         "description":"column name: mycode, dtype: int64"
      },
      {
         "datamart_id":9,
         "semantic_type":[

         ],
         "name":"year",
         "description":"column name: year, dtype: int64",
         "temporal_coverage":{
            "start":"1946-05-08T00:00:00",
            "end":"2017-05-08T00:00:00"
         }
      }
   ],
   "description":"Quality of governance indicators.  TwoRavens test dataset",
   "keywords":[
      "Quality",
      "Governance",
      "Indicators",
      "TwoRavensDataset"
   ]
}
```


- Attempt at submission 1:

```
{
   "datamart_id":0,
   "title":"Quality of governance indicators",
   "url":"http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv",
   "materialization":{
      "python_path":"general_materializer",
      "arguments":{
         "url":"http://metadata.2ravens.org/static/test-files/qog_vdem_indicators.csv",
         "file_type":"csv",
         "index":0
      }
   },
   "variables":[
      {
         "datamart_id":1,
         "semantic_type":[

         ],
         "name":"vdem_delibdem",
         "description":"column name: vdem_delibdem, dtype: float64"
      },
      {
         "datamart_id":2,
         "semantic_type":[

         ],
         "name":"vdem_egaldem",
         "description":"column name: vdem_egaldem, dtype: float64"
      },
      {
         "datamart_id":3,
         "semantic_type":[

         ],
         "name":"vdem_gender",
         "description":"column name: vdem_gender, dtype: float64"
      },
      {
         "datamart_id":4,
         "semantic_type":[

         ],
         "name":"vdem_libdem",
         "description":"column name: vdem_libdem, dtype: float64"
      },
      {
         "datamart_id":5,
         "semantic_type":[

         ],
         "name":"vdem_mecorrpt",
         "description":"column name: vdem_mecorrpt, dtype: float64"
      },
      {
         "datamart_id":6,
         "semantic_type":[

         ],
         "name":"vdem_partipdem",
         "description":"column name: vdem_partipdem, dtype: float64"
      },
      {
         "datamart_id":7,
         "semantic_type":[

         ],
         "name":"vdem_polyarchy",
         "description":"column name: vdem_polyarchy, dtype: float64"
      },
      {
         "datamart_id":8,
         "semantic_type":[

         ],
         "name":"mycode",
         "description":"column name: mycode, dtype: int64"
      },
      {
         "datamart_id":9,
         "semantic_type":[

         ],
         "name":"year",
         "description":"column name: year, dtype: int64",
         "temporal_coverage":{
            "start":"1946-05-08T00:00:00",
            "end":"2017-05-08T00:00:00"
         }
      }
   ],
   "description":"Quality of governance indicators",
   "keywords":[
      "governance",
      "quality",
      "indicators"
   ],
   "provenance":"TwoRavens test dataset"
}
```
