# this is used to import gtd countries into the countries file as well standardizing all conversions between all standards

import json
import sys
import os
import pandas as pd
import numpy as np
import warnings

cowcodes = pd.read_csv("../alignments/COWcodes.csv")
print("cow orig shape")
print(cowcodes.drop_duplicates().shape)
    
frame = pd.read_json(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'alignments', 'country2.json')))
frame = frame.fillna("-1")
print("frame orig shape")
print(frame.drop_duplicates().shape)

#add existing data into cowcodes
cowcodes = cowcodes.join(frame.set_index(["cowcode"]), on="CCode")
for index, row in cowcodes.iterrows():
	if row["ICEWS"] == "-1":
		row["ICEWS"] = row["StateNme"]

#get observations for missing info
cowcodes = cowcodes.drop_duplicates()
#print(cowcodes.loc[cowcodes["region"] == "-1"])
'''
    StateAbb  CCode                    StateNme ICEWS ISO-3 UN M.49 gwcode  \region(-1)
55       HAN    240                     Hanover    -1    -1      -1     -1   
56       BAV    245                     Bavaria    -1    -1      -1     -1   
59       GFR    260     German Federal Republic    -1    -1      -1     -1   
60       GDR    265  German Democratic Republic    -1    -1      -1     -1   
61       BAD    267                       Baden    -1    -1      -1     -1   
62       SAX    269                      Saxony    -1    -1      -1     -1   
63       WRT    271                Wuerttemburg    -1    -1      -1     -1   
64       HSE    273             Hesse Electoral    -1    -1      -1     -1   
65       HSG    275           Hesse Grand Ducal    -1    -1      -1     -1   
66       MEC    280        Mecklenburg Schwerin    -1    -1      -1     -1   
69       AUH    300             Austria-Hungary    -1    -1      -1     -1   
73       CZE    315              Czechoslovakia    -1    -1      -1     -1   
78       PAP    327                Papal States    -1    -1      -1     -1   
79       SIC    329                Two Sicilies    -1    -1      -1     -1   
81       MOD    332                      Modena    -1    -1      -1     -1   
82       PMA    335                       Parma    -1    -1      -1     -1   
83       TUS    337                     Tuscany    -1    -1      -1     -1   
87       MNG    341                  Montenegro    -1    -1      -1     -1   
90       YUG    345                  Yugoslavia    -1    -1      -1     -1   
93       KOS    347                      Kosovo    -1    -1      -1     -1   
147      ZAN    511                    Zanzibar    -1    -1      -1     -1   
188      YAR    678         Yemen Arab Republic    -1    -1      -1     -1   
190      YPR    680     Yemen People's Republic    -1    -1      -1     -1   
205      KOR    730                       Korea    -1    -1      -1     -1   
222      RVN    817         Republic of Vietnam    -1    -1      -1     -1
'''
montenegroVals = {"ICEWS":"Montenegro","ISO-3":"MNE","UN M.49":"499","region":"Southern Europe","gwcode":"341"}
#COW does not have a Serbia entry; add one here: I made up COW StateAbb and CCode
serbiaVals = {"StateAbb":"SRB","CCode":"342","StateNme":"Serbia","ICEWS":"Serbia","ISO-3":"SRB","UN M.49":"688","region":"Southern Europe","gwcode":"340"}
cowcodes = cowcodes.append(serbiaVals, ignore_index=True)
kosovoVals = {"ICEWS":"Kosovo","ISO-3":"XKX","UN M.49":"412","region":"Southern Europe","gwcode":"347"}
for col in ["ICEWS", "ISO-3", "UN M.49", "gwcode", "region"]:
	val = cowcodes[col].loc[cowcodes["StateAbb"] == "GMY"].values
	for ctry in ["HAN", "BAV", "GFR", "GDR", "BAD", "SAX", "WRT", "HSE", "HSG", "MEC"]:
		cowcodes.loc[cowcodes["StateAbb"] == ctry, col] = val

	#Austria-Hungary is Western/Eastern Europe; I defaulted to West (Austria) since we do not have a "Central Europe"
	val = cowcodes[col].loc[cowcodes["StateAbb"] == "AUS"].values
	cowcodes.loc[cowcodes["StateAbb"] == "AUH", col] = val

	val = cowcodes[col].loc[cowcodes["StateAbb"] == "CZR"].values
	cowcodes.loc[cowcodes["StateAbb"] == "CZE", col] = val

	val = cowcodes[col].loc[cowcodes["StateAbb"] == "ITA"].values
	for ctry in ["PAP", "SIC", "MOD", "PMA", "TUS"]:
		cowcodes.loc[cowcodes["StateAbb"] == ctry, col] = val

	for ctry in ["MNG", "YUG"]:		#UN does not have YUG, so I default to MNG
		cowcodes.loc[cowcodes["StateAbb"] == ctry, col] = montenegroVals[col]

	#Kosovo entry
	cowcodes.loc[cowcodes["StateAbb"] == "KOS", col] = kosovoVals[col]

	val = cowcodes[col].loc[cowcodes["StateAbb"] == "TAZ"].values
	cowcodes.loc[cowcodes["StateAbb"] == "ZAN", col] = val

	val = cowcodes[col].loc[cowcodes["StateAbb"] == "YEM"].values
	for ctry in ["YAR", "YPR"]:
		cowcodes.loc[cowcodes["StateAbb"] == ctry, col] = val

	val = cowcodes[col].loc[cowcodes["StateAbb"] == "ROK"].values
	cowcodes.loc[cowcodes["StateAbb"] == "KOR", col] = val

	val = cowcodes[col].loc[cowcodes["StateAbb"] == "DRV"].values
	cowcodes.loc[cowcodes["StateAbb"] == "RVN", col] = val

print()
#~ print(cowcodes.to_string())
print("cow shape after join")
print(cowcodes.shape)
#~ print(cowcodes.loc[cowcodes["StateNme"] != cowcodes["ICEWS"]].to_string())

#~ print(cowcodes.to_string())
print()

#add missing data from original frame in
cowcodes = cowcodes.rename({"StateAbb":"cState","CCode":"cCode","StateNme":"cName","ICEWS":"cICEWS", "ISO-3":"cISO", "UN M.49":"cUN", "gwcode":"cGW","region":"cregion"}, axis="columns")
result = frame.join(cowcodes.set_index(["cISO"]), on="ISO-3").drop_duplicates().reset_index(drop=True)
#~ print(result.to_string())

print("result join shape")
print(result.shape)
#~ print()

print("diff shapes")
#~ print(result.loc[result["cregion"] != result["region"]].shape)
#~ print(result.loc[result["cCode"] != result["cowcode"]].shape)
#~ print(result.loc[result["cICEWS"] != result["ICEWS"]].shape)

count = 0
existCOW = []
newCOW = 0
mapICEWS = []
#inline update of Kosovo entry (bad data from original country2.json file)
result.loc[result["ISO-3"] == "XKX", "UN M.49"] = "412"
result.loc[result["ISO-3"] == "XKX", "cowcode"] = "347"
result.loc[result["ISO-3"] == "XKX", "gwcode"] = "347"
result = result.drop(["cICEWS","cUN","cGW","cregion"], axis=1).drop_duplicates()
#~ print(result.to_string())
result = result.fillna("-1")
for index,row in result.iterrows():
	for col in list(result):
		if row[col] == "-1" or row[col] == -1:
			count += 1
			#~ print(result.iloc[[index]].to_string())
			if col == "cowcode":
				val = str(row["ISO-3"])
				mapICEWS.append(val)
				#~ print(val)
				for val in mapICEWS:
					if result.loc[result["cowcode"].astype(str) == val].shape[0] > 0:
						existCOW.append(val)
				else:
					newCOW += 1
			else:
				print(result.iloc[[index]].to_string())
			break
print("count of nulls: ", count)
#~ print(list(result))
print("result shape after joining COW with orig")
print(result.shape)
print("existing COWs: ", existCOW)
print("number of newCOW: ", newCOW)

'''
extra entries:
ICEWS: (these do not match in ICEWS dataset
	Virgin Islands, British -> British Virgin Islands
	Virgin Islands, U.S. -> U.S. Virgin Islands
	Saint Martin -> Saint Martin (French Part)
	Macedonia -> the former Yugoslav Republic of Macedonia	
new codes for ISO-3 and COW: (StateName, COW, COWCode, ISO-3, UN M.49)
	Curaçao	CUW	208 CUW	530	#country from Netherlands Antilles (ISO-3: ANT) after dissolution
	Sint Maarten	SXM	206	SXM	664	#constituent country of Netherlands
'''

result.loc[result["ICEWS"] == "Virgin Islands, British", "ICEWS"] = "British Virgin Islands"
result.loc[result["ICEWS"] == "Virgin Islands, U.S.", "ICEWS"] = "U.S. Virgin Islands"
result.loc[result["ICEWS"] == "Saint Martin", "ICEWS"] = "Saint Martin (French Part)"
result.loc[result["ICEWS"] == "Macedonia", "ICEWS"] = "the former Yugoslav Republic of Macedonia"
#Curaçao
result.loc[result["ISO-3"] == "CUW", "UN M.49"] = "530"
result.loc[result["ISO-3"] == "CUW", "cState"] = "CUW"
result.loc[result["ISO-3"] == "CUW", "cCode"] = "208"
result.loc[result["ISO-3"] == "CUW", "cName"] = "Curaçao"
#Sint Maarten
result.loc[result["ISO-3"] == "SXM", "UN M.49"] = "664"
result.loc[result["ISO-3"] == "SXM", "cState"] = "SXM"
result.loc[result["ISO-3"] == "SXM", "cCode"] = "206"
result.loc[result["ISO-3"] == "SXM", "cName"] = "Sint Maarten"

print(mapICEWS)
""" these are the missing COW codes found in ISO-3 (have an ISO code but no COW code)
['MYT', 'REU', 'ESH', 'SHN', 'BMU', 'GRL', 'SPM', 'BVT', 'FLK', 'GUF', 'SGS', 'HKG', 'MAC', 'CCK', 'CXR', 'IOT', 'PSE', 'ABW', 'AIA', 'ANT', 'BLM', 'CYM', 'GLP', 'MAF', 'MSR', 'MTQ', 'PRI', 'TCA', 'VGB', 'VIR', 'ALA', 'FRO', 'GGY', 'IMN', 'JEY', 'SJM', 'GIB', 'MNE', 'MNE', 'SRB', 'VAT', 'ASM', 'COK', 'GUM', 'MNP', 'NCL', 'NFK', 'NIU', 'PCN', 'PYF', 'TKL', 'UMI', 'WLF', 'ATA', 'ATF', 'HMD']

I will use the ISO as COW
check MAC (ISO)(Macedonia)
"""
result = result.drop(["cowcode", "gwcode"], axis=1)
#~ result = result.drop(["cowcode"], axis=1)
print(result.to_string())

mapICEWS.remove("MNE")
mapICEWS.remove("MNE")
#format: ISO: [COW, COWCode]
newCOWCodes = {
	"PRI": ["PRI", 3],
	"VIR": ["VIR", 4],
	"ASM": ["ASM", 5],
	"GUM": ["GUM", 6],
	"MNP": ["MNP", 7],
	"UMI": ["UMI", 8],
	"JEY": ["JEY", 203],
	"IMN": ["IMN", 202],
	"GGY": ["GGY", 201],
	"SHN": ["SHN", 199],
	"BMU": ["BMU", 198],
	"FLK": ["FLK", 197],
	"SGS": ["SGS", 196],
	"IOT": ["IOT", 195],
	"AIA": ["AIA", 194],
	"CYM": ["CYM", 193],
	"MSR": ["MSR", 192],
	"TCA": ["TCA", 191],
	"VGB": ["VGB", 190],
	"GIB": ["GIB", 189],
	"PCN": ["PCN", 188],
	"ANT": ["ANT", 209],
	"ABW": ["ABW", 207],
	"MYT": ["MYT", 219],
	"REU": ["REU", 218],
	"SPM": ["SPM", 217],
	"GUF": ["GUF", 216],
	"BLM": ["BLM", 215],
	"MAF": ["MAF", 214],
	"NCL": ["NCL", 213],
	"GLP": ["GLP", 170],
	"MTQ": ["MTQ", 171],
	"PYF": ["PYF", 172],
	"WLF": ["WLF", 173],
	"ATF": ["ATF", 174],
	"VAT": ["VAT", 324],
	"SRB": ["SRB", 342],
	"ALA": ["ALA", 374],
	"BVT": ["BVT", 384],
	"SJM": ["SJM", 383],
	"GRL": ["GRL", 389],
	"FRO": ["FRO", 388],
	"ESH": ["ESH", 599],
	"PSE": ["PSE", 665],
	"HKG": ["HKG", 709],
	"MAC": ["MCA", 708],
	"CCK": ["CCK", 899],
	"CXR": ["CXR", 898],
	"NFK": ["NFK", 897],
	"HMD": ["HMD", 896],
	"COK": ["COK", 919],
	"NIU": ["NIU", 918],
	"TKL": ["TKL", 917],
	"ATA": ["ATA", 999],
}
print(len(newCOWCodes), " ", len(mapICEWS))
for cow in mapICEWS:
	for i, col in enumerate(["cState", "cCode"]):
		result.loc[result["ISO-3"] == cow, col] = newCOWCodes[cow][i]
	result.loc[result["ISO-3"] == cow, "cName"] = result.loc[result["ISO-3"] == cow, "ICEWS"].values


print(result.loc[result["ISO-3"] == "MAC"].to_string())
print(result.loc[result["ISO-3"] == "MNE"].to_string())
print(result.loc[result["ISO-3"] == "MYT"].to_string())
print(result.loc[result["cState"] == "TAZ"].to_string())
print(result.loc[result["cState"] == "ZAN"].to_string())
print(result.loc[result["ISO-3"] == "TZA"].to_string())

result = result.reset_index(drop=True).fillna("-1")
orig = result
print(result.to_string())
print(result.shape)

print()
print()

#check all original values in result
allOriginal = frame["ISO-3"].values
for val in allOriginal:
	if val not in result["ISO-3"].values:
		print(val, " ", frame.loc[frame["ISO-3"] == val, "ISO-3"].to_string())
#output:
#BVI	169	BVI
#OK because invalid
result = result.loc[result["ISO-3"] != "BVI"]	#drop row with ISO-3 = BVI; this is not valid

#insert gwCodes
gwCodes = pd.read_csv("../alignments/gwCodes.csv")#.drop("country_name", axis=1)
print("gwcodes")
gwCodes = gwCodes.drop_duplicates()
gwCodes = gwCodes.loc[gwCodes["country_name"] != "Madagascar (Malagasy)"]
result = result.join(gwCodes.set_index(["iso3c"]), on="cState").drop_duplicates().reset_index(drop=True).fillna("-1")
print(result.to_string())
print(result.shape)

missingGW = []
noMatch = []
diffGW = []
for index, row in result.iterrows():
	if row["gwcode"] == "-1" or row["gwcode"] == -1:
		missingGW.append(row["cCode"])
		if row["cCode"] in gwCodes["gwcode"].values:
			noMatch.append(row["cCode"])
	elif row["cName"] != row["country_name"]:
		diffGW.append((row["cName"], row["country_name"]))
print(missingGW)
print(noMatch)
'''
output:
[219, 218, 599, 199, 198, 389, 217, 384, 197, 216, 196, 709, 708, 899, 898, 195, 665, 678, 207, 194, 209, 215, 193, 170, 214, 192, 171, 3, 191, 190, 4, '208', '206', 360, 374, 388, 201, 202, 203, 383, 189, 342, 324, 275, 5, 919, 950, 6, 946, 7, 213, 897, 918, 188, 172, 917, 8, 173, 999, 174, 896]
[678, 360, 275, 950]
678 = Yemen Arab Republic
360 = Romania
275 = Hesse Grand Ducal
950 = Fiji
These are the codes I created and documented, with the exception of the four listed above, which exist in COW and are the same countries in GW
Thus, I set the gwCode to be the same as COWcode
'''
for code in missingGW:
	result.loc[result["cCode"] == code, "gwcode"] = code

print(diffGW)
'''
[('Democratic Republic of the Congo', 'Congo, Democratic Republic of (Zaire)'), ('Sao Tome and Principe', 'São Tomé and Principe'), ('Tanzania', 'Tanzania/Tanganyika'), ('Zimbabwe', 'Zimbabwe (Rhodesia)'), ('Burkina Faso', 'Burkina Faso (Upper Volta)'), ('Ivory Coast', 'Cote D’Ivoire'), ('Suriname', 'Surinam'), ('Kyrgyzstan', 'Kyrgyz Republic'), ('South Korea', 'Korea, Republic of'), ('North Korea', "Korea, People's Republic of"), ('Cambodia', 'Cambodia (Kampuchea)'), ('Myanmar', 'Myanmar (Burma)'), ('Vietnam', 'Vietnam, Democratic Republic of'), ('Republic of Vietnam', 'Vietnam, Republic of'), ('Iran', 'Iran (Persia)'), ('Sri Lanka', 'Sri Lanka (Ceylon)'), ('Turkey', 'Turkey (Ottoman Empire)'), ('Yemen', 'Yemen (Arab Republic of Yemen)'), ("Yemen People's Republic", "Yemen, People's Republic of"), ('St. Kitts and Nevis', 'Saint Kitts and Nevis'), ('St. Lucia', 'Saint Lucia'), ('St. Vincent and the Grenadines', 'Saint Vincent and the Grenadines'), ('Belarus', 'Belarus (Byelorussia)'), ('Russia', 'Russia (Soviet Union)'), ('Bosnia and Herzegovina', 'Bosnia-Herzegovina'), ('Italy', 'Italy/Sardinia'), ('Macedonia', 'Macedonia (Former Yugoslav Republic of)'), ('Germany', 'Germany (Prussia)'), ('Wuerttemburg', 'Württemberg'), ('Hesse Electoral', 'Hesse-Kassel (Electoral)'), ('Mecklenburg Schwerin', 'Mecklenburg-Schwerin'), ('Samoa', 'Samoa/Western Samoa')]
These are all the same countries, so we are good to drop country_name
'''
result = result.drop(["country_name"], axis=1)
print(result.to_string())
print()

#check to make sure all GW codes in
allGWCodes = gwCodes["gwcode"].values
for gw in allGWCodes:
	if gw not in result["gwcode"].values:
		print(gw, " ", gwCodes.loc[gwCodes["gwcode"] == gw].to_string())
'''
output:
89       gwcode iso3c                         country_name
12      89   UPC  United Provinces of Central America
99       gwcode iso3c    country_name
19      99   GCL  Great Colombia
340       gwcode iso3c country_name
71     340   SER       Serbia
563        gwcode iso3c country_name
138     563   TRA    Transvaal
564        gwcode iso3c       country_name
139     564   OFS  Orange Free State
711        gwcode iso3c country_name
183     711   TBT        Tibet
815        gwcode iso3c                         country_name
202     815   VNM  Vietnam (Annam/Cochin China/Tonkin)
396        gwcode iso3c country_name
226     396   ABK     Abkhazia
397        gwcode iso3c   country_name
227     397   SOT  South Ossetia
970        gwcode iso3c country_name
231     970   KBI     Kiribati
'''
newGWCodes = {
	"SRB": 340,
	"KIR": 970
}
for gw in newGWCodes:
	result.loc[result["cState"] == gw, "gwcode"] = newGWCodes[gw]
#The other countries are not in the dataset, and are too historic to include (Tibet is the exception, but that is also not included)

for gwname in gwCodes["country_name"].values:
	if gwname not in result["cName"].values:
		print(gwname)
'''
output:
United Provinces of Central America		#not in dataset
Great Colombia							#not in dataset
Surinam									#mispelled in gw
Germany (Prussia)						#accounted for
Württemberg								#accounted for
Hesse-Kassel (Electoral)				#accounted for
Hesse-Darmstadt (Ducal)					#accounted for
Mecklenburg-Schwerin					#accounted for
Italy/Sardinia							#accounted for
Macedonia (Former Yugoslav Republic of)	#accounted for
Bosnia-Herzegovina						#accounted for
Rumania									#accounted for
Russia (Soviet Union)					#accounted for
Belarus (Byelorussia)					#accounted for
Cote D’Ivoire							#accounted for
Burkina Faso (Upper Volta)				#accounted for
Congo, Democratic Republic of (Zaire)	#accounted for
Tanzania/Tanganyika						#accounted for
Zimbabwe (Rhodesia)						#accounted for
Transvaal								#not in dataset
Orange Free State						#not in dataset
Iran (Persia)							#accounted for
Turkey (Ottoman Empire)					#accounted for
Yemen (Arab Republic of Yemen)			#accounted for
Yemen, People's Republic of				#accounted for
Kyrgyz Republic							#accounted for
Tibet									#not in dataset
Korea, People's Republic of				#accounted for
Korea, Republic of						#accounted for
Myanmar (Burma)							#accounted for
Sri Lanka (Ceylon)						#accounted for
Cambodia (Kampuchea)					#accounted for
Vietnam (Annam/Cochin China/Tonkin)		#not in dataset
Vietnam, Democratic Republic of			#accounted for
Vietnam, Republic of					#accounted for
Saint Lucia								#accounted for
Saint Vincent and the Grenadines		#accounted for
Saint Kitts and Nevis					#accounted for
Abkhazia								#not in dataset
South Ossetia							#not in dataset
São Tomé and Principe					#accounted for
Samoa/Western Samoa						#accounted for
'''


#now insert GTD codes
gtdCodes = {}
for line in open("../alignments/gtdcodes"):
	t = line.rstrip("\n").split(" = ")
	gtdCodes[t[0]] = t[1]
result["gtdcode"] = "-1"
for k in gtdCodes:
	result["gtdcode"].loc[result["cName"] == gtdCodes[k]] = k

#the following is used to manually add the missing codes in
print(result.loc[result["gtdcode"] == "-1"].to_string())
'''
                                            ICEWS ISO-3 UN M.49             region cState cCode                                         cName gwcode gtdcode
4                                           Congo   COG     178     Central Africa    CON   484                                         Congo    484      -1
7                           Sao Tome and Principe   STP     678     Central Africa    STP   403                         Sao Tome and Principe    403      -1
19                                        Mayotte   MYT     175     Eastern Africa    MYT   219                                       Mayotte    219      -1
20                                        Réunion   REU     638     Eastern Africa    REU   218                                       Réunion    218      -1
25                                       Tanzania   TZA     834     Eastern Africa    ZAN   511                                      Zanzibar    511      -1
45                                     Cape Verde   CPV     132     Western Africa    CAP   402                                    Cape Verde    402      -1
56   Saint Helena, Ascension and Tristan da Cunha   SHN     654     Western Africa    SHN   199  Saint Helena, Ascension and Tristan da Cunha    199      -1
70                      Saint Pierre and Miquelon   SPM     666   Northern America    SPM   217                     Saint Pierre and Miquelon    217      -1
71                                  United States   USA     840   Northern America    USA     2                      United States of America      2      -1
75                                  Bouvet Island   BVT      74      South America    BVT   384                                 Bouvet Island    384      -1
79                    Falkland Islands (Malvinas)   FLK     238      South America    FLK   197                   Falkland Islands (Malvinas)    197      -1
84   South Georgia and the South Sandwich Islands   SGS     239      South America    SGS   196  South Georgia and the South Sandwich Islands    196      -1
96                                    South Korea   KOR     410       Eastern Asia    KOR   730                                         Korea    730      -1
98                                          Macao   MAC     446       Eastern Asia    MCA   708                                         Macao    708      -1
104                       Cocos (Keeling) Islands   CCK     166  Southeastern Asia    CCK   899                       Cocos (Keeling) Islands    899      -1
105                              Christmas Island   CXR     162  Southeastern Asia    CXR   898                              Christmas Island    898      -1
112                                         Palau   PLW     585  Southeastern Asia    PAL   986                                         Palau    986      -1
118                                       Vietnam   VNM     704  Southeastern Asia    RVN   817                           Republic of Vietnam    817      -1
123                British Indian Ocean Territory   IOT      86      Southern Asia    IOT   195                British Indian Ocean Territory    195      -1
140               Palestinian Territory, Occupied   PSE     275       Western Asia    PSE   665               Palestinian Territory, Occupied    665      -1
145                                         Yemen   YEM     887       Western Asia    YAR   678                           Yemen Arab Republic    678      -1
147                                         Yemen   YEM     887       Western Asia    YPR   680                       Yemen People's Republic    680      -1
148                                         Aruba   ABW     533          Caribbean    ABW   207                                         Aruba    207      -1
149                                      Anguilla   AIA     660          Caribbean    AIA   194                                      Anguilla    194      -1
150                          Netherlands Antilles   ANT     530          Caribbean    ANT   209                          Netherlands Antilles    209      -1
151                           Antigua and Barbuda   ATG      28          Caribbean    AAB    58                             Antigua & Barbuda     58      -1
153                              Saint Barthélemy   BLM     652          Caribbean    BLM   215                              Saint Barthélemy    215      -1
165                    Saint Martin (French part)   MAF     663          Caribbean    MAF   214                    Saint Martin (French part)    214      -1
166                                    Montserrat   MSR     500          Caribbean    MSR   192                                    Montserrat    192      -1
169                      Turks and Caicos Islands   TCA     796          Caribbean    TCA   191                      Turks and Caicos Islands    191      -1
171              Saint Vincent and the Grenadines   VCT     670          Caribbean    SVG    57                St. Vincent and the Grenadines     57      -1
172                        British Virgin Islands   VGB      92          Caribbean    VGB   190                        British Virgin Islands    190      -1
173                           U.S. Virgin Islands   VIR     850          Caribbean    VIR     4                           U.S. Virgin Islands      4      -1
174                                       Curaçao   CUW     530          Caribbean    CUW   208                                            -1    208      -1
175                    Saint Martin (French Part)   SXM     664          Caribbean    SXM   206                                            -1    206      -1
185                                      Slovakia   SVK     703     Eastern Europe    SLO   317                                      Slovakia    317      -1
188                                 Åland Islands   ALA     248    Northern Europe    ALA   374                                 Åland Islands    374      -1
192                                 Faroe Islands   FRO     234    Northern Europe    FRO   388                                 Faroe Islands    388      -1
194                                      Guernsey   GGY     831    Northern Europe    GGY   201                                      Guernsey    201      -1
195                                   Isle of Man   IMN     833    Northern Europe    IMN   202                                   Isle of Man    202      -1
198                                        Jersey   JEY     832    Northern Europe    JEY   203                                        Jersey    203      -1
202                        Svalbard and Jan Mayen   SJM     744    Northern Europe    SJM   383                        Svalbard and Jan Mayen    383      -1
206                        Bosnia and Herzegovina   BIH      70    Southern Europe    BOS   346                        Bosnia and Herzegovina    346      -1
212                                         Italy   ITA     380    Southern Europe    PAP   327                                  Papal States    327      -1
213                                         Italy   ITA     380    Southern Europe    SIC   329                                  Two Sicilies    329      -1
214                                         Italy   ITA     380    Southern Europe    MOD   332                                        Modena    332      -1
215                                         Italy   ITA     380    Southern Europe    PMA   335                                         Parma    335      -1
216                                         Italy   ITA     380    Southern Europe    TUS   337                                       Tuscany    337      -1
222                                    San Marino   SMR     674    Southern Europe    SNM   331                                    San Marino    331      -1
225                 Holy See (Vatican City State)   VAT     336    Southern Europe    VAT   324                 Holy See (Vatican City State)    324      -1
226                                       Austria   AUT      40     Western Europe    AUH   300                               Austria-Hungary    300      -1
230                                       Germany   DEU     276     Western Europe    HAN   240                                       Hanover    240      -1
231                                       Germany   DEU     276     Western Europe    BAV   245                                       Bavaria    245      -1
233                                       Germany   DEU     276     Western Europe    GFR   260                       German Federal Republic    260      -1
234                                       Germany   DEU     276     Western Europe    GDR   265                    German Democratic Republic    265      -1
235                                       Germany   DEU     276     Western Europe    BAD   267                                         Baden    267      -1
236                                       Germany   DEU     276     Western Europe    SAX   269                                        Saxony    269      -1
237                                       Germany   DEU     276     Western Europe    WRT   271                                  Wuerttemburg    271      -1
238                                       Germany   DEU     276     Western Europe    HSE   273                               Hesse Electoral    273      -1
239                                       Germany   DEU     276     Western Europe    HSG   275                             Hesse Grand Ducal    275      -1
240                                       Germany   DEU     276     Western Europe    MEC   280                          Mecklenburg Schwerin    280      -1
244                                        Monaco   MCO     492     Western Europe    MNC   221                                        Monaco    221      -1
246                                American Samoa   ASM      16            Oceania    ASM     5                                American Samoa      5      -1
248                                  Cook Islands   COK     184            Oceania    COK   919                                  Cook Islands    919      -1
250                Federated States of Micronesia   FSM     583            Oceania    FSM   987                Federated States of Micronesia    987      -1
251                                          Guam   GUM     316            Oceania    GUM     6                                          Guam      6      -1
252                                      Kiribati   KIR     296            Oceania    KIR   946                                      Kiribati    946      -1
253                              Marshall Islands   MHL     584            Oceania    MSI   983                              Marshall Islands    983      -1
254                      Northern Mariana Islands   MNP     580            Oceania    MNP     7                      Northern Mariana Islands      7      -1
256                                Norfolk Island   NFK     574            Oceania    NFK   897                                Norfolk Island    897      -1
257                                          Niue   NIU     570            Oceania    NIU   918                                          Niue    918      -1
258                                         Nauru   NRU     520            Oceania    NAU   970                                         Nauru    971      -1
260                                      Pitcairn   PCN     612            Oceania    PCN   188                                      Pitcairn    188      -1
263                                       Tokelau   TKL     772            Oceania    TKL   917                                       Tokelau    917      -1
265                                        Tuvalu   TUV     798            Oceania    TUV   947                                        Tuvalu    973      -1
266          United States Minor Outlying Islands   UMI     581            Oceania    UMI     8          United States Minor Outlying Islands      8      -1
269                                         Samoa   WSM     882            Oceania    WSM   990                                         Samoa    990      -1
270                                    Antarctica   ATA      10              Other    ATA   999                                    Antarctica    999      -1
271                   French Southern Territories   ATF     260              Other    ATF   174                   French Southern Territories    174      -1
272             Heard Island and McDonald Islands   HMD     334              Other    HMD   896             Heard Island and McDonald Islands    896      -1

if an entry does not exist, the GTD code is left as -1
'''
#Congo
result.loc[result["cState"] == "CON", "gtdcode"] = "47"		#Republic of the Congo
congoTemp = result.loc[result["cState"] == "CON"].copy()
congoTemp.loc[congoTemp["ISO-3"] == "COG", "cState"] = "PRC"
congoTemp.loc[congoTemp["ISO-3"] == "COG", "cCode"] = 485
congoTemp.loc[congoTemp["ISO-3"] == "COG", "cName"] = "People's Republic of the Congo"
congoTemp.loc[congoTemp["ISO-3"] == "COG", "gwcode"] = 485
congoTemp.loc[congoTemp["ISO-3"] == "COG", "gtdcode"] = "605"
result = result.append(congoTemp, ignore_index=True).reset_index(drop=True)
#print(result.loc[result["ISO-3"] == "COG"].to_string())

#Sao Tome and Princpe onwards:
newGTD = {
	"USA": 217,
	"FLK": 66,
	"KOR": -1,	#this is Korea before the war
	"RVN": 428,	#this is South Vietnam (Republic of Vietnam)
	"PSE": 155,	#West Bank and Gaza strip
	"YAR": 377,	#North Yemen
	"YPR": 406, #South Yemen
	"AAB": 10,
	"MAF": 192,
	"IMN": 125,
	"BOS": 28,
	"VAT": 221,
	"GFR": 362,	#West Germany
	"GDR": 499	#East Germany
}

for k, v in newGTD.items():
	result.loc[result["cState"] == k, "gtdcode"] = str(v)

print()
print(result.to_string())

print(result.loc[result["gtdcode"] == "221"].to_string())
print(result.loc[result["gtdcode"] == "226"].to_string())
print(result.loc[result["gwcode"] == 920].to_string())
print(result.loc[result["gwcode"] == 485].to_string())

#check to ensure all gtd codes in
for k, v in gtdCodes.items():
	if result.loc[result["gtdcode"] == str(k)].empty:
		print(k, " ", v)
'''
output:
422   International			#new entry																#in dataset
233   Northern Ireland		#new entry; map to United Kingdom COW									#not in dataset, include anyways
238   Corsica				#French region, new entry												#not in dataset
532   New Hebrides			#new entry; map to current day Vanuatu									#in dataset, include
351   Commonwealth of Independent States	#post Soviet republics, new entry; copy from Russia		#not in dataset
334   Asian					#new entry																#not in dataset
117   Macau					#map to Macao COW														#include
359   Soviet Union			#new entry; copy from Russia											#include
216   Great Britain			#new entry; map to United Kingdom COW									#not in dataset, include anyways
520   Sinhalese				#new entry; map to Sri Lanka											#not in dataset
179   Slovak Republic		#map to Slovakia														#already in result
403   Rhodesia				#new entry; part of Zimbabwe											#in dataset, include
999   Multinational			#new entry																#not in dataset
175   Serbia-Montenegro		#new entry; default to Serbia; however, all entries are mappped so redundant			#in dataset
604   Zaire					#existing entry; map to Democratic Republic of the Congo				#in dataset
'''
print(result.loc[result["ISO-3"] == "IMN"].to_string())
newGTD2 = {
	"DRC": 604,	#Democratic Republic of the Congo
	"SLO": 179,	#Slovakia
	"MCA": 117	#Macao
}
for k, v in newGTD2.items():
	result.loc[result["cState"] == k, "gtdcode"] = str(v)

#duplicate DRC: 604 and 229
drcTemp = result.loc[result["cState"] == "DRC"].copy()
drcTemp["gtdcode"] = 229
result = result.append(drcTemp, ignore_index=True)

#~ newGTD2 = {
	#~ "III": {"ICEWS": "International", "ISO-3": "III", "UN M.49": 0, "region": "International", "cState": "III", "cCode": 0, "cName": "International", "gwcode": 0, "gtdcode": 422}
	#~ "MTN": {"ICEWS": "Multinational", "ISO-3": "MTN", "UN M.49": 1, "region": "Multinational", "cState": "MTN", "cCode": 1, "cName": "Multinational", "gwcode": 1, "gtdcode": 999},
	#~ "ASN": {"ICEWS": "Asia", "ISO-3": "ASN", "UN M.49": 142, "region": "Asia", "cState": "ASN", "cCode": "
#~ }

#International
internationalTemp = {"ICEWS": "International", "ISO-3": "III", "UN M.49": 1, "region": "International", "cState": "III", "cCode": 1, "cName": "International", "gwcode": 1, "gtdcode": 422}
result = result.append(internationalTemp, ignore_index=True)
#Multinational
multinationalTemp = {"ICEWS": "Multinational", "ISO-3": "MTN", "UN M.49": 0, "region": "Multinational", "cState": "MTN", "cCode": 0, "cName": "Multinational", "gwcode": 0, "gtdcode": 999}
result = result.append(multinationalTemp, ignore_index=True)
#Asian
asianTemp = {"ICEWS": "Asian", "ISO-3": "ASN", "region": "Asia", "cState": "ASN", "cCode": 1000, "cName": "Asia", "gwcode": 334, "gtdcode": 334}
result = result.append(asianTemp, ignore_index=True)
#Corsica
corsicaTemp = {"ICEWS": "Corsica", "ISO-3": "CRS", "region": "Southern Europe", "cState": "CRS", "cCode": 175, "cName": "Corsica", "gtdcode": 238}
result = result.append(corsicaTemp, ignore_index=True)
#Northern Ireland
ukTemp = result.loc[result["cState"] == "UKG"].copy()
ukTemp["gtdcode"] = "233"
result = result.append(ukTemp, ignore_index=True)
#Great Britain
ukTemp["gtdcode"] = "216"
result = result.append(ukTemp, ignore_index=True)
#Soviet Union
sovietTemp = result.loc[result["cState"] == "RUS"].copy()
sovietTemp["gtdcode"] = "359"
result = result.append(sovietTemp, ignore_index=True)
#Commonwealth of Independent States
cisTemp = result.loc[result["cState"] == "RUS"].copy()
cisTemp["gtdcode"] = "351"
result = result.append(cisTemp, ignore_index=True)
#New Hebrides
newHebridesTemp = result.loc[result["cState"] == "VAN"].copy()
newHebridesTemp["gtdcode"] = "532"
result = result.append(newHebridesTemp, ignore_index=True)
#Rhodesia
rhodesiaTemp = result.loc[result["cState"] == "ZIM"].copy()
rhodesiaTemp["gtdcode"] = "403"
result = result.append(rhodesiaTemp, ignore_index=True)
#Serbia-Montenegro
serbiaTemp = result.loc[result["cState"] == "SRB"].copy()
serbiaTemp["gtdcode"] = "175"
result = result.append(serbiaTemp, ignore_index=True)
#Sinhalese
sinhaleseTemp = result.loc[result["cState"] == "SRI"].copy()
sinhaleseTemp["gtdcode"] = "520"
result = result.append(sinhaleseTemp, ignore_index=True)

#missing codes from inspection
#Marshall Islands=126, US Virgin Islands=225, Tuvalu=212, Saba=169
result.loc[result["cState"] == "MSI", "gtdcode"] = "126"
result.loc[result["cState"] == "VIR", "gtdcode"] = "225"
result.loc[result["cState"] == "TUV", "gtdcode"] = "212"
#~ result.loc[result["cState"] == "BES", "gtdcode"] = "169"

result = result.reset_index(drop=True)
print(result.to_string())

iso2 = pd.read_json('../alignments/iso2-3.json', typ='series')
iso2 = pd.DataFrame({"ISO-2": iso2.index, "iso3": iso2.values})
result = result.join(iso2.set_index(["iso3"]), on="ISO-3").reset_index(drop=True).fillna("-1")

print(result.loc[result["ISO-2"] == "-1"].to_string())
'''
                    ICEWS ISO-3 UN M.49         region cState cCode                 cName gwcode gtdcode ISO-2
150  Netherlands Antilles   ANT     530      Caribbean    ANT   209  Netherlands Antilles    209      -1    -1
275         International   III       1  International    III     1         International      1     422    -1
'''
result.loc[result["ISO-3"] == "ANT", "ISO-2"] = "AN"
result.loc[result["ISO-3"] == "III", "ISO-2"] = "II"


#any error correction
result.loc[result["ISO-3"] == "SDN", "UN M.49"] = 729

'''
results from supplementing
Terrier:
BQ = Bonaire, Sint Eustatius and Saba (Carribean Netherlands)
CS = Czechoslovakia
ICEWS: {'Sint Maarten', 'Micronesia', 'Holy See', 'Bavaria', 'Bonaire', 'Reunion', 'Saint Barthelemy', 'Occupied Palestinian Territory', 'Saint Helena', 'Cook Island', 'Democratic Republic of Congo', "Cote d'Ivoire", 'Falkland Islands', 'Isle Of Man'}
cline_phoenix_swb: BES = Bonaire, Sint Eustatius and Saba (Carribean Netherlands)
'''
carribNeth = {"ICEWS": "Bonaire, Sint Eustatius and Saba (Carribean Netherlands)", "ISO-3": "BES", "UN M.49": 535, "region": "Caribbean", "cState": "BES", "cCode": 204, "cName": "Bonaire, Sint Eustatius and Saba (Carribean Netherlands)", "gwcode": -1, "gtdcode": 169, "ISO-2": "BQ"}
result = result.append(carribNeth, ignore_index=True)

czeTemp = result.loc[result["cState"] == "CZE"].copy()
czeTemp["ISO-2"] = "CS"
result = result.append(czeTemp, ignore_index=True)

stMartTemp = result.loc[result["cState"] == "MAF"].copy()
stMartTemp["ICEWS"] = 'Sint Maarten'
result = result.append(stMartTemp, ignore_index=True)

microTemp = result.loc[result["cState"] == "FSM"].copy()
microTemp["ICEWS"] = 'Micronesia'
result = result.append(microTemp, ignore_index=True)

holySeeTemp = result.loc[result["cState"] == "VAT"].copy()
holySeeTemp["ICEWS"] = 'Holy See'
result = result.append(holySeeTemp, ignore_index=True)

bavTemp = result.loc[result["cState"] == "BAV"].copy()
bavTemp["ICEWS"] = 'Bavaria'
result = result.append(bavTemp, ignore_index=True)

bonTemp = result.loc[result["cState"] == "ANT"].copy()
bonTemp["ICEWS"] = 'Bonaire'	#part of the Netherland Antilles
result = result.append(bonTemp, ignore_index=True)

reuTemp = result.loc[result["cState"] == "REU"].copy()
reuTemp["ICEWS"] = 'Reunion'
result = result.append(reuTemp, ignore_index=True)

blmTemp = result.loc[result["cState"] == "BLM"].copy()
blmTemp["ICEWS"] = 'Saint Barthelemy'
result = result.append(blmTemp, ignore_index=True)

pseTemp = result.loc[result["cState"] == "PSE"].copy()
pseTemp["ICEWS"] = 'Occupied Palestinian Territory'
result = result.append(pseTemp, ignore_index=True)

shnTemp = result.loc[result["cState"] == "SHN"].copy()
shnTemp["ICEWS"] = 'Saint Helena'
result = result.append(shnTemp, ignore_index=True)

cokTemp = result.loc[result["cState"] == "COK"].copy()
cokTemp["ICEWS"] = 'Cook Island'
result = result.append(cokTemp, ignore_index=True)

#~ drcTemp = result.loc[result["ICEWS"] == "Democratic Republic of the Congo"].copy()
drcTemp = result.loc[result["cState"] == "DRC"].copy()
drcTemp["ICEWS"] = 'Democratic Republic of Congo'
result = result.append(drcTemp, ignore_index=True)

cdiTemp = result.loc[result["cState"] == "CDI"].copy()
cdiTemp["ICEWS"] = "Cote d'Ivoire"
result = result.append(cdiTemp, ignore_index=True)

flkTemp = result.loc[result["cState"] == "FLK"].copy()
flkTemp["ICEWS"] = 'Falkland Islands'
result = result.append(flkTemp, ignore_index=True)

imnTemp = result.loc[result["cState"] == "IMN"].copy()
imnTemp["ICEWS"] = 'Isle Of Man'
result = result.append(imnTemp, ignore_index=True)


#clean up columns
result[["UN M.49", "cCode", "gwcode", "gtdcode"]] = result[["UN M.49", "cCode", "gwcode", "gtdcode"]].apply(pd.to_numeric, downcast="integer")
#save to file
result.to_json("../alignments/country_cow_aligned.json", orient="records")




##############################		BELOW IS OLD CODE FOR REFERENCE		####################################








#~ congoTemp = result.loc[result["cState"] == "CON"].values
#~ print(congoTemp)
#~ print(len(congoTemp[0]))
#~ congoTemp[0][len(congoTemp[0]) - 1] = 605
#~ print(congoTemp)
#~ result = result.append(congoTemp, ignore_index=True)
#~ print(result.loc[result["cState"] == "CON"].to_string())




#~ gwCodes = gwCodes.drop_duplicates().rename({"gwcode":"gCode"}, axis=1)
#~ result = result.join(gwCodes.set_index(["gCode"]), on="gwcode").drop_duplicates().reset_index(drop=True).fillna("-1")
#~ print(result.to_string())
#~ print(result.shape)

#~ missingGW = []
#~ noMatch = []
#~ diffGW = []
#~ for index, row in result.iterrows():
	#~ if row["gwcode"] == "-1" or row["gwcode"] == -1:
		#~ missingGW.append(row["cCode"])
		#~ if row["cCode"] in gwCodes["gCode"].values:
			#~ noMatch.append(row["cCode"])
	#~ elif row["cState"] != row["iso3c"]:
		#~ diffGW.append((row["cState"], row["iso3c"]))
#~ print(missingGW)
#~ print(noMatch)
'''
output:
[219, 218, 599, 199, 198, 389, 217, 384, 197, 216, 196, 709, 708, 899, 898, 195, 665, 207, 194, 209, 215, 193, 170, 214, 192, 171, 3, 191, 190, 4, '208', '206', 374, 388, 201, 202, 203, 383, 189, 341, 345, 342, 324, 5, 919, 6, 7, 213, 897, 918, 188, 172, 917, 8, 173, 999, 174, 896]
[341, 345]
These are the codes I created and documented, with the exception of 341 (Montenegro) and 345 (Yugoslavia)
Thus, I set the gwCode to be the same as COWcode
'''
#~ for code in missingGW:
	#~ result.loc[result["cCode"] == code, "gwcode"] = code
#~ print(diffGW)
'''
output:
[('ZAN', 'TAZ'), ('KOR', 'ROK'), ('RVN', 'DRV'), ('YAR', '-1'), ('YEM', '-1'), ('YPR', '-1'), ('CZE', 'CZR'), ('ROM', 'RUM'), ('KOS', '-1'), ('PAP', 'ITA'), ('SIC', 'ITA'), ('MOD', 'ITA'), ('PMA', 'ITA'), ('TUS', 'ITA'), ('AUH', 'AUS'), ('HAN', 'GMY'), ('BAV', 'GMY'), ('GFR', 'GMY'), ('GDR', 'GMY'), ('BAD', 'GMY'), ('SAX', 'GMY'), ('WRT', 'GMY'), ('HSE', 'GMY'), ('HSG', 'GMY'), ('MEC', 'GMY'), ('FIJ', 'FJI'), ('KIR', 'KBI'), ('TON', '-1'), ('TUV', '-1')]
'''

#~ merged = orig.merge(result.drop(["iso3c", "country_name"], axis=1), indicator=True, how="outer")
#~ ##~ print(merged[merged["_merge"] == "right_only"].to_string())
#~ print(merged.to_string())
'''print("gwcodes orig shape")
print(gwCodes.drop_duplicates().shape)
gwCodes = gwCodes.drop_duplicates().rename({"gwcode":"gCode"}, axis=1)
result = result.join(gwCodes.set_index(["iso3c"]), on="cState").drop_duplicates().reset_index(drop=True).fillna("-1")
print(result.shape)

for index,row in result.iterrows():
	for col in list(result):
		if row[col] == "-1" or row[col] == -1:
			count += 1
			print(result.iloc[[index]].to_string())
			#~ if col == "cowcode":
				#~ val = str(row["ISO-3"])
				#~ mapICEWS.append(val)
				#print(val)
				#~ for val in mapICEWS:
					#~ if result.loc[result["cowcode"].astype(str) == val].shape[0] > 0:
						#~ existCOW.append(val)
				#~ else:
					#~ newCOW += 1
				#if result.loc[result["cowcode"] == val] is not None:
				#	existCOW.append(row[col])
				#else:
				#	newCOW += 1
			#~ else:
				#~ print(result.iloc[[index]].to_string())
			break
'''
'''
#~ frame = frame.drop(["StateAbb", "StateNme"], axis=1)
frame = frame.rename({"StateAbb": "Abb", "StateNme": "Name"}, axis="columns")
frame = frame.join(cowcodes.set_index(["StateAbb"]), on="ISO-3")
frame = frame.drop_duplicates()
#~ for index, row in frame.iterrows():
	#~ if row["cowcode"] == "-1":
		#~ print(row)
		#~ row["cowcode"] = row["CCode"]
frame["cowcode"].loc[frame["cowcode"] == "-1"] = frame.loc[frame["cowcode"] == "-1"]["CCode"]
print(frame.to_string())


print(frame.loc[frame["ICEWS"] == "South Sudan"])

gwCodes = pd.read_csv("../alignments/gwCodes.csv")#.drop("country_name", axis=1)

""" #this was used to test joins
#~ frame = frame.set_index("ISO-3").join(gwCodes.set_index('iso3c'))
#~ frame = frame.join(gwCodes.set_index('iso3c'), on="ISO-3")
#~ frame = frame.join(gwCodes.set_index('country_name'), on="ICEWS")
#~ frame["gwcode"] = -1
#~ frame = frame.merge(gwCodes, left_on=["gwcode", "ISO-3"], right_on=["gwcode", "iso3c"], how="left")
#~ frame = frame.set_index("ISO-3").join(gwCodes.set_index("iso3c"))
"""


frame = frame.join(gwCodes.set_index("gwcode"), on="cowcode")
frame = frame.drop_duplicates()
print(frame.to_string())

""" #this was used to inspect the resulting joins with GW codes
#~ print()

#~ print(frame[frame.isnull().any(axis=1)].to_string())

#~ print()

#~ count = 0
#~ for index, row in frame.iterrows():
	#~ if row["ICEWS"] != row["country_name"]:
		#~ print(index, "\t", row["cowcode"], "\t", row["ICEWS"], "\t", row["country_name"])
		#~ count += 1
#~ print(count)
"""

frame = frame.drop(["Abb", "Name", "CCode", "StateNme", "iso3c", "country_name"], axis=1).fillna("-1").drop_duplicates()
""" #observations
#~ print(frame.to_string())
#~ print()

#~ for missing in ["MAC", "MKD", "KIR", "NRU"]:
	#~ print(frame.loc[frame["ISO-3"] == missing])
	#~ print()
macao = MAC = NaN (COW/GW)
macedonia = MKD = 343 (COW/GW)

kiribati = KIR = 946 (COW) = 970 (GW)
nauru = NRU = 970 (COW) = 971 (GW)
"""

#apply oberservations
frame["cowcode"].loc[frame["ISO-3"] == "MAC"] = "-1"	#Macao has no COW/GW
frame["gwcode"] = frame["cowcode"]
frame["gwcode"].loc[frame["ISO-3"] == "KIR"] = "970"	#Kiribati GW = 970
frame["gwcode"].loc[frame["ISO-3"] == "NRU"] = "971"	#Nauru GW = 971
for missing in ["MAC", "MKD", "KIR", "NRU"]:
	print(frame.loc[frame["ISO-3"] == missing])
	print()

#apply Yemen codes
#ICEWS, ISO, UN, cowcode, region, gwcode
frame.append(["Yemen Arab Republic (North Yemen)", "-1", "-1", "678", "Western Asia", "678"])
frame.append(["People's Republic of Yemen (South Yemen)", "-1", "-1", "680", "Western Asia", "680"])

print(frame.to_string())

#add missing ICEWS names in for values with ISO-3 code
#find missing ICEWS values
print(frame.loc[frame["ICEWS"] == "-1"])
frame["ICEWS"].loc[frame["ISO-3"] == "REU"] = "Réunion"
frame["ICEWS"].loc[frame["ISO-3"] == "SHN"] = "Saint Helena, Ascension and Tristan da Cunha"
frame["ICEWS"].loc[frame["ISO-3"] == "BVT"] = "Bouvet Island"
frame["ICEWS"].loc[frame["ISO-3"] == "FLK"] = "Falkland Islands (Malvinas)"
frame["ICEWS"].loc[frame["ISO-3"] == "PSE"] = "Palestinian Territory, Occupied"
frame["ICEWS"].loc[frame["ISO-3"] == "ANT"] = "Netherlands Antilles"
frame["ICEWS"].loc[frame["ISO-3"] == "BLM"] = "Saint Barthélemy"
frame["ICEWS"].loc[frame["ISO-3"] == "VGB"] = "Virgin Islands, British"
frame["ICEWS"].loc[frame["ISO-3"] == "VIR"] = "Virgin Islands, U.S."
frame["ICEWS"].loc[frame["ISO-3"] == "BVI"] = "British Virgin Islands"	#possible error in original file
frame["ICEWS"].loc[frame["ISO-3"] == "SXM"] = "Saint Martin"	#possible error (MAF)
frame["ICEWS"].loc[frame["ISO-3"] == "XKX"] = "Kosovo"		#check this
frame["ICEWS"].loc[frame["ISO-3"] == "ALA"] = "Åland Islands"
frame["ICEWS"].loc[frame["ISO-3"] == "IMN"] = "Isle of Man"
frame["ICEWS"].loc[frame["ISO-3"] == "VAT"] = "Holy See (Vatican City State)"
frame["ICEWS"].loc[frame["ISO-3"] == "COK"] = "Cook Islands"

print(frame.loc[frame["ISO-3"] == "MAF"])
print(frame.loc[frame["ISO-3"] == "SXM"])
print(frame.loc[frame["ISO-3"] == "XKX"])
print(frame.loc[frame["ICEWS"] == "Kosovo"])

frame.to_json("../alignments/country2.json", orient="records")

####################### below is for GTD ###############################

gtdCodes = {}
for line in open("../alignments/gtdcodes"):
	t = line.rstrip("\n").split(" = ")
	gtdCodes[t[0]] = t[1]
frame["gtdcode"] = "-1"
for k in gtdCodes:
	#~ print(k, " ", gtdCodes[k])
	frame["gtdcode"].loc[frame["ICEWS"] == gtdCodes[k]] = k

""" #the following is used to manually add the missing codes in
print(frame.to_string())

print(frame.loc[frame["gtdcode"] == "-1"].to_string())

#results:
                                            ICEWS ISO-3 UN M.49 cowcode             region gwcode gtdcode
4                                           Congo   COG     178     484     Central Africa    484      -1
7                           Sao Tome and Principe   STP     678     403     Central Africa    403      -1		#DNE
19                                        Mayotte   MYT     175      -1     Eastern Africa     -1      -1		#DNE
20                                        Réunion   REU     638      -1     Eastern Africa     -1      -1		#DNE
44                                     Cape Verde   CPV     132     402     Western Africa    402      -1		#DNE
55   Saint Helena, Ascension and Tristan da Cunha   SHN     654      -1     Western Africa     -1      -1		#DNE
70                      Saint Pierre and Miquelon   SPM     666      -1   Northern America     -1      -1		#DNE
75                                  Bouvet Island   BVT      74      -1      South America     -1      -1		#DNE
79                    Falkland Islands (Malvinas)   FLK     238      -1      South America     -1      -1
84   South Georgia and the South Sandwich Islands   SGS     239      -1      South America     -1      -1		#DNE
97                                          Macao   MAC     446      -1       Eastern Asia     -1      -1
103                       Cocos (Keeling) Islands   CCK     166      -1  Southeastern Asia     -1      -1		#DNE
104                              Christmas Island   CXR     162      -1  Southeastern Asia     -1      -1		#DNE
111                                         Palau   PLW     585     986  Southeastern Asia    986      -1		#DNE
115                                   Timor-Leste   TLS     626     860  Southeastern Asia    860      -1
121                British Indian Ocean Territory   IOT      86      -1      Southern Asia     -1      -1		#DNE
138               Palestinian Territory, Occupied   PSE     275      -1       Western Asia     -1      -1		#DNE
144                                         Aruba   ABW     533      -1          Caribbean     -1      -1		#DNE
145                                      Anguilla   AIA     660      -1          Caribbean     -1      -1		#DNE
146                          Netherlands Antilles   ANT     530      -1          Caribbean     -1      -1		#DNE
149                              Saint Barthélemy   BLM     652      -1          Caribbean     -1      -1		#DNE
159                         Saint Kitts and Nevis   KNA     659      60          Caribbean     60      -1
160                                   Saint Lucia   LCA     662      56          Caribbean     56      -1
161                    Saint Martin (French part)   MAF     663      -1          Caribbean     -1      -1
162                                    Montserrat   MSR     500      -1          Caribbean     -1      -1		#DNE
165                      Turks and Caicos Islands   TCA     796      -1          Caribbean     -1      -1		#DNE
167              Saint Vincent and the Grenadines   VCT     670      57          Caribbean     57      -1		#DNE
168                       Virgin Islands, British   VGB      92      -1          Caribbean     -1      -1		#DNE
169                          Virgin Islands, U.S.   VIR     850      -1          Caribbean     -1      -1		#DNE
170                        British Virgin Islands   BVI      -1      -1          Caribbean     -1      -1		#DNE
171                                       Curaçao   CUW      -1      -1          Caribbean     -1      -1		#DNE
172                                  Saint Martin   SXM      -1      -1          Caribbean     -1      -1		#use previous entry because of ISO/COW/GW codes
177                          Moldova, Republic of   MDA     498     359     Eastern Europe    359      -1
180                            Russian Federation   RUS     643     365     Eastern Europe    365      -1
181                                      Slovakia   SVK     703     317     Eastern Europe    317      -1
184                                 Åland Islands   ALA     248      -1    Northern Europe     -1      -1		#DNE
188                                 Faroe Islands   FRO     234      -1    Northern Europe     -1      -1		#DNE
190                                      Guernsey   GGY     831      -1    Northern Europe     -1      -1		#DNE
191                                   Isle of Man   IMN     833      -1    Northern Europe     -1      -1
194                                        Jersey   JEY     832      -1    Northern Europe     -1      -1		#DNE
198                        Svalbard and Jan Mayen   SJM     744      -1    Northern Europe     -1      -1		#DNE
202                        Bosnia and Herzegovina   BIH      70     346    Southern Europe    346      -1
212                                    San Marino   SMR     674     331    Southern Europe    331      -1		#DNE
215                 Holy See (Vatican City State)   VAT     336      -1    Southern Europe     -1      -1
223                                        Monaco   MCO     492     221     Western Europe    221      -1		#DNE
225                                American Samoa   ASM      16      -1            Oceania     -1      -1		#DNE
227                                  Cook Islands   COK     184      -1            Oceania     -1      -1		#DNE
229                Federated States of Micronesia   FSM     583     987            Oceania    987      -1		#DNE
230                                          Guam   GUM     316      -1            Oceania     -1      -1		#DNE
231                                      Kiribati   KIR     296     946            Oceania    970      -1		#DNE
232                              Marshall Islands   MHL     584     983            Oceania    983      -1		#DNE
233                      Northern Mariana Islands   MNP     580      -1            Oceania     -1      -1		#DNE
235                                Norfolk Island   NFK     574      -1            Oceania     -1      -1		#DNE
236                                          Niue   NIU     570      -1            Oceania     -1      -1		#DNE
237                                         Nauru   NRU     520     970            Oceania    971      -1		#DNE
239                                      Pitcairn   PCN     612      -1            Oceania     -1      -1		#DNE
242                                       Tokelau   TKL     772      -1            Oceania     -1      -1		#DNE
244                                        Tuvalu   TUV     798     947            Oceania    947      -1		#DNE
245          United States Minor Outlying Islands   UMI     581      -1            Oceania     -1      -1		#DNE
248                                         Samoa   WSM     882     990            Oceania    990      -1		#DNE
249                                    Antarctica   ATA      10      -1              Other     -1      -1		#DNE
250                   French Southern Territories   ATF     260      -1              Other     -1      -1		#DNE
251             Heard Island and McDonald Islands   HMD     334      -1              Other     -1      -1		#DNE
"""

frame["gtdcode"].loc[frame["ICEWS"] == "Congo"] = "47"
frame["gtdcode"].loc[frame["ICEWS"] == "Falkland Islands (Malvinas)"] = "66"
frame["gtdcode"].loc[frame["ICEWS"] == "Macao"] = "117"
frame["gtdcode"].loc[frame["ICEWS"] == "Timor-Leste"] = "347"
frame["gtdcode"].loc[frame["ICEWS"] == "Saint Kitts and Nevis"] = "189"
frame["gtdcode"].loc[frame["ICEWS"] == "Saint Lucia"] = "190"
frame["gtdcode"].loc[frame["ICEWS"] == "Saint Martin (French part)"] = "192"
frame["gtdcode"].loc[frame["ICEWS"] == "Moldova, Republic of"] = "132"
frame["gtdcode"].loc[frame["ICEWS"] == "Russian Federation"] = "167"
frame["gtdcode"].loc[frame["ICEWS"] == "Slovakia"] = "179"
frame["gtdcode"].loc[frame["ICEWS"] == "Isle of Man"] = "125"
frame["gtdcode"].loc[frame["ICEWS"] == "Bosnia and Herzegovina"] = "28"
frame["gtdcode"].loc[frame["ICEWS"] == "Holy See (Vatican City State)"] = "221"

#now add missing gtd codes in
missingGTD = []
for k in gtdCodes:
	if k not in frame["gtdcode"].values:
		missingGTD.append((k, gtdCodes[k]))
print(missingGTD)
"""results:
[('403', 'Rhodesia'), ('499', 'East Germany (GDR)'), ('334', 'Asian'), ('216', 'Great Britain'), ('233', 'Northern Ireland'), ('605', "People's Republic of the Congo"), ('532', 'New Hebrides'), ('359', 'Soviet Union'), ('362', 'West Germany (FRG)'), ('999', 'Multinational'), ('406', 'South Yemen'), ('422', 'International'), ('377', 'North Yemen'), ('236', 'Czechoslovakia'), ('351', 'Commonwealth of Independent States'), ('520', 'Sinhalese'), ('238', 'Corsica'), ('175', 'Serbia-Montenegro'), ('428', 'South Vietnam'), ('155', 'West Bank and Gaza Strip'), ('604', 'Zaire'), ('235', 'Yugoslavia')]

#not used:
334
216
233
999
351
520
238

#notes:
499 -> DEU in ARCGIS
605=People's Republic of the Congo -> now DNE IRL
532 -> VUT in ARCGIS
359 -> RUS in ARCGIS
362 -> DEU in ARCGIS
155 -> ISR in ARCGIS
604 -> COD in ARCGIS
377 -> YEM in ARCGIS
236 -> CZE in ARCGIS
175 -> SRB in ARCGIS
428 -> VNM in ARCGIS
235 -> HRV in ARCGIS

#missing/unknown:
403
605
406
422
"""


print(frame.loc[frame["ISO-3"] == "COD"])
print(frame.loc[frame["ISO-3"] == "COG"])
'''
