import os, sys, json
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import f1_score, mean_squared_error
from sklearn import preprocessing
from sklearn.semi_supervised import LabelSpreading, LabelPropagation
from sklearn.ensemble import RandomForestClassifier

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
	print(pd.Series(y_train).shape)
	print(pd.Series(y_train).value_counts())
	print(pd.Series(y_train).value_counts().sum())
	print("---------------")
	print(pd.Series(y_test).shape)
	print(pd.Series(y_test).value_counts())
	print(pd.Series(y_test).value_counts().sum())
	print("==========================")

	le = preprocessing.LabelEncoder()
	white_y_train = pd.Series(le.fit_transform(y_train.astype(str)))
	white_y_test = pd.Series(le.transform(y_test.astype(str)))
	white_y_train.replace(10, -1, inplace=True)
	white_y_test.replace(10, -1, inplace=True)
	print(white_y_train.shape)
	print(white_y_train.value_counts())
	print(pd.Series(white_y_train).value_counts().sum())
	print("---------------")
	print(pd.Series(white_y_test).shape)
	print(pd.Series(white_y_test).value_counts())
	print(pd.Series(white_y_test).value_counts().sum())
	print("==========================")

	# get columns information
	cols_info = d3mds.dataset.get_learning_data_columns()

	## instantiate feature extractor
	key, fe = ps['feature_extractors'].popitem()
	fe_class = fe['feature_extractor']
	fe_params = fe['params']
	FE = eval(fe_class)(**fe_params)
	if isinstance(FE, AnnotatedTabularExtractor):
		FE.set_cols_info(cols_info)

	print('Before featurization', X_train.shape)
	white_X_train = FE.fit_transform(X_train, variables=None).todense()
	print('After featurization', white_X_train.shape)
	white_X_test = FE.transform(X_test).todense()


	print("============= without label spreading ==============")
	EST = RandomForestClassifier(random_state=42)
	EST.fit(white_X_train, white_y_train)
	white_y_pred = EST.predict(white_X_test)
	score = f1_score(white_y_test, white_y_pred, average='macro')
	print('f1Macro', score)

	print("============= label spreading ==============")
	EST = LabelSpreading('knn', max_iter=1, n_neighbors=7, tol=0.1, n_jobs=-1)
	EST.fit(white_X_train, white_y_train)
	white_y_pred = EST.predict(white_X_test)
	score = f1_score(white_y_test, white_y_pred, average='macro')
	print('f1Macro', score)

	## save predicitons
	y_pred = le.inverse_transform(white_y_pred).astype(float).astype(int)
	targetCols = [col['colName'] for col in d3mds.problem.get_targets()]
	y_pred_df = pd.DataFrame(index=X_test.index, data=y_pred, columns=targetCols)
	y_pred_df.to_csv(os.path.join(here,'..','predictions.csv'))

	## save the scores
	scoresdf = pd.DataFrame(columns=['metric','value','randomSeed','fold'])
	scoresdf.loc[len(scoresdf)]=['f1Macro', score, 42, 0]
	scoresdf.to_csv(os.path.join(here,'..','scores.csv'), index=None)