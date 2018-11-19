import os, sys, json, subprocess, time, threading
import pandas as pd 
from d3mds import D3MDataset, D3MProblem, D3MDS
import networkx as nx
from sklearn.metrics import accuracy_score
from sklearn.metrics.cluster import normalized_mutual_info_score
from sklearn.svm import SVC

here = os.path.dirname(os.path.abspath(__file__))
dspath = os.path.join(here, '..', '..', 'LL1_net_nomination_seed_dataset')
prpath = os.path.join(here, '..', '..', 'LL1_net_nomination_seed_problem')
solpath = os.path.join(here, '..')
graphpath = os.path.join(dspath, 'graphs')
assert os.path.exists(dspath)
assert os.path.exists(prpath)

G1 = nx.read_gml(os.path.join(graphpath, 'G1.gml'))
d3mds = D3MDS(dspath, prpath)

def extract_attributes_from_nodes(G1, df_input):
	nodes = G1.nodes(data=True)
	df = pd.DataFrame(columns=['nodeID','attr1','attr2'])
	for (i, v) in nodes:
		df.loc[int(i)] = [v['nodeID'], v['attr1'], v['attr2']]

	df['nodeID'] = df['nodeID'].apply(int)
	df = df.sort_index()

	X = pd.concat([df_input, df], axis=1, join='inner')
	X.index.name = df_input.index.name
	X.pop('G1.nodeID')
	X.pop('nodeID')
	return X

# get the train data
X_train = d3mds.get_train_data()
X_train = extract_attributes_from_nodes(G1, X_train)
print('X_train.shape', X_train.shape)
y_train = d3mds.get_train_targets()

# train a simple baseline classifier that only considers the node attributes
# We are ignoring the relational data (connections between the nodes)
clf = SVC()
clf.fit(X_train, y_train)

# get the test data
X_test = d3mds.get_test_data()
X_test = extract_attributes_from_nodes(G1, X_test)
print('X_test.shape', X_test.shape)
# make a prediction on the test data
y_pred = clf.predict(X_test)

# get the true test targets
y_truth = d3mds.get_test_targets().ravel()

# compute the performance score on test data
metric = d3mds.problem.get_performance_metrics()[0]['metric']
assert metric == 'accuracy'
score = 0.0
score = accuracy_score(y_truth, y_pred)
print('accuracy score:', accuracy_score(y_truth, y_pred))

# save the predictions and the score
targetCols = [col['colName'] for col in d3mds.problem.get_targets()]
y_pred_df = pd.DataFrame(index=X_test.index, data=y_pred, columns=targetCols)
y_pred_df.to_csv(os.path.join(solpath, 'predictions.csv'))

scoresdf = pd.DataFrame(columns=['metric','value'])
scoresdf.loc[len(scoresdf)]=['accuracy', score]
scoresdf.to_csv(os.path.join(solpath,'scores.csv'))

