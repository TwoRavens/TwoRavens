import os, sys, json
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import f1_score, mean_squared_error

here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS
from feature_extraction import *
from feature_selection import *
from estimation import *

if __name__ == '__main__':
	
	# get the paths of the dataset and problem
	try:
		dspath = (sys.argv[1])
	except:
		dspath = input('Enter the path to the dataset: ')
		# dspath = os.path.join(here, '..', '..', 'data', '185_baseball_dataset')
		assert os.path.exists(dspath)

	try:
		prpath = (sys.argv[2])
	except:
		prpath = input('Enter the path to the problem: ')
		# prpath = os.path.join(here, '..', '..', 'data', '185_baseball_problem')
		assert os.path.exists(prpath)

	# check the pipeline JSON file
	pipe_json = os.path.join(here, 'pipeline.json')
	assert os.path.exists(pipe_json)

	# read the JSON file
	with open(pipe_json) as data_file:    
		ps = json.load(data_file)

	## TBD: we need to make a check that that JSON aligns with the dataset and problem

	# initialize the API class
	d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

	# get the train and test data
	X_train = d3mds.get_train_data()
	y_train = d3mds.get_train_targets()
	X_test = d3mds.get_test_data()
	y_test = d3mds.get_test_targets()

	# get columns information
	cols_info = d3mds.dataset.get_learning_data_columns()

	## instantiate feature extractor
	key, fe = ps['feature_extractors'].popitem()
	fe_class = fe['feature_extractor']
	fe_params = fe['params']

	FE = eval(fe_class)(**fe_params)

	if isinstance(FE, AnnotatedTabularExtractor):
		FE.set_cols_info(cols_info)

	## instantiate feature selector
	fs = ps['feature_selector']
	fs_class = fs['feature_selector']
	fs_params = fs['params']

	FS = eval(fs_class)(**fs_params)

	## instantiate estimator
	est = ps['estimator']
	est_class = est['estimator']
	est_params = est['params']

	EST = eval(est_class)(**est_params)

	## make a pipeline from the above three components
	pipeline = Pipeline([
		('vect', FE),
		('sel', FS),
		('clf', EST),
	])

	## train the pipeline on train data
	pipeline.fit(X_train, y_train)

	## predict on test data
	y_pred = pipeline.predict(X_test)
	targetCols = [col['colName'] for col in d3mds.problem.get_targets()]
	y_pred_df = pd.DataFrame(index=X_test.index, data=y_pred, columns=targetCols)
	y_pred_df.to_csv(os.path.join('.','predictions.csv'))

	## compute the score on test data
	metrics = d3mds.problem.get_performance_metrics()
	scoresdf = pd.DataFrame(columns=['metric','value'])
	for item in metrics:
		metric = item['metric']
		if metric == 'f1Macro':
			score = f1_score(y_test, y_pred, average='macro')
			print('f1Macro', score)
			scoresdf.loc[len(scoresdf)]=['f1Macro', score]
		elif metric == 'meanSquaredError':
			score = mean_squared_error(y_test, y_pred)
			print('meanSquaredError', score)
			scoresdf.loc[len(scoresdf)]=['meanSquaredError', score]
	scoresdf.to_csv(os.path.join('.','scores.csv'))
