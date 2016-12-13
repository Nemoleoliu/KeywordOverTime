import csv
import json
from datetime import datetime
import time

keywords = []
data = []

kwdict = {}
dates = []
datedict = {}
date_min = None
date_max = None
with open('mydata2.csv', 'rb') as csvfile:
    spamreader = csv.reader(csvfile, delimiter=',', quotechar='|')
    for row in spamreader:
        kw = row[0]
        if kw not in kwdict:
            kwdict[kw] = len(keywords)
            keywords.append(kw)

with open('mydata2.csv', 'rb') as csvfile:
    spamreader = csv.reader(csvfile, delimiter=',', quotechar='|')
    for row in spamreader:
        kw = row[0]
        date = row[1]
        count = row[2]
        dobj = datetime.strptime(date, '%Y')
        date = int(time.mktime(dobj.timetuple())) * 1000
        if date_min is None:
            date_min = date
            date_max = date
        else:
            date_min = min(date_min, date)
            date_max = max(date_max, date)
        if date not in datedict:
            datedict[date] = len(data)
            data.append({
                'date': date,
                'values': [0] * len(keywords),
            })
        data[datedict[date]]['values'][kwdict[kw]] = int(count)

ret = {
    'keywords':keywords,
    'timerange':[date_min, date_max],
    'data':data,
}
with open('data.json', 'w') as outfile:
    json.dump(ret, outfile)
