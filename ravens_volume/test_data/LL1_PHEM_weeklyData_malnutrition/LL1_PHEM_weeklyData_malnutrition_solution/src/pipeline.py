# coding: utf-8

import os, sys, json
import pandas as pd
from d3mds import D3MDataset, D3MProblem, D3MDS
from sklearn.metrics import mean_absolute_error, mean_squared_error
from datetime import datetime
import pyflux as pf
import numpy as np

# set the path and ensure that paths exist
here = os.path.dirname(os.path.abspath(__file__))
dspath = os.path.join(here, '..', '..', 'LL1_PHEM_weeklyData_malnutrition_dataset')
prpath = os.path.join(here, '..', '..', 'LL1_PHEM_weeklyData_malnutrition_problem')
solpath = os.path.join(here, '..')
assert os.path.exists(dspath)
assert os.path.exists(prpath)

GRACE_PERIOD = 5
LOOK_BACK_WINDOW = 200
TARGET = 'Malnutrition_total_Cases'
MULTIINDEX = ['RegionName','ZoneName','WoredaName']
TIME = 'dateTime'
LEVEL = [0,1,2]

def prep(X, y):
	aDF = X.copy()
	aDF[TARGET] = y
	aDF.set_index(MULTIINDEX, drop=True, inplace=True)
	## standardize date format
	aDF[TIME] = aDF[TIME].apply(lambda d: pd.to_datetime(d).strftime('%m/%d/%Y'))
	## drop rows with missing values in time col
	# aDF.dropna(subset=[TIME], inplace=True)
	return aDF

def is_outlier(points, thresh=2.0):
    """
    https://github.com/joferkington/oost_paper_code/blob/master/utilities.py
    https://stackoverflow.com/questions/22354094/pythonic-way-of-detecting-outliers-in-one-dimensional-observation-data
    Returns a boolean array with True if points are outliers and False 
    otherwise.

    Parameters:
    -----------
        points : An numobservations by numdimensions array of observations
        thresh : The modified z-score to use as a threshold. Observations with
            a modified z-score (based on the median absolute deviation) greater
            than this value will be classified as outliers.

    Returns:
    --------
        mask : A numobservations-length boolean array.

    References:
    ----------
        Boris Iglewicz and David Hoaglin (1993), "Volume 16: How to Detect and
        Handle Outliers", The ASQC Basic References in Quality Control:
        Statistical Techniques, Edward F. Mykytka, Ph.D., Editor. 
    """
    if len(points.shape) == 1:
        points = points[:,None]
    median = np.median(points, axis=0)
    diff = np.sum((points - median)**2, axis=-1)
    diff = np.sqrt(diff)
    med_abs_deviation = np.median(diff)

    modified_z_score = 0.6745 * diff / med_abs_deviation

    return modified_z_score > thresh

# get train and test data
d3mds = D3MDS(dspath, prpath)
X_train = d3mds.get_train_data()
X_train[TIME] = X_train[TIME].astype('datetime64[ns]')
y_train = d3mds.get_train_targets()
X_train[TARGET] = y_train
X_train.set_index(MULTIINDEX, drop=True, inplace=True)

models = {}
for i,(idx, df) in enumerate(X_train.groupby(level=LEVEL)):
	print('training mode for: ', idx)
	df = df.tail(LOOK_BACK_WINDOW)
	
	series = df[[TIME, TARGET]].copy()
	series.set_index(TIME, drop=True, inplace=True)
	filled_series = pd.DataFrame(pd.date_range(df[TIME].min(), df[TIME].max()), columns=[TIME])
	filled_series[TIME] = filled_series[TIME].astype('datetime64[ns]')
	filled_series = filled_series.join(series, on=[TIME])
	filled_series.set_index(TIME, drop=True, inplace=True)
	filled_series[TARGET] = filled_series[TARGET].interpolate(method='linear', limit_direction='both')
		
	# train the model with best config and store the model along with the cutoff
	(ar, ma, integ) = (1,1,0)
	model = pf.ARIMA(filled_series, ar, ma, integ, family=pf.Normal())
	model.fit('MLE')
	# store the trained model along with the cutoff
	cutoff = df[TIME].max()
	models[idx] = (model, cutoff)
	# if i >=100:
	# 	break

X_test = d3mds.get_test_data()
X_test_index = X_test.index.copy()
X_test[TIME] = X_test[TIME].astype('datetime64[ns]')
X_test.set_index(MULTIINDEX, drop=True, inplace=True)
y_test = d3mds.get_test_targets()

predictions = []
for i,(idx, df) in enumerate(X_test.groupby(level=LEVEL)):
	print('testing mode for: ', idx)
	(M, cutoff) = models[idx]
	h = ((df[TIME].max()-cutoff).days) + GRACE_PERIOD
	# make predictions
	try:
		predictions_df = pd.DataFrame(M.predict(h))
	except Exception as inst:
		if type(inst) == ValueError: # this means that the h (horizon) is longer than lookback
			# resolution strategy: pad the rest of the horizon with last known prediciton value
			possible_predictions = (int(inst.args[0].split('from shape (')[1].split(')')[0]))-1
			required_predictions = (int(inst.args[0].split('to shape (')[1].split(')')[0]))
			predictions_df = pd.DataFrame(M.predict(possible_predictions))
			last_value = predictions_df.iloc[[-1]].values[0][0]
			for i in range(0, (required_predictions- possible_predictions)):
				next_date = predictions_df.index[-1]+1
				predictions_df = predictions_df.append(pd.DataFrame(data=[[last_value]], columns=predictions_df.columns, index=[next_date]), ignore_index=False)	
	predictions_df = pd.merge(left=df, right=predictions_df, left_on=TIME, right_index=True)
	predictions.append(predictions_df)
	# if i >=100:
	# 	break

y_pred = pd.DataFrame(pd.concat(predictions, axis=0)[TARGET].values) # concat all the predictions
# set the index and column headers for the predicted data
y_pred.index = X_test_index
y_pred.columns = [x['colName'] for x in d3mds.problem.get_targets()]

# outlier detection and median substitution in the predictions
y_pred_df = y_pred.copy()
outlier_mask = is_outlier(y_pred_df[TARGET])
not_outlier_mask = ~outlier_mask
print('==== # outliers in predictions:', sum(outlier_mask), "====")
print(y_pred_df[TARGET][outlier_mask])
median_value = y_pred_df[TARGET].median()
y_pred_df[TARGET] = y_pred_df[TARGET].where(not_outlier_mask, other=median_value)

# compute the performance scores
scores = pd.DataFrame(columns=['metric','value'], data=[["meanAbsoluteError", mean_absolute_error(y_test.ravel(), y_pred_df)]])
print(scores)
# save the predictions and the scores file
y_pred.to_csv(os.path.join(here, '..', 'predictions.csv'))
scores.to_csv(os.path.join(here, '..', 'scores.csv'), index=None)
