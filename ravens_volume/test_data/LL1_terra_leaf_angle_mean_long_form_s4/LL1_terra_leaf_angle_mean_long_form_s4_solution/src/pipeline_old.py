
# coding: utf-8

# In[1]:


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


# In[3]:


dspath = os.path.join(here, '..', '..', 'AUG_LL1_terra_canopy_height_long_form_s4_90_dataset')
prpath = os.path.join(here, '..', '..', 'AUG_LL1_terra_canopy_height_long_form_s4_90_problem')
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

D = X_train.set_index(['cultivar','sitename'], drop=True)
print('----------- TRAIN: min day value counts ---------')
print(D.groupby(level=[0,1])['day'].min().value_counts())
print('----------- TRAIN: max day value counts ---------')
print(D.groupby(level=[0,1])['day'].max().value_counts())
D = X_test.set_index(['cultivar','sitename'], drop=True)
print('----------- TEST: predict day value counts ---------')
print(D.groupby(level=[0,1])['day'].min().value_counts())

ARIMA_FLOOR=0
ARIMA_CEILING=500

# outlier analysis
# outlier_cultivar = X_test[X_test['day']==109]['cultivar'].values[0]
# outlier_sitename = X_test[X_test['day']==109]['sitename'].values[0]
# print(X_train[(X_train.cultivar==outlier_cultivar) & (X_train.sitename==outlier_sitename)]['day'])

def model_ARIMA(X_train, y_train, X_test, y_test):
	train_df = X_train.copy()
	train_df['height']=y_train
	train_df.set_index(['cultivar','sitename'], drop=True, inplace=True)

	test_df = X_test.copy()
	test_df['height']=y_test
	test_df.set_index(['cultivar','sitename'], drop=True, inplace=True)

	y_pred = []
	y_pred_index = []

	for i, (idx, df) in enumerate(train_df.groupby(level=[0,1])):
		print(i, end='.', flush=True) if i%100==0 else print('', end='.', flush=True)
		series = df[['day','height']]
		series.set_index('day', inplace=True)
		series_start_day = series.index.min()
		series_end_day = series.index.max()
		series_predict_day = test_df.loc[idx]['day']
		h = series_predict_day - series_end_day
		predicted_height = -1.0

		if series_predict_day in series.index:
			predicted_height = series.ix[series_predict_day]['height']
		else:
			series = series.reindex(range(series_start_day, series_end_day+1), method='nearest')
			ar, ma, integ = 1,0,0
			model = pf.ARIMA(series, ar=ar, ma=ma, integ=integ, family=pf.Normal())
			mode_fit = model.fit('MLE')
			count = 0
			while series_predict_day not in series.index:
				series = series.append(model.predict(len(series)-max(ar,ma)))
				model = pf.ARIMA(series, ar=ar, ma=ma, integ=integ, family=pf.Normal())
				model_fit = model.fit('MLE')
				count+=1
				if count > 10:
					raise RuntimeError('could not find prediction day in 10 extensions!!!!!')
			predicted_height = series.ix[series_predict_day].values.tolist()[0]

		if predicted_height < ARIMA_FLOOR or predicted_height >= ARIMA_CEILING:
			print("*", end='')
			predicted_height = np.mean(y_pred)
		
		y_pred.append(predicted_height)
		y_pred_index.append(idx)
		
		# if i>10:
			# break

	y_truth = test_df.ix[y_pred_index]['height'].values.tolist()
	mae_score = mean_absolute_error(y_truth, y_pred)
	print('ARIMA performance MAE', mae_score)

	y_pred_df = pd.DataFrame(data=y_pred, index=X_test.index, columns=[d3mds.problem.get_targets()[0]['colName']])
	y_pred_df.to_csv('predictions_ARIMA.csv')
	scores_df = pd.DataFrame(data=[['meanAbsoluteError',mae_score]], columns=['metric','value'])
	scores_df.to_csv('scores_ARIMA.csv', index=None)

def model_ARIMAX(X_train, y_train, X_test, y_test):
	train_df = X_train.copy()
	train_df['height']=y_train
	train_df.set_index(['cultivar','sitename'], drop=True, inplace=True)

	test_df = X_test.copy()
	test_df['height']=y_test
	test_df.set_index(['cultivar','sitename'], drop=True, inplace=True)

	exogenous_cols=['air_temperature_min','air_temperature_max','air_temperature_avg',
					'precipitation_rate_min','precipitation_rate_max','precipitation_rate_avg',
					'wind_speed_min','wind_speed_max','wind_speed_avg',
					'relative_humidity_min','relative_humidity_max','relative_humidity_avg']
	
	# regression formula
	formula='height~1'
	for str in exogenous_cols:
		formula+='+%s'%str
	
	y_pred = []
	y_pred_index = []
	count_lookup = 0

	for i, (idx, df) in enumerate(train_df.groupby(level=[0,1])):
		series = df
		series.set_index('day', inplace=True)
		series_start_day = series.index.min()
		series_end_day = series.index.max()
		series_predict_day = test_df.loc[idx]['day']
		h = series_predict_day - series_end_day
		predicted_height = -1.0

		print(i, end='.', flush=True) if i%100==0 else print('', end='.', flush=True)

		if series_predict_day in series.index:
			predicted_height = series.ix[series_predict_day]['height']
			count_lookup += 1
		else:
			series = series.reindex(range(series_start_day, series_end_day+1), method='nearest')
			ar, ma, integ = 1,0,0
			model = pf.ARIMAX(data=series, ar=ar, ma=ma, integ=integ, formula=formula, family=pf.Normal())
			model_fit = model.fit('MLE')
			extension = (model.predict(len(series)-max(ar,ma), oos_data=series))
			series = pd.DataFrame(series['height'])
			series = series.append(extension)
			count = 0
			while series_predict_day not in series.index:
				model = pf.ARIMA(data=series, ar=ar, ma=ma, integ=integ, family=pf.Normal())
				model_fit = model.fit('MLE')
				series = series.append(model.predict(len(series)-max(ar,ma)))
				count+=1
				if count > 10:
					raise RuntimeError('could not find prediction day in 10 extensions!!!!!')
			predicted_height = float(series.ix[series_predict_day].values.tolist()[0])

		if predicted_height < ARIMA_FLOOR or predicted_height >= ARIMA_CEILING:
			print("*", end='')
			predicted_height = np.mean(y_pred)
 
		y_pred.append(predicted_height)
		y_pred_index.append(idx)
		
		# if i>10:
			# break
		
	y_truth = test_df.ix[y_pred_index]['height'].values.tolist()
	# print(count_lookup)
	mae_score = mean_absolute_error(y_truth, y_pred)
	print('ARIMAX performance MAE', mae_score)

	y_pred_df = pd.DataFrame(data=y_pred, index=X_test.index, columns=[d3mds.problem.get_targets()[0]['colName']])
	y_pred_df.to_csv('predictions_ARIMAX.csv')
	scores_df = pd.DataFrame(data=[['meanAbsoluteError',mae_score]], columns=['metric','value'])
	scores_df.to_csv('scores_ARIMAX.csv', index=None)	


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

	ignore_cols=['date','air_temperature_min','air_temperature_max','air_temperature_avg',
					'precipitation_rate_min','precipitation_rate_max','precipitation_rate_avg',
					'wind_speed_min','wind_speed_max','wind_speed_avg',
					'relative_humidity_min','relative_humidity_max','relative_humidity_avg']
	cat_cols=['cultivar','sitename']
	(y_pred, mae_score, _, _) = run_simple_pipeline(X_train,y_train,X_test,y_test,ignore_cols=ignore_cols,cat_cols=cat_cols)

	y_pred_df = pd.DataFrame(data=y_pred, index=X_test.index, columns=[d3mds.problem.get_targets()[0]['colName']])
	y_pred_df.to_csv('predictions_regression_supplied.csv')
	scores_df = pd.DataFrame(data=[['meanAbsoluteError',mae_score]], columns=['metric','value'])
	scores_df.to_csv('scores_regression_supplied.csv', index=None)

def model_regression_augmented(X_train, y_train, X_test, y_test):

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

	ignore_cols=['date']
	cat_cols=['cultivar','sitename']
	(y_pred, mae_score, _, _) = run_simple_pipeline(X_train,y_train,X_test,y_test,ignore_cols=ignore_cols,cat_cols=cat_cols)
	
	y_pred_df = pd.DataFrame(data=y_pred, index=X_test.index, columns=[d3mds.problem.get_targets()[0]['colName']])
	y_pred_df.to_csv('predictions_regression_augmented.csv')
	scores_df = pd.DataFrame(data=[['meanAbsoluteError',mae_score]], columns=['metric','value'])
	scores_df.to_csv('scores_regression_augmented.csv', index=None)	

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
model_ARIMAX(X_train, y_train, X_test, y_test)
model_regression_supplied(X_train, y_train, X_test, y_test)
model_regression_augmented(X_train, y_train, X_test, y_test)
model_predict_mean(y_train, X_test, y_test)
