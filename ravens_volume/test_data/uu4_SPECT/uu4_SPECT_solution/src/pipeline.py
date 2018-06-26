import os, sys, json, random
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS

dspath = os.path.join(here, '..', '..', 'uu4_SPECT_dataset')
prpath = os.path.join(here, '..', '..', 'uu4_SPECT_problem')
solpath = os.path.join(here, '..')
assert os.path.exists(dspath)
assert os.path.exists(prpath)

d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

if __name__ == '__main__':
	trainData = d3mds.get_train_data()
	trainTargets = d3mds.get_train_targets()
	testData = d3mds.get_test_data()
	testTargets = d3mds.get_test_targets()
	print('trainData', trainData.shape)
	print('testData', testData.shape)

	## analyze the class imbalance
	# print(pd.Series(trainTargets.ravel()).value_counts())
	# print(pd.Series(testTargets.ravel()).value_counts())
	
	## filter out the privileged features ......
	print('filtering out the privileged features from train and test data ....')
	dsDoc = d3mds.dataset.dsDoc
	qualities = dsDoc['qualities']
	privilegedFeatures = []
	for q in qualities:
		if q['qualName'] == 'privilegedFeature':
			feature = q['restrictedTo']['resComponent']['columnName']
			privilegedFeatures.append(feature)
	
	non_privilegedFeatures = list(set(trainData.columns)-set(privilegedFeatures))
	trainData = trainData[non_privilegedFeatures]
	testData = testData[non_privilegedFeatures]
	print('trainData', trainData.shape)
	print('testData', testData.shape)

	# train  model for classification ......	
	model = RandomForestClassifier(n_estimators=3, max_depth=10, random_state=0)
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
