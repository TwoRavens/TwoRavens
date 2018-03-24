import os, sys, json, random
import pandas as pd
import numpy as np
import networkx as nx
from sklearn.base import BaseEstimator

here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS

dspath = os.path.join(here, '..', '..', '30_personae_dataset')
prpath = os.path.join(here, '..', '..', '30_personae_problem')
solpath = os.path.join(here, '..')
assert os.path.exists(dspath)
assert os.path.exists(prpath)

d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

class MockupModel(BaseEstimator):
	
	def fit(self, X_train, y_train):
		self.X_train = X_train
		self.y_train = y_train

	def predict(self, X_test):
		y_predict = []
		for i in range(0, X_test.shape[0]):
			y_predict.append(random.choice(self.y_train))
		return y_predict



if __name__ == '__main__':
	trainData = d3mds.get_train_data()
	print(trainData.shape)
	
	trainTargets = d3mds.get_train_targets()
	print(trainTargets.shape)

	testData = d3mds.get_test_data()
	print(testData.shape)

	model = MockupModel()
	model.fit(trainData, trainTargets)
	
	y_pred = model.predict(testData)

	targetCols = []
	targets = d3mds.problem.get_targets()
	for target in targets: targetCols.append(target['colName'])
		
	y_pred_df = pd.DataFrame(index=testData.index, data=y_pred, columns=targetCols)
	print(y_pred_df)

	y_pred_df.to_csv(os.path.join(solpath, 'predictions.csv'))

	