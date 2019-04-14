from pymongo import MongoClient
import datetime

import pandas as pd
import numpy as np
from scipy import stats
#~ import matplotlib
#~ matplotlib.use("agg")
import matplotlib.pylab as plt

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

interaction = interaction.split("#")
for x in range(len(interaction)):
    interaction[x] = interaction[x].split("-")[0]

actionGroup = {}
for a in interaction:
    actionGroup["action" + a] = {"$sum": {"$cond": {"if": {"$eq": ["$INTERACTION", a]}, "then": 1, "else": 0}}}

#~ actionGroup["_id"] = {"date": "$TwoRavens_start date"}
actionGroup["_id"] = "$TwoRavens_start date"
#~ print(actionGroup)

res = list(db.aggregate([{"$group": actionGroup}]))
'''
#group by id: date, interX = $sum: $INTER == X

#~ res = db.aggregate(
#~ [
    #~ {"$group": {"_id": {"date": "$TwoRavens_start date", "action": "$INTERACTION"}, "count": {"$sum": 1}}},
    #~ {"$project": {"date": "$_id.date", "action": "$_id.action", "count": 1, "_id": 0}}
#~ ])

#~ print(res[0:3])
#~ print([x for x in res if x["_id"] == datetime.datetime(2019, 1, 5, 0, 0)])

1. group
2. project

db.acled_middle_east.aggregate([{$group: {"_id": {"date": "$TwoRavens_start date", "action": "$INTERACTION"}, "count": {$sum: 1}}}])

db.acled_middle_east.aggregate([{$group: {"_id": {"date": "$TwoRavens_start date", "action": "$INTERACTION"}, "count": {$sum: 1}}}, {$project: {"date": "$_id.date", "action": "$_id.action", "count": 1, "_id": 0}}])

'''

res = pd.DataFrame(res).rename(columns={"_id": "date"}).sort_values(by=["date"])
res["date"] = pd.to_datetime(res["date"])
#~ print(res.iloc[0:2].to_string())

'''
https://towardsdatascience.com/playing-with-time-series-data-in-python-959e2485bff8
https://www.analyticsvidhya.com/blog/2016/02/time-series-forecasting-codes-python/
'''

#~ data = res[["date", "action10"]]

#below is ex of working
#~ data = res.loc[:, ["action10"]]
#~ data = data.set_index(res["date"])
#~ data = data.resample("M").sum()
#~ print(data.head())
#~ plt.plot(data)
#~ plt.show()

#~ plt.plot(res[["date", "action10"]])
#~ plt.show()

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
