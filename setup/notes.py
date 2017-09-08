
"""
#http://127.0.0.1:8080/?dfId=5221&host=beta.dataverse.org&key=(some key)

import requests

data = '''{"zdata":"fearonLaitin.tab","zedges":[["country","ccode"],["ccode","cname"]],"ztime":[],"znom":[],"zcross":[],"zmodel":"","zvars":["ccode","country","cname"],"zdv":[],"zdataurl":"https://dataverse.harvard.edu/api/access/datafile/3044420?key=","zsubset":[["",""],[],[]],"zsetx":[["",""],["",""],["",""]],"zmodelcount":0,"zplot":[],"zsessionid":"123","zdatacite":"Dataverse Team, 2015"}'''

url = 'http://0.0.0.0:8000/custom/dataapp'

app_data = dict(solaJSON=data)

r = requests.post(url, data=app_data)
r.text
r.status_code
"""
