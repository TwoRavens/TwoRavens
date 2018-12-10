# this is used to import gtd countries into the countries file

import json
import sys
import os
import pandas as pd


#~ with open(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'alignments', 'country.json'))) as locfile:
    #~ alignment = json.load(locfile)

cowcodes = pd.read_csv("../alignments/COWcodes.csv")
    
frame = pd.read_json(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'alignments', 'country.json')))
frame = frame.fillna("-1")

#~ frame = frame.drop(["UN M.49", "region"], axis=1)

#add missing ICEWS country codes in
#~ frame = frame.join(cowcodes.set_index(["StateAbb"]), on="ISO-3")
frame = frame.join(cowcodes.set_index(["CCode"]), on="cowcode")
for index, row in frame.iterrows():
	if row["ICEWS"] == "-1":
		row["ICEWS"] = row["StateNme"]
print(frame.to_string())
print()
#~ print(frame.loc[frame["ICEWS"] == "-1"]["StateNme"])
#~ frame["ICEWS"].loc[frame["ICEWS"] == "-1"] = frame.loc[frame["ICEWS"] == "-1"]["StateNme"]

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
