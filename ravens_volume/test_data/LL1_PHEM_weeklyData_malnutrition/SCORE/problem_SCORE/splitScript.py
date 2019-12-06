import os, sys
import pandas as pd 

ldfpath = sys.argv[1] # path to learningData.csv
dsfpath = sys.argv[2] # path to dataSplits.csv
assert os.path.exists(ldfpath)

MULTIINDEX = ['RegionName','ZoneName','WoredaName']

#load dataframe
ldf = pd.read_csv(ldfpath, parse_dates=['dateTime'])
print('full size', ldf.shape)

#index test samples. assign type
train_idx=(ldf[ldf['dateTime']<'2019-01-01']).index
test_idx=(ldf[ldf['dateTime']>='2019-01-01']).index

# remove test multi-indices not in train multi-indices
train_df = ldf.loc[train_idx].copy()
test_df = ldf.loc[test_idx].copy()
train_index_set = set(train_df.set_index(MULTIINDEX).index)
test_index_set = set(test_df.set_index(MULTIINDEX).index)
index_in_test_not_in_train = (test_index_set - train_index_set)
for index in index_in_test_not_in_train:
	delete_index = (test_df[(test_df[MULTIINDEX[0]]==index[0])&(test_df[MULTIINDEX[1]]==index[1])&(test_df[MULTIINDEX[2]]==index[2])].index)
	test_df = test_df.drop(delete_index)
test_idx = test_df.index
print('test size', len(test_idx))

ldf['type'] = ['TRAIN']*len(ldf)
ldf.loc[test_idx, 'type'] = 'TEST'

print(ldf[ldf['type']=='TRAIN'].shape, ldf[ldf['type']=='TEST'].shape)

#assign fold and repeat
ldf['fold']=[0]*len(ldf)
ldf['repeat']=[0]*len(ldf)

#remove other columns
ldf = ldf[['d3mIndex','type','fold','repeat']]
ldf = ldf.set_index('d3mIndex')

print(ldf.head())
print(ldf.tail())

#save dataSplits
ldf.to_csv(dsfpath)
