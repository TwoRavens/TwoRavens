import os, sys
import pandas as pd 

ldfpath = sys.argv[1] # path to learningData.csv
dsfpath = sys.argv[2] # path to dataSplits.csv
assert os.path.exists(ldfpath)
assert os.path.exists(dsfpath)

# here = os.path.dirname(os.path.abspath(__file__))
# ldfpath = os.path.join(here, '..','56_sunspots_monthly_dataset','tables','learningData.csv')
# dsfpath = os.path.join(here, 'dataSplits.csv')

ldf = pd.read_csv(ldfpath)

# print(ldf.head())
# print(ldf.tail())

ldf['type']=['TRAIN']*len(ldf) # by default set all to TRAIN

ldf['year']=ldf['year-month'].apply(lambda x: int(str(x).split('-')[0]))
# only rows with year >= 2016 will be set to TEST
ldf['type'] = (ldf['year'].apply(lambda x: 'TEST' if x >= 2016 else 'TRAIN'))

print(ldf[ldf['type']=='TRAIN'].shape, ldf[ldf['type']=='TEST'].shape)
ldf = ldf.drop(columns=['year-month','sunspots', 'year'], axis=1)
ldf['fold']=[0]*len(ldf)
ldf['repeat']=[0]*len(ldf)
ldf = ldf.set_index('d3mIndex')
print(ldf.head())
print(ldf.tail())
ldf.to_csv(dsfpath)
