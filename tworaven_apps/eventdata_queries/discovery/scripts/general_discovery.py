from pymongo import MongoClient
import datetime

import pandas as pd
import numpy as np
from scipy import stats
#~ import matplotlib
#~ matplotlib.use("agg")
import matplotlib.pylab as plt

import itertools
import json
import copy

# look at source file, or look at mongo?
# create time series on action codes - one per each
# compare slope (derivative) on self and other action codes

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
print(mongo_client.event_data.list_collection_names())
#~ selectedDB = input("database name: ")
#~ while selectedDB not in mongo_client.event_data.list_collection_names():
    #~ selectedDB = input("database name: ")
#~ if selectedDB in ["mid", "cline_speed", "ged", "gtd"]:
    #~ print("currently not supported (no action type)")
    #~ exit()
selectedDB = "acled_middle_east"
db = mongo_client.event_data[selectedDB]

def minResStart(result):
    return min(result[2])
'''
interaction = interaction.split("#")
for x in range(len(interaction)):
    interaction[x] = interaction[x].split("-")[0]
'''

pathToSetup = "../../"	#path to eventdata_queries
#open the format file
aggregateQ = ""
interaction = []
with open(pathToSetup + "collections/" + selectedDB + ".json") as inFile:
    data = json.load(inFile)
    aggregateQ = data["subsets"]["Action"]["columns"][0]
    formatFile = data["formats"][aggregateQ]
    with open(pathToSetup + "formats/" + formatFile + ".json") as forFile:
        formatData = json.load(forFile)
        #~ print(formatData)
        for d in formatData:
            interaction.append(d)
        #~ print(interaction)
#~ exit()
#~ if "acled" in selectedDB:
    #~ with open("../eventdata_queries/formats/ACLED_inter.json") as inFile:
        #~ data = json.load(inFile)
        #~ for d in data
    #~ interaction = 

actionGroup = {}
for a in interaction:
    #~ actionGroup["action" + a] = {"$sum": {"$cond": {"if": {"$eq": ["$INTERACTION", a]}, "then": 1, "else": 0}}}
    actionGroup["action" + a] = {"$sum": {"$cond": {"if": {"$eq": ["$" + aggregateQ, a]}, "then": 1, "else": 0}}}

actionGroup["_id"] = "$TwoRavens_start date"


res = list(db.aggregate([{"$group": actionGroup}], allowDiskUse=True))

res = pd.DataFrame(res).rename(columns={"_id": "date"}).sort_values(by=["date"])
res["date"] = pd.to_datetime(res["date"])

#convert to series
res = res.set_index(res["date"])

#drop date column
res = res.drop("date", axis='columns')

#calculate the pairs with highest correlation

#pick date aggregation type
dateGroup = "M"
'''
    if option == "day":
        sampType = "D"
    elif option == "week":
        sampType = "W"
    elif option == "month":
        sampType = "M"
    elif option == "quarter":
        sampType = "Q"
    elif option == "year":
        sampType = "A"
'''
res = res.resample(dateGroup).sum()

#TODO: remove results that have a lot of 0 or low entries because they skew results
minMean = 20
minVar = 500
for col in res.columns.values.tolist():
    #calc mean and variance of column data
    mean = np.mean(res[[col]])
    var = np.var(res[[col]])
    #~ print(col)
    #~ print(res[[col]])
    #~ print("mean")
    #~ print(mean[0])
    #~ print("var")
    #~ print(var[0])
    #~ print()

    if mean[0] < minMean and var[0] < minVar:
        print('dropping', col)
        res.drop([col], axis=1, inplace=True)
        #~ print('dropped')

windowSize = 10
confidenceMargin = 0.05     #95% confident

globalPearsonResults = []
globalKendallResults = []

localPearsonResults = []
localKendallResults = []

#create all pairs
actions = res.columns.values.tolist()

#for each pair, calculate the overall Pearson and Kendall correlation, and the Pearson and Kendall correlation in the window
for actionX, actionY in list(itertools.combinations(actions, 2)):
    storKey = [actionX, actionY]
    actionXData = res[[actionX]]
    actionYData = res[[actionY]]
    #~ print("Comparing", actionX, "and", actionY)
    #~ print("overall Pearson correlation:")
    globalPearsonResults.append((stats.pearsonr(actionXData, actionYData), [actionX, actionY]))
    #~ print("overall Kendall correlation:")
    globalKendallResults.append((stats.kendalltau(actionXData, actionYData), [actionX, actionY]))
    #~ print(actionXData, actionYData)

    for sta in range(windowSize, len(res.index.values)):
        actionXWin = actionXData.iloc[sta-windowSize:sta]
        actionYWin = actionYData.iloc[sta-windowSize:sta]
        #~ print("local Pearson correlation @ index", sta)
        try:
            localPear = stats.pearsonr(actionXWin, actionYWin)
            #~ print("local Kendall correlation @ index", sta)
            localKend = stats.kendalltau(actionXWin, actionYWin)
            #~ print(localPear, localKend)
            #~ print(localPear[0][0])
            #~ print(localKend[0])

            if localPear[1][0] < confidenceMargin or localKend[1] < confidenceMargin:
                localPearsonResults.append((localPear, [actionX, actionY], [sta-windowSize]))
                localKendallResults.append((localKend, [actionX, actionY], [sta-windowSize]))
            #~ print()
        except:
            #https://stats.stackexchange.com/questions/220787/pearson-correlation-to-a-uniformly-distributed-dataset
            print("bad data")
            break
            #maybe also remove data from global?
            #how to catch warning?
    #~ print()

matchLimit = 5      #find top 5 results
maxGroup = 8        #max 8 results in a group

#sort global results first by correlation and then by p value
globalPearsonResults.sort(key=lambda re: (-abs(re[0][0][0]), re[0][1][0]))
globalKendallResults.sort(key=lambda re: (-abs(re[0][0]), re[0][1]))

print("top 5 global results")
print("global pearson")
print(globalPearsonResults[0:5])
print("global kendall")
print(globalKendallResults[0:5])
print()

#~ plt.figure(0)
#~ plt.suptitle("Global Pearson")
#~ ctr = 1
#~ for result in globalPearsonResults[0:5]:
    #~ plt.subplot(3, 2, ctr)
    #~ ctr += 1
    #~ plt.title(str(result[0]))
    #~ plt.plot(res.loc[:, result[1]])
    #~ plt.legend(result[1])

#~ plt.figure(1)
#~ plt.suptitle("Global Kendall")
#~ ctr = 1
#~ for result in globalKendallResults[0:5]:
    #~ plt.subplot(3, 2, ctr)
    #~ ctr += 1
    #~ plt.title(str(result[0]))
    #~ plt.plot(res.loc[:, result[1]])
    #~ plt.legend(result[1])

#sort local results first by correlation and then by p value
localPearsonResults.sort(key=lambda re: (-abs(re[0][0][0]), re[0][1][0]))
localKendallResults.sort(key=lambda re: (-abs(re[0][0]), re[0][1]))

def within(localRange, allRange):
    localStart = min(allRange)
    localEnd = max(allRange)
    #~ if min(localRange) >= localStart and max(localRange) <= localEnd:
    if abs(min(localRange) - localStart) < 3 and abs(max(localRange) - localEnd) < 3:
        return True
    return False

#now merge local results if they are on the same pair
#TODO: remove duplicates
localPearsonFinal = []
for corRes in localPearsonResults:
    #structure of object in localPearsonFinal: [correlation, [actions], [start points], [original actions]]
    corr, acts, start = corRes
    merged = False
    for x in range(len(localPearsonFinal)):
        if len(localPearsonFinal[x][1]) > maxGroup:
            continue
        if acts[0] in localPearsonFinal[x][3] and acts[1] in localPearsonFinal[x][3] and within(start, localPearsonFinal[x][2]):
            # print(acts, x, "same actions, merging start points")
            localPearsonFinal[x][2].append(start[0])
            merged = True
            break
        elif acts[0] in localPearsonFinal[x][3] and within(start, localPearsonFinal[x][2]): #and starting points are close, moderately correlated?
            # print(acts, x, "matched action 0, merging actions")
            if acts[1] not in localPearsonFinal[x][1]: localPearsonFinal[x][1].append(acts[1])
            merged = True
            break
        elif acts[1] in localPearsonFinal[x][3] and within(start, localPearsonFinal[x][2]):
            # print(acts, x, "matched action 1, merging actions")
            if acts[0] not in localPearsonFinal[x][1]: localPearsonFinal[x][1].append(acts[0])
            merged = True
            break
        #~ elif acts[0] in localPearsonFinal[x][1]: #and starting points are close, moderately correlated?
            #~ # print(acts, x, "matched action 0, merging actions")
            #~ localPearsonFinal[x][1].append(acts[1])
            #~ merged = True
            #~ break
        #~ elif acts[1] in localPearsonFinal[x][1]:
            #~ # print(acts, x, "matched action 1, merging actions")
            #~ localPearsonFinal[x][1].append(acts[0])
            #~ merged = True
            #~ break
    if not merged:
        orig = copy.deepcopy(acts)
        localPearsonFinal.append([corr, acts, start, orig])
    '''
    if acts in [x[1] for x in localPearsonFinal]:
        #append this result's start to the tuple stored
        print(x, corRes, localPearsonFinal)
    #maybe merge actions if the starting points are close and moderately correlated
    else:
        #insert this result into the final result
        localPearsonFinal.append(corRes)
    '''
    #~ if len(localPearsonFinal) > matchLimit:
        #~ break

print("top 5 local results")
print("local pearson")
print(localPearsonFinal[0:5])
print()

plt.figure(2)
plt.suptitle("Local Pearson")
ctr = 1
for result in localPearsonFinal[0:6]:
    plt.subplot(3, 2, ctr)
    ctr += 1
    plt.title("Graph " + str(ctr-1) + str(result[0]) + str(result[3]))
    plt.plot(res.loc[:, result[1]].iloc[min(result[2]):max(result[2])+windowSize, :])
    plt.legend(result[1])
#~ plt.show()

localKendallFinal = []

print("local kendall")
for corRes in localKendallResults:
    corr, acts, start = corRes
    merged = False
    for x in range(len(localKendallFinal)):
        if len(localKendallFinal[x][1]) > maxGroup:
            continue
        if acts[0] in localKendallFinal[x][3] and acts[1] in localKendallFinal[x][3] and within(start, localKendallFinal[x][2]):
            # print(acts, x, "same actions, merging start points")
            localKendallFinal[x][2].append(start[0])
            merged = True
            break
        elif acts[0] in localKendallFinal[x][3] and within(start, localKendallFinal[x][2]): #and starting points are close, moderately correlated?
            # print(acts, x, "matched action 0, merging actions")
            if acts[1] not in localKendallFinal[x][1]: localKendallFinal[x][1].append(acts[1])
            merged = True
            break
        elif acts[1] in localKendallFinal[x][3] and within(start, localKendallFinal[x][2]):
            # print(acts, x, "matched action 1, merging actions")
            if acts[0] not in localKendallFinal[x][1]: localKendallFinal[x][1].append(acts[0])
            merged = True
            break
    if not merged:
        orig = copy.deepcopy(acts)
        localKendallFinal.append([corr, acts, start, orig])
    #~ if len(localKendallFinal) > matchLimit:  limit to 5 results
        #~ break
print(localKendallFinal[0:5])
print()

plt.figure(3)
plt.suptitle("Local Kendall")
ctr = 1
for result in localKendallFinal[0:5]:
    plt.subplot(3, 2, ctr)
    ctr += 1
    plt.title("Graph " + str(ctr-1) + str(result[0]) + str(result[3]))
    plt.plot(res.loc[:, result[1]].iloc[min(result[2]):max(result[2])+windowSize, :])
    plt.legend(result[1])

#~ plt.show()

#temp save output of top 4 of each
'''
for im, ty in zip([globalPearsonResults, globalKendallResults, localPearsonFinal, localKendallFinal], ["globalPearson", "globalKendall", "localPearson", "localKendall"]):
    for img, n in zip(im[0:4], [z for z in range(4)]):
        #~ print(img)
        plt.figure()
        plt.title(str(img[0]))
        #~ print(ty)
        #~ print(img)
        if "global" in ty:
            print(ty)
            print(img)
            plt.plot(res.loc[:, img[1]])
        else:
            plt.plot(res.loc[:, img[1]].iloc[min(img[2]):max(img[2])+windowSize, :])
        plt.legend(img[1])
        plt.savefig('../images/' + ty + str(n) + '.png')
'''

#cleanup results and save to file
results = {}
results["windowSize"] = 10
results["aggregateDateType"] = dateGroup
results["confidenceMargin"] = 1 - confidenceMargin

#pick top and bottom 10 of each group
selectRange = 10
results["max"] = {}
results["min"] = {}
for ra, key in zip([globalPearsonResults, localPearsonFinal, globalKendallResults, localKendallFinal], ["globalPearson", "localPearson", "globalKendall", "localKendall"]):
    results["max"][key] = []
    for r in ra[:selectRange]:
        if "Pearson" in key:
            re = {
                "correlation": r[0][0][0],
                "p-val": r[0][1][0],
                "actions": r[1]
            }
        else:
            re = {
                "correlation": r[0][0],
                "p-val": r[0][1],
                "actions": r[1]
            }
        if "local" in key:
            re["start"] = str(res.index[min(r[2])])[:10]
            re["end"] = str(min(res.index[max(r[2])], res.index[-1]))[:10]
            re["original"] = r[3]
            reData = json.loads(res.loc[:, r[1]].iloc[min(r[2]):min(max(r[2])+windowSize, len(res.index)), :].to_json(orient="records", date_format="iso"))
            for reI, reD in zip(reData, res.index[min(r[2]):min(max(r[2])+windowSize, len(res.index))]):
                reI["date"] = str(reD)[:10]       #replace date with the actual date field from config
            re["data"] = reData
        else:
            re["start"] = str(res.index[0])[:10]
            re["end"] = str(res.index[-1])[:10]
            reData = json.loads(res.loc[:, r[1]].to_json(orient="records", date_format="iso"))
            for reI, reD in zip(reData, res.index):
                reI["date"] = str(reD)[:10]
            re["data"] = reData
        results["max"][key].append(re)
for ra, key in zip([globalPearsonResults, localPearsonFinal, globalKendallResults, localKendallFinal], ["globalPearson", "localPearson", "globalKendall", "localKendall"]):
    results["min"][key] = []
    for r in ra[-selectRange:]:
        if "Pearson" in key:
            re = {
                "correlation": r[0][0][0],
                "p-val": r[0][1][0],
                "actions": r[1]
            }
        else:
            re = {
                "correlation": r[0][0],
                "p-val": r[0][1],
                "actions": r[1]
            }
        if "local" in key:
            re["start"] = str(res.index[min(r[2])])[:10]
            re["end"] = str(min(res.index[max(r[2]) + windowSize], res.index[-1]))[:10]
            re["original"] = r[3]
            reData = json.loads(res.loc[:, r[1]].iloc[min(r[2]):min(max(r[2])+windowSize, len(res.index)), :].to_json(orient="records", date_format="iso"))
            for reI, reD in zip(reData, res.index[min(r[2]):min(max(r[2])+windowSize, len(res.index))]):
                reI["date"] = str(reD)[:10]       #replace date with the actual date field from config
            re["data"] = reData
        else:
            re["start"] = str(res.index[0])[:10]
            re["end"] = str(res.index[-1])[:10]
            reData = json.loads(res.loc[:, r[1]].to_json(orient="records", date_format="iso"))
            for reI, reD in zip(reData, res.index):
                reI["date"] = str(reD)[:10]
            re["data"] = reData
        results["min"][key].append(re)
'''
#pick max(8, aggregate size / 3) groups to show max correl, median correl, and min correl?
#for now: save all results to file in a sorted array -> let front end pick
globalPearsonSave = []
for r in globalPearsonResults:
    re = {
        "correlation": r[0][0][0],
        "p-val": r[0][1][0],
        "actions": r[1]
    }
    globalPearsonSave.append(re)
results["globalPearson"] = globalPearsonSave

globalKendallSave = []
for r in globalKendallResults:
    re = {
        "correlation": r[0][0],
        "p-val": r[0][1],
        "actions": r[1]
    }
    globalKendallSave.append(re)
results["globalKendall"] = globalKendallSave

localPearsonSave = []
for r in localPearsonFinal:
    re = {
        "correlation": r[0][0][0],
        "p-val": r[0][1][0],
        "actions": r[1],
        "start": str(res.index[min(r[2])])[:10],
        "end": str(min(res.index[max(r[2])], res.index[-1]))[:10],
        "original": r[3]
    }
    localPearsonSave.append(re)
results["localPearson"] = localPearsonSave

localKendalSave = []
for r in localKendallFinal:
    re = {
        "correlation": r[0][0],
        "p-val": r[0][1],
        "actions": r[1],
        "start": str(res.index[min(r[2])])[:10],
        "end": str(min(res.index[max(r[2])], res.index[-1]))[:10],
        "original": r[3]
    }
    localKendalSave.append(re)
results["localKendall"] = localKendalSave
'''

#write to file
#with open("../output/" + selectedDB + "_output.json", "w") as outFile:
with open("../output/" + selectedDB + "_raw.json", "w") as outFile:
    outFile.write(json.dumps(results, indent=4))


#~ print(res)
#~ print(localPearsonFinal[0])
#~ print(res.loc[:, localPearsonFinal[0][1]].iloc[min(localPearsonFinal[0][2]): max(localPearsonFinal[0][2])+windowSize, :])
#~ print(res.index[min(localPearsonFinal[0][2])])
#~ print(res.index[-1])
#~ print(str(res.index[-1])[:10])
#~ print(res.iloc[min(localPearsonFinal[0][2]): max(localPearsonFinal[0][2])+windowSize, :])
#~ plt.show()
