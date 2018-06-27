
# coding: utf-8

import pandas as pd
import os, json, sys, random
from sklearn.metrics import mean_squared_error, make_scorer
from scipy import stats
from sklearn.model_selection import GridSearchCV
from sklearn.linear_model import LinearRegression, Lasso, Ridge
from sklearn.kernel_ridge import KernelRidge
from sklearn.svm import SVR
from sklearn.pipeline import make_pipeline
from math import sqrt
import numpy as np
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')
from sklearn.model_selection import cross_val_score, ShuffleSplit, cross_validate
from collections import OrderedDict
from sklearn.base import BaseEstimator

here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS

dspath = os.path.join(here, '..', '..', '26_radon_seed_dataset')
prpath = os.path.join(here, '..', '..', '26_radon_seed_problem')
assert os.path.exists(dspath)
assert os.path.exists(prpath)

d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

def train_model(X_train, y_train):
	models=[]
	scores=[]
	train_performance = OrderedDict()
	RMSE = lambda yT, yP: sqrt(mean_squared_error(yT, yP))


	print('trying model: Ridge regressor ...')
	cv = ShuffleSplit(n_splits=10, test_size=0.25, random_state=0)
	ridge = GridSearchCV(
		Ridge(),
		cv = cv,
		param_grid={"alpha": [0.0, 1e-8, 1e-5, 1e-1]},
		scoring=make_scorer(RMSE, greater_is_better=False)
	)
	ridge.fit(X_train, y_train)
	score = ridge.best_score_ # that score is negative MSE scores. The thing is that GridSearchCV, by convention, always tries to maximize its score so loss functions like MSE have to be negated.
	score = score*-1
	print('model performance on 10-fold CV (mean rmse)', score)
	models.append(ridge.best_estimator_)
	scores.append(score)

	print('trying model: Lasso ...')
	cv = ShuffleSplit(n_splits=10, test_size=0.25, random_state=0)
	lasso = GridSearchCV(
		Lasso(), 
		cv=cv,
		param_grid={"alpha": [1e-3, 1e-2, 1e-1]},
		scoring=make_scorer(RMSE, greater_is_better=False)
	)
	lasso.fit(X_train, y_train)
	score = lasso.best_score_ # that score is negative MSE scores. The thing is that GridSearchCV, by convention, always tries to maximize its score so loss functions like MSE have to be negated.
	score = score*-1
	print('model performance on 10-fold CV (mean rmse)', score)
	models.append(lasso.best_estimator_)
	scores.append(score)


	print('trying model: SVR ...')
	cv = ShuffleSplit(n_splits=10, test_size=0.25, random_state=0)
	svr = GridSearchCV(
		SVR(kernel='rbf', gamma=0.1), 
		cv=cv,
		param_grid={
			"C": [1e0, 1e1, 1e2, 1e3],
			"gamma": np.logspace(-2, 2, 5)},
		scoring=make_scorer(RMSE, greater_is_better=False)
	)
	svr.fit(X_train, y_train)
	score = svr.best_score_ # that score is negative MSE scores. The thing is that GridSearchCV, by convention, always tries to maximize its score so loss functions like MSE have to be negated.
	score = score*-1
	print('model performance on 10-fold CV (mean rmse)', score)
	models.append(svr.best_estimator_)
	scores.append(score)

	print('trying model: Kernel ridge...')
	cv = ShuffleSplit(n_splits=10, test_size=0.25, random_state=0)
	kr = GridSearchCV(
		KernelRidge(kernel='rbf', gamma=0.1), 
		cv=cv,
		param_grid={"alpha": [1e0, 0.1, 1e-2, 1e-3],
					"gamma": np.logspace(-2, 2, 5)},
		scoring=make_scorer(RMSE, greater_is_better=False)
	)
	kr.fit(X_train, y_train)
	score = kr.best_score_ # that score is negative MSE scores. The thing is that GridSearchCV, by convention, always tries to maximize its score so loss functions like MSE have to be negated.
	score = score*-1
	print('model performance on 10-fold CV (mean rmse)', score)
	models.append(kr.best_estimator_)
	scores.append(score)


	print('choosing the best model for baseline...')
	baseline = models[np.argmin(scores)]
	baselineScore = scores[np.argmin(scores)]
	print('baseline model:', str(baseline))
	print('baseline performance on 10-fold CV (mean mse):', baselineScore)
	return baseline, baselineScore



X_train = d3mds.get_train_data()
y_train = d3mds.get_train_targets().ravel()
print('X_train', X_train.shape)
print('y_train', y_train.shape)

X_train = X_train[['county', 'floor']]
X_train = pd.get_dummies(X_train, columns = ['county', 'floor']) # one-hot encoding: both county and floor are categorical variables

baseline, baselineScore = train_model(X_train, y_train)
print('baseline train rmse score:', baselineScore)


X_test = d3mds.get_test_data()
y_test = d3mds.get_test_targets().ravel()
print('X_test', X_test.shape)
print('y_test', y_test.shape)

X_test = X_test[['county', 'floor']]
X_test = pd.get_dummies(X_test, columns = ['county', 'floor']) 

# because the number of counties is less in testData compared to trainData, 
# and because we one-hot encoded county data, the columns of X_test will be different from X_train
# print(X_train.shape, X_test.shape)
# this can be a problem because the model was trained on 86 columns and test data contains 55 columns.
# Therefore, we have to pad X_test with missing columns
for col in set(X_train.columns)-set(X_test.columns):
	X_test[col] = [0]*len(X_test)

y_predict = baseline.predict(X_test)
rmse = (sqrt(mean_squared_error(y_test, y_predict)))
print('baseline test rmse score:', rmse)

# save predictions.csv
target_cols = ([target['colName'] for target in d3mds.problem.get_targets()])
y_predict_df = pd.DataFrame(data=y_predict, index=X_test.index, columns=target_cols)
y_predict_df.to_csv(os.path.join(here, '..', 'predictions.csv'))

# save scores.csv file
df = pd.DataFrame(columns=['metric', 'value'])
df.loc[len(df)] = ['rootMeanSquaredError', rmse]
df.to_csv(os.path.join(here, '..', 'scores.csv'))



