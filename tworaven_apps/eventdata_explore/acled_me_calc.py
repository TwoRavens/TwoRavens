from pymongo import MongoClient
import datetime

import pandas as pd
import numpy as np
from scipy import stats
#~ import matplotlib
#~ matplotlib.use("agg")
import matplotlib.pylab as plt

import itertools

# look at source file, or look at mongo?
# create time series on action codes - one per each
# compare slope (derivative) on self and other action codes

mongo_client = MongoClient(host='localhost', port=27017)  # Default port
db = mongo_client.event_data.acled_middle_east

#to generalize this, read the formats from the initialization of eventdata
interaction = "\
10- SOLE MILITARY ACTION#\
11- MILITARY VERSUS MILITARY#\
12- MILITARY VERSUS REBELS#\
13- MILITARY VERSUS POLITICAL MILITIA#\
14- MILITARY VERSUS COMMUNAL MILITIA#\
15- MILITARY VERSUS RIOTERS#\
16- MILITARY VERSUS PROTESTERS#\
17- MILITARY VERSUS CIVILIANS#\
18- MILITARY VERSUS OTHER#\
20- SOLE REBEL ACTION (e.g. base establishment)#\
22- REBELS VERSUS REBELS#\
23- REBELS VERSUS POLITICAL MILIITA#\
24- REBELS VERSUS COMMUNAL MILITIA#\
25- REBELS VERSUS RIOTERS#\
26- REBELS VERSUS PROTESTERS#\
27- REBELS VERSUS CIVILIANS#\
28- REBELS VERSUS OTHERS#\
30- SOLE POLITICAL MILITIA ACTION#\
33- POLITICAL MILITIA VERSUS POLITICAL MILITIA#\
34- POLITICAL MILITIA VERSUS COMMUNAL MILITIA#\
35- POLITICAL MILITIA VERSUS RIOTERS#\
36- POLITICAL MILITIA VERSUS PROTESTERS#\
37- POLITICAL MILITIA VERSUS CIVILIANS#\
38- POLITICAL MILITIA VERSUS OTHERS#\
40- SOLE COMMUNAL MILITIA ACTION#\
44- COMMUNAL MILITIA VERSUS COMMUNAL MILITIA#\
45- COMMUNAL MILITIA VERSUS RIOTERS#\
46- COMMUNAL MILITIA VERSUS PROTESTERS#\
47- COMMUNAL MILITIA VERSUS CIVILIANS#\
48- COMMUNAL MILITIA VERSUS OTHER#\
50- SOLE RIOTER ACTION#\
55- RIOTERS VERSUS RIOTERS#\
56- RIOTERS VERSUS PROTESTERS#\
57- RIOTERS VERSUS CIVILIANS#\
58- RIOTERS VERSUS OTHERS#\
60- SOLE PROTESTER ACTION#\
66- PROTESTERS VERSUS PROTESTERS#\
67- PROTESTERS VERSUS CIVILIANS#\
68- PROTESTERS VERSUS OTHER#\
78- OTHER ACTOR VERSUS CIVILIANS#\
80- SOLE OTHER ACTION\
"

def minResStart(result):
    return min(result[2])

interaction = interaction.split("#")
for x in range(len(interaction)):
    interaction[x] = interaction[x].split("-")[0]

actionGroup = {}
for a in interaction:
    actionGroup["action" + a] = {"$sum": {"$cond": {"if": {"$eq": ["$INTERACTION", a]}, "then": 1, "else": 0}}}

actionGroup["_id"] = "$TwoRavens_start date"


res = list(db.aggregate([{"$group": actionGroup}]))

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
for col in res.columns.values.tolist():
    #calc mean and variance of column data
    mean = np.mean(res[[col]])
    var = np.var(res[[col]])
    #~ print(col)
    #~ print(res[[col]])
    print("mean")
    print(mean[0])
    print("var")
    print(var[0])
    print()

    if mean[0] < minMean and var[0] < 500:
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

#~ #if data contains zeroes, add 1 (keep shape and prevents divide by zero errors)
#~ for ac in actions:
    #~ if 0 in res[ac].tolist():
        #~ res[ac] += 1

#for each pair, calculate the overall Pearson and Kendall correlation, and the Pearson and Kendall correlation in the window
#~ print(res[["action10"]])
#~ print(res["action10"].tolist())
#~ print(len(res["action10"].tolist()))
#~ print(res[["action10"]].iloc[0:5])
for actionX, actionY in list(itertools.combinations(actions, 2)):
#~ for actionX, actionY in [("action10", "action12")]:
#~ for actionX, actionY in [("action10", "action25")]:
#~ for actionX, actionY in [("action25", "action56")]:
    storKey = [actionX, actionY]
    actionXData = res[[actionX]]
    actionYData = res[[actionY]]
    #~ print("Comparing", actionX, "and", actionY)
    #~ print("overall Pearson correlation:")
    globalPearsonResults.append((stats.pearsonr(actionXData, actionYData), storKey))
    #~ print("overall Kendall correlation:")
    globalKendallResults.append((stats.kendalltau(actionXData, actionYData), storKey))
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
                localPearsonResults.append((localPear, storKey, [sta-windowSize]))
                localKendallResults.append((localKend, storKey, [sta-windowSize]))
            #~ print()
        except:
            #https://stats.stackexchange.com/questions/220787/pearson-correlation-to-a-uniformly-distributed-dataset
            print("bad data")
            break
            #maybe also remove data from global?
            #how to catch warning?
    #~ print()

matchLimit = 5      #find top 5 results
maxGroup = 8

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
localPearsonFinal = []
for corRes in localPearsonResults:
    corr, acts, start = corRes
    merged = False
    for x in range(len(localPearsonFinal)):
        if len(localPearsonFinal[x][1]) > maxGroup:
            continue
        if acts[0] in localPearsonFinal[x][1] and acts[1] in localPearsonFinal[x][1] and within(start, localPearsonFinal[x][2]):
            # print(acts, x, "same actions, merging start points")
            localPearsonFinal[x][2].append(start[0])
            merged = True
            break
        elif acts[0] in localPearsonFinal[x][1] and within(start, localPearsonFinal[x][2]): #and starting points are close, moderately correlated?
            # print(acts, x, "matched action 0, merging actions")
            localPearsonFinal[x][1].append(acts[1])
            merged = True
            break
        elif acts[1] in localPearsonFinal[x][1] and within(start, localPearsonFinal[x][2]):
            # print(acts, x, "matched action 1, merging actions")
            localPearsonFinal[x][1].append(acts[0])
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
        localPearsonFinal.append(corRes)
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

plt.figure(2)
plt.suptitle("Local Pearson")
ctr = 1
for result in localPearsonFinal[0:5]:
    plt.subplot(3, 2, ctr)
    ctr += 1
    plt.title(str(result[0]))
    plt.plot(res.loc[:, result[1]].iloc[min(result[2]):max(result[2])+windowSize, :])
    plt.legend(result[1])

localKendallFinal = []

print("local kendall")
for corRes in localKendallResults:
    corr, acts, start = corRes
    merged = False
    for x in range(len(localKendallFinal)):
        if len(localKendallFinal[x][1]) > maxGroup:
            continue
        if acts[0] in localKendallFinal[x][1] and acts[1] in localKendallFinal[x][1] and within(start, localKendallFinal[x][2]):
            # print(acts, x, "same actions, merging start points")
            localKendallFinal[x][2].append(start[0])
            merged = True
            break
        elif acts[0] in localKendallFinal[x][1] and within(start, localKendallFinal[x][2]): #and starting points are close, moderately correlated?
            # print(acts, x, "matched action 0, merging actions")
            localKendallFinal[x][1].append(acts[1])
            merged = True
            break
        elif acts[1] in localKendallFinal[x][1] and within(start, localKendallFinal[x][2]):
            # print(acts, x, "matched action 1, merging actions")
            localKendallFinal[x][1].append(acts[0])
            merged = True
            break
    if not merged:
        localKendallFinal.append(corRes)
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
    plt.title(str(result[0]))
    plt.plot(res.loc[:, result[1]].iloc[min(result[2]):max(result[2])+windowSize, :])
    plt.legend(result[1])

plt.show()

"""
'''
loop w/ input commands:
q: quit
s: show
m: modify
    d1: date1
    d2: date2
    do: date grouping
    a: action1, action2, ...
    b: apply and show
h: help
'''

res = res.set_index(res["date"])

date1 = res["date"].min()
date2 = res["date"].max()
option = "month"
action = ["action10", "action12"]

def showOptions():
    print("set options:")
    print(date1)
    print(date2)
    print(option)
    print(action)

def setOptions():
    data = res.loc[date1:date2, action]
    #~ data.set_index(res["date"])
    #~ data = data.loc[date1:date2]
    print(option)
    sampType = ""
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
    data = data.resample(sampType).sum()
    plt.figure(0)
    plt.plot(data)
    plt.legend(action)

    #~ print("data")
    #~ print(data)
    #~ print()
    #~ print(data[action[0]].values)

    '''
    algo: sliding window of next measurement value (if year, 4 years (4 quarters to a year, so min 4 measurements))
    windows: sample on days -> window of 7 days (1 week)
            sample on weeks -> window of a month
            sample on months -> window of a quarter
            sample on quarters -> window of a year
            sample on years -> window of 4 years
    find correlation in window
    plot results
    if stable and close to 1 or -1, then overall correlation should be high
    if unstable, the stable regions that are close to 1 or -1 should have high correlation
    '''
    windowTypes = ["D", "W", "M", "Q", "A", "2A"]
    window = windowTypes[windowTypes.index(sampType) + 1]
    
    cor = []
    for a in action:
        cor.append(data[a].values)

    data['localCor'] = 0
    data['absCor'] = 0
    data['localSp'] = 0

    #temp pick window size of 4
    #~ for sta in range(len(data.index.values)-4):
    for sta in range(4, len(data.index.values)):
        #~ tempWindow = [cor[i][sta:min(sta+4, len(data.index.values))] for i in range(len(cor))]
        tempWindow = [cor[i][sta-4:sta] for i in range(len(cor))]
        tempCor = np.corrcoef(tempWindow)[0][1]
        print(tempCor)
        data.iloc[sta, 2] = tempCor
        data.iloc[sta, 3] = abs(tempCor)
        #~ data.iloc[sta, 4] =
        #~ print(stats.spearmanr(tempWindow[0], tempWindow[1])[0])    //bad because spearman correlation only for monotonic
        print(tempWindow)
        print(stats.kendalltau(tempWindow[0], tempWindow[1]))

    print()
    print(data)
    print()
    print(cor)
    print()
    print(stats.kendalltau(data[['action10']], data[['action12']]))
    for sta in range(10, len(data.index.values)):
        tempWindow = [cor[i][sta-10:sta] for i in range(len(cor))]
        tempCor = np.corrcoef(tempWindow)[0][1]
        print(tempCor)
        print(tempWindow)
        print(stats.kendalltau(tempWindow[0], tempWindow[1]))
    #~ print(data.iloc[0, 1])

    plt.figure(2)
    plt.plot(data.iloc[:,[2,3]])
        
    corOverall = np.corrcoef(cor)
    print("overall correlation:")
    print(corOverall)

    #plot difference over time
    diff = data[action[0]] - data[action[1]]
    plt.figure(1)
    plt.plot(diff)

    #idea: calculate the delta and initial value of each window of each time series
    #then heirarchically cluster these

    #look into exponential averaging correlation between consecutive windows

while True:
    command = input("Enter command: ")
    if command == 'q':
        exit()
    elif command == 'h':
        print("q: quit")
        print("s: show")
        print("m: modify")
        print("\td1: date1")
        print("\td2: date2")
        print("\tdo: day/week/month/quarter/year (default month)")
        print("\ta: action1, action2, ...")
        print("\b: apply and show")
    elif command == 's':
        showOptions()
        #apply options
        setOptions()
        plt.show()
    elif command == 'm':
        showOptions()
        while True:
            c = input("Enter option: ")
            if c == 'b':
                print("entered the following options:")
                showOptions()
                break
            elif c == 'd1':
                date1 = datetime.datetime.strptime(input("Enter start date: "), "%Y-%m-%d")
            elif c == 'd2':
                date2 = datetime.datetime.strptime(input("Enter end date: "), "%Y-%m-%d")
            elif c == 'do':
                while True:
                    t = input("Enter time option: ")
                    if t not in ["day", "week", "month", "quarter", "year"]:
                        print("bad option")
                    else:
                        option = t
                        break
            elif c == 'a':
                action = input("Enter actions (all for all): ").split(", ")
                if action == ['all']:
                    action = res.columns.values.tolist()
                    action.remove('date')
            else: print("unknown")
    else: print("unknown")
        
# http://www.statsoft.com/Textbook/Time-Series-Analysis
# https://bitquill.net/pdf/loco_icdm06.pdf
# https://faculty.ist.psu.edu/xzz89/publications/CARE_ICDE08.pdf
# http://ahay.org/RSF/book/tccs/attr/paper_html/node7.html

'''
examples of interesting:
current -> drift apart
extreme diffrenece in corrleation
'''
"""
