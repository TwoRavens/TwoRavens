
# coding: utf-8

import os, sys, json
import pandas as pd
from d3mds import D3MDataset, D3MProblem, D3MDS
from sklearn.metrics import mean_absolute_error, mean_squared_error
import pyflux as pf
import numpy as np
import category_encoders as ce
from category_encoders import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import Imputer
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.metrics import confusion_matrix
from scipy import stats


def in_jyputer_notebook():
   try:
	   assert get_ipython().__class__.__name__=="ZMQInteractiveShell"
	   return True
   except:
	   return False

if in_jyputer_notebook(): 
   here = os.getcwd()
else:
   here = os.path.dirname(os.path.abspath(__file__))


dspath = os.path.join(here, '..', '..', 'LL1_terra_canopy_height_long_form_s4_70_dataset')
prpath = os.path.join(here, '..', '..', 'LL1_terra_canopy_height_long_form_s4_70_problem')
solpath = os.path.join(here, '..')
assert os.path.exists(dspath)
assert os.path.exists(prpath)
d3mds = D3MDS(dspath, prpath)

X_train = d3mds.get_train_data()
y_train = d3mds.get_train_targets()

X_test = d3mds.get_test_data()
y_test = d3mds.get_test_targets()

print(X_train.shape, y_train.shape)
print(X_test.shape, y_test.shape)

TARGET_COL = d3mds.problem.get_targets()[0]['colName']


D = X_train.set_index(['cultivar','sitename'], drop=True)
print('----------- TRAIN: min day value counts ---------')
print(D.groupby(level=[0,1])['day'].min().value_counts())
print('----------- TRAIN: max day value counts ---------')
print(D.groupby(level=[0,1])['day'].max().value_counts())
D = X_test.set_index(['cultivar','sitename'], drop=True)
print('----------- TEST: predict day value counts ---------')
print(D.groupby(level=[0,1])['day'].min().value_counts())

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

def model_ARIMA(X_train, y_train, X_test, y_test):
	train_df = X_train.copy()
	train_df[TARGET_COL]=y_train
	train_df.set_index(['cultivar','sitename'], drop=True, inplace=True)

	test_df = X_test.copy()
	test_df[TARGET_COL]=y_test
	test_df.set_index(['cultivar','sitename'], drop=True, inplace=True)

	groups = train_df.groupby(level=[0,1])
	sorted_groups = (sorted(groups, key=lambda x: len(x[1]), reverse=True))

	y_pred = []
	y_pred_index = []
	for i, (idx, df) in enumerate(sorted_groups):
		print(i, end='.', flush=True) if i%100==0 else print('', end='.', flush=True)
		series = df[['day',TARGET_COL]]
		series.set_index('day', inplace=True)
		series_start_day = series.index.min()
		series_end_day = series.index.max()
		series_predict_day = test_df.loc[idx]['day']
		h = series_predict_day - series_end_day
		predicted_height = -1.0

		if series_predict_day in series.index:
			predicted_height = series.ix[series_predict_day][TARGET_COL]
		else:
			series = series.reindex(range(series_start_day, series_end_day+1), method='nearest')
			ar, ma, integ = 1,0,0
			model = pf.ARIMA(series, ar=ar, ma=ma, integ=integ, family=pf.Cauchy())
			mode_fit = model.fit('MLE')
			count = 0
			while series_predict_day not in series.index:
				series = series.append(model.predict(len(series)-max(ar,ma)))
				model = pf.ARIMA(series, ar=ar, ma=ma, integ=integ, family=pf.Cauchy())
				model_fit = model.fit('MLE')
				count+=1
				if count > 10:
					raise RuntimeError('could not find prediction day in 10 extensions!!!!!')
			predicted_height = series.ix[series_predict_day].values.tolist()[0]

		print('---', predicted_height)
		y_pred.append(predicted_height)
		y_pred_index.append(idx)
		
		# if i>10:
			# break

	y_pred_df = pd.DataFrame(data=y_pred, index=y_pred_index, columns=[TARGET_COL])
	outlier_mask = is_outlier(y_pred_df[TARGET_COL])
	not_outlier_mask = ~outlier_mask
	print('==== # outliers in predictions:', sum(outlier_mask), "====")
	print(y_pred_df[TARGET_COL][outlier_mask])
	y_pred_df[TARGET_COL] = y_pred_df[TARGET_COL].where(not_outlier_mask, other=y_pred_df[TARGET_COL].median())
	y_truth = test_df.ix[y_pred_index][TARGET_COL].values.tolist()
	mae_score = mean_absolute_error(y_truth, y_pred_df.values.tolist())
	print('ARIMA performance MAE', mae_score)

	y_pred_df.index=X_test.index
	y_pred_df.to_csv('predictions_ARIMA.csv')

	scores_df = pd.DataFrame(data=[['meanAbsoluteError',mae_score]], columns=['metric','value'])
	scores_df.to_csv('scores_ARIMA.csv', index=None)

def model_regression_supplied(X_train, y_train, X_test, y_test):

	# create a simple pipeline to demonstrate proof-of-concept
	def run_simple_pipeline(X_train_in, 
	                        y_train_in, 
	                        X_test_in, 
	                        y_test_in,
	                        ignore_cols=None, 
	                        cat_cols=None):
	    X_train, y_train, X_test, y_test = X_train_in.copy(), y_train_in.copy(), X_test_in.copy(), y_test_in.copy()
	    if ignore_cols:
	        try:
	            X_train.drop(columns=ignore_cols, inplace=True)
	            X_test.drop(columns=ignore_cols, inplace=True)
	        except:
	            X_train.drop(columns=ignore_cols, inplace=True)
	            X_test.drop(columns=ignore_cols, inplace=True)

	    # print('train/test shapes...', X_train.shape, X_test.shape)
	    # print(X_train.columns)

	    category_encoder = ce.OneHotEncoder(cols=cat_cols)
	    X_train = category_encoder.fit_transform(X_train)
	    X_test = category_encoder.transform(X_test)

	    my_model = RandomForestRegressor(
	        random_state=42).fit(X_train, y_train)

	    y_pred = my_model.predict(X_test)
	    # Evaluate using cross valiidation
	    cv_score = cross_val_score(my_model, X_train, y_train, cv=5)
	    # Calculate an uncertainty score
	    conf_int = 1.96 * (cv_score.std()/np.sqrt(5))
	    # Compute Accuracy Scoremodel_regression() of fit model
	    score = my_model.score(X_test, y_test)
	    # Compute MAE
	    mae_score = mean_absolute_error(y_pred, y_test)
	    print('default score (R^2)', score)
	    print('CV mean:', cv_score.mean())
	    print('95% CI:', conf_int)
	    print('MAE score:', mae_score)
	    return y_pred, mae_score, my_model, X_train[:100]

	ignore_cols=[]
	cat_cols=['cultivar','sitename']
	(y_pred, mae_score, _, _) = run_simple_pipeline(X_train,y_train,X_test,y_test,ignore_cols=ignore_cols,cat_cols=cat_cols)

	y_pred_df = pd.DataFrame(data=y_pred, index=X_test.index, columns=[d3mds.problem.get_targets()[0]['colName']])
	y_pred_df.to_csv('predictions_regression_supplied.csv')
	scores_df = pd.DataFrame(data=[['meanAbsoluteError',mae_score]], columns=['metric','value'])
	scores_df.to_csv('scores_regression_supplied.csv', index=None)


def model_predict_mean(y_train, X_test, y_test):
	y_train = np.array(y_train)
	mean = np.mean(y_train)
	y_pred = [mean]*len(y_test)
	mae_score = mean_absolute_error(y_pred, y_test)
	print('MAE score:', mae_score)

	y_pred_df = pd.DataFrame(data=y_pred, index=X_test.index, columns=[d3mds.problem.get_targets()[0]['colName']])
	y_pred_df.to_csv('predictions_predict_mean.csv')
	scores_df = pd.DataFrame(data=[['meanAbsoluteError',mae_score]], columns=['metric','value'])
	scores_df.to_csv('scores_predict_mean.csv', index=None)

model_ARIMA(X_train, y_train, X_test, y_test)
model_regression_supplied(X_train, y_train, X_test, y_test)
model_predict_mean(y_train, X_test, y_test)
