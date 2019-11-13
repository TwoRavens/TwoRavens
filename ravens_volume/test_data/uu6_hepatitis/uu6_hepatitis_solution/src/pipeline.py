import os, sys, json, random
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from d3m.container.dataset import Dataset
from d3m.metadata import base as metadata_base

here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS

dspath = os.path.join(here, '..', '..', 'uu6_hepatitis_dataset')
prpath = os.path.join(here, '..', '..', 'uu6_hepatitis_problem')
solpath = os.path.join(here, '..')
dspathfile = os.path.join(here, '..', '..', 'uu6_hepatitis_dataset', 'datasetDoc.json')

assert os.path.exists(dspath)
assert os.path.exists(prpath)

d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond


if __name__ == '__main__':
	from d3m.container.dataset import Dataset
	from d3m import utils, container
	from d3m.metadata import base as metadata_base
	trainData = d3mds.get_train_data()
	trainTargets = d3mds.get_train_targets().ravel()
	testData = d3mds.get_test_data()
	testTargets = d3mds.get_test_targets().ravel()
	print('trainData', trainData.shape)
	print('testData', testData.shape)

	# clean data
	trainData = trainData.apply(pd.to_numeric, args=('coerce',))
	testData = testData.apply(pd.to_numeric, args=('coerce',))

	trainData.fillna(0, inplace=True)
	testData.fillna(0, inplace=True)
	## filter out the privileged features ......
	print('filtering out the privileged features from train and test data ....')

	train_path = 'file://{uri}'.format(uri=os.path.abspath(dspathfile))
	train_dataset = Dataset.load(dataset_uri=train_path)

	#train_dataset.metadata.pretty_print()

	privileged_features = []
	privileged_semantic_type = 'https://metadata.datadrivendiscovery.org/types/SuggestedPrivilegedData'
	col_length = train_dataset['learningData'].shape[1]
	for col in range(col_length):
		semantic_types = train_dataset.metadata.query(('learningData', metadata_base.ALL_ELEMENTS, col))['semantic_types']
		col_name = train_dataset.metadata.query(('learningData',metadata_base.ALL_ELEMENTS, col))['name']
		if privileged_semantic_type in semantic_types:
			privileged_features.append(col_name)

	privilegedFeatures = privileged_features
	
	non_privilegedFeatures = list(set(trainData.columns)-set(privilegedFeatures))
	trainData = trainData[non_privilegedFeatures]
	testData = testData[non_privilegedFeatures]
	print('trainData', trainData.shape)
	print('testData', testData.shape)

	# train  model for classification ......	
	model = RandomForestClassifier(n_estimators=5, max_depth=10, random_state=0)
	model.fit(trainData, trainTargets)

	print('===============================================================================')

	# make predictions on test data
	y_pred = model.predict(testData)
	# print(y_pred)
	y_truth = testTargets.ravel()
	# print(y_truth)
	f1 = f1_score(y_truth, y_pred)
	print('f1 score on test data:', f1)

	# saving the predictions.csv file
	y_pred_df = pd.DataFrame(index=testData.index, data=y_pred, columns=[target['colName'] for target in d3mds.problem.get_targets()])
	y_pred_df.to_csv(os.path.join(solpath, 'predictions.csv'))

	# saving the scores.csv file
	df = pd.DataFrame(columns=['metric', 'value'])
	df.loc[len(df)] = ['f1', f1]
	df.to_csv(os.path.join(solpath, 'scores.csv'))
