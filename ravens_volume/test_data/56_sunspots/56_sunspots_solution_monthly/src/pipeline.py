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
dspath = os.path.join(here, '..', '..', '56_sunspots_dataset')
prpath = os.path.join(here, '..', '..', '56_sunspots_problem_monthly')
assert os.path.exists(dspath)
assert os.path.exists(prpath)
solpath = os.path.join(here, '..')

d3mds = D3MDS(dspath, prpath)

def handle_extra_suggested_target_columns(train_data):
	learningDataColumns = d3mds.dataset.get_learning_data_columns()
	suggestedTargetColumns = []
	for column in learningDataColumns:
		if 'suggestedTarget' in column['role']:
			suggestedTargetColumns.append(column)
	for column in suggestedTargetColumns:
		if column['colName'] in train_data.columns:
			train_data.pop(column['colName'])
	return train_data

# read the train data
train_data = d3mds.get_train_data()
train_data = handle_extra_suggested_target_columns(train_data)
train_data.index = train_data['time'].values

train_targets = pd.DataFrame(d3mds.get_train_targets(), index=train_data.index, columns=[col['colName'] for col in d3mds.problem.get_targets()])
train_data = pd.concat([train_data, train_targets], axis=1)
# print(train_data.shape)
# print(train_data.head())
# print(train_data.tail())

# train a model on train data
model = pf.ARIMA(data=train_data, ar=15, ma=5, target=[col['colName'] for col in d3mds.problem.get_targets()][0], family=pf.Normal())
x = model.fit("MLE")

# read the test data
test_data = d3mds.get_test_data()

# make predictions on test data
y_pred = model.predict(h=len(test_data))
assert y_pred.index.values.all() == test_data['time'].values.all() # sanity check to see if the predicted period is the same as in test data

# get the true test targets
y_truth = d3mds.get_test_targets().ravel()

# compute the performance score on test data
metric = d3mds.problem.get_performance_metrics()[0]['metric']
assert metric == 'rootMeanSquaredError'
score = sqrt(mean_squared_error(y_truth, y_pred))
print('rmse score:', score)

# save the predictions and the score
y_pred_df = pd.DataFrame(index=test_data.index, data=y_pred.iloc[:,0].values, columns=[col['colName'] for col in d3mds.problem.get_targets()])
y_pred_df.to_csv(os.path.join(solpath, 'predictions.csv'))

scoresdf = pd.DataFrame(columns=['metric','value'])
scoresdf.loc[len(scoresdf)]=['rootMeanSquaredError', score]
scoresdf.to_csv(os.path.join(solpath,'scores.csv'))

