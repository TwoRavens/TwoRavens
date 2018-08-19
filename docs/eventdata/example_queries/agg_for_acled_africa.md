
- acled_africa aggregation:

```
db.acled_africa.aggregate(` + query + `)
```

```json
[{"$match":{"$and":[{"$and":[{"INTERACTION":{"$not":{"$in":["12","13","20","27","28","35","37"]}}},{"EVENT_DATE_constructed":{"$gte":{"$date":{"$numberLong":"1122304320000"}},"$lte":{"$date":{"$numberLong":"1428072507000"}}}}]},{}]}},{"$project":{"_id":0,"ISO":1,"EVENT_ID_CNTY":1,"EVENT_ID_NO_CNTY":1,"EVENT_DATE":1,"YEAR":1,"TIME_PRECISION":1,"EVENT_TYPE":1,"ACTOR1":1,"ASSOC_ACTOR_1":1,"INTER1":1,"ACTOR2":1,"ASSOC_ACTOR_2":1,"INTER2":1,"INTERACTION":1,"REGION":1,"COUNTRY":1,"ADMIN1":1,"ADMIN2":1,"ADMIN3":1,"LOCATION":1,"LATITUDE":1,"LONGITUDE":1,"GEO_PRECISION":1,"SOURCE":1,"SOURCE_SCALE":1,"NOTES":1,"FATALITIES":1,"TIMESTAMP":1}}]
```
