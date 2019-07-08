# coding: utf-8

import os, json, itertools, sys
import pandas as pd
from d3mds import D3MDataset, D3MProblem, D3MDS
import pyflux as pf
from sklearn.metrics import mean_squared_error
from math import sqrt
import numpy as np
from collections import OrderedDict

EXCLUDE_SUGGESTED_TARGET_COLUMNS = True

here = os.path.dirname(os.path.abspath(__file__))
dspath = os.path.join(here, '..', '..', '56_sunspots_monthly_dataset')
prpath = os.path.join(here, '..', '..', '56_sunspots_monthly_problem')
assert os.path.exists(dspath)
assert os.path.exists(prpath)
solpath = os.path.join(here, '..')

d3mds = D3MDS(dspath, prpath)

np.random.seed(42)

# read the train data
train_data = d3mds.get_train_data()
train_targets = d3mds.get_train_targets().ravel()
series = pd.concat([train_data, pd.DataFrame(train_targets, columns=['sunspots'])], axis=1)
series = series.set_index('year-month', drop=True)
series.index = pd.to_datetime(series.index, format='%Y-%m')

print ('\nshape: \n', series.shape)
print('\ncolumns: \n', list(series.columns))
print ('\ndescribe: \n', series.describe())
print('\nhead: \n', series.head())
print('\ndata types: \n', series.dtypes)


model = pf.ARIMA(data=series, ar=4, ma=4, target='sunspots', family=pf.Normal())
# model = pf.ARIMA(data=series, ar=4, ma=4, family=pf.Exponential())
x =  model.fit('MLE')

# read the test data
test_data = d3mds.get_test_data()
h = (len(test_data))

predictions = pd.DataFrame(model.predict(h=h, intervals=False)) # outputs dataframe of predictions    
predictions.index = test_data.index
predictions.columns = ['sunspots']
predictions.to_csv(os.path.join(solpath, 'predictions.csv'))

# get the true test targets
y_truth = d3mds.get_test_targets().ravel()

# compute the performance score on test data
metric = d3mds.problem.get_performance_metrics()[0]['metric']
assert metric == 'rootMeanSquaredError'
score = sqrt(mean_squared_error(y_truth, predictions))
print('rmse score:', score)
scoresdf = pd.DataFrame(columns=['metric','value','randomSeed','fold'])
scoresdf.loc[len(scoresdf)]=['rootMeanSquaredError', score, 42, 0]
scoresdf.to_csv(os.path.join(solpath,'scores.csv'), index=None)