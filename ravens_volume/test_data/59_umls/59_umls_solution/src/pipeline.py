
# coding: utf-8

# In[23]:


import networkx as nx
import numpy as np
from scipy.io.matlab import loadmat
import sktensor, random
import pandas as pd
from scipy.sparse import lil_matrix
from sktensor.rescal import als as rescal_als
from numpy import zeros, dot
from numpy.linalg import norm
from sklearn.metrics import precision_recall_curve, auc, accuracy_score, roc_auc_score, roc_curve
from sklearn.preprocessing import normalize
import os, sys, json
from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from collections import OrderedDict


here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS

dspath = os.path.join(here, '..', '..', '59_umls_dataset')
prpath = os.path.join(here, '..', '..', '59_umls_problem')
rawDataDir = os.path.join(dspath, "graphs")
solpath = os.path.join(here, '..')

assert os.path.exists(dspath)
assert os.path.exists(prpath)
assert os.path.exists(rawDataDir)

d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

## LinkPrediction model

def tensorCompletion(T, V=[]):
	"""
	Complete the tensor by tensor factorization and recomposition (we use Rescal)
	"""
	def __predict_rescal_als(T, V=[]):
		if V==[]:
			A, R, _, _, _ = rescal_als(T, 100, init='nvecs', conv=1e-3, lambda_A=10, lambda_R=10)
		else:
			A, R, _, _, _ = rescal_als(T, 100, attr=[V], init='nvecs', conv=1e-3, lambda_A=10, lambda_R=10)
		n = A.shape[0]
		P = zeros((n, n, len(R)))
		for k in range(len(R)):
			P[:, :, k] = dot(A, dot(R[k], A.T))
		return P
	def __normalize_predictions(P, e, k):
		for a in range(e):
			for b in range(e):
				nrm = norm(P[a, b, :k])
				if nrm != 0:
					# round values for faster computation of AUC-PR
					P[a, b, :k] = np.round_(P[a, b, :k] / nrm, decimals=3)
		return P

	e, k = T.shape[0], T.shape[2]

	# Convert T into list of sparse matrices as required by Rescal
	T = [lil_matrix(T[:, :, i]) for i in range(k)]
	Tc = [Ti.copy() for Ti in T]

	# call Rescal and normalize
	P = __predict_rescal_als(Tc, V)
	P = __normalize_predictions(P, e, k)
	return P


# In[4]:


class LinkPrediciton():
	def __init__(self, G):
		"""
		G is an instance of nx.MultiGraph
		"""
		# convert the graph into adjacency tensor
		I = len(G.nodes())
		J = I
		K = len(set(nx.get_edge_attributes(G,'linkType').values()))
		shape = (I, J, K)
		# print(shape)
		self.A = np.zeros(shape=shape)
		for i,j,data in G.edges(data=True):
			k = (data['linkType'])
			self.A[i][j][k] = 1.
		# print(self.A.shape)
	
	def fit(self):
		# self.A_completed = tensorCompletion(self.A, attrDF.as_matrix())
		self.A_completed = tensorCompletion(self.A)
		# print(np.amin(self.A_completed))
		# print(np.amax(self.A_completed))
		
	def predict(self, X):
		"""
		X is a DataFrame with columns=[source_nodeID, target_nodeID, linkType]
		"""
		def __predictLink(row, T):
			k = int(row.linkType)
			i = int(row.source_nodeID)
			j = int(row.target_nodeID)
			return int(round(T[i][j][k]))
		X['linkExists']=X.apply(__predictLink, T=self.A_completed, axis=1)
		return X


# ## Make pipeline

# initializations
random.seed(0)

graph = '%s/graph.gml'%rawDataDir


# In[20]:


# read the graph from gml file
print('read graph ...')
G = nx.read_gml(graph, label='id')

# set aside some edges (10%) validation of the model
print('setting aside 10% of edges for validation and remove them from graph ....')
edges_validation=pd.DataFrame(columns=['source_nodeID','target_nodeID','linkType'])
for i, (u,v,key,data) in enumerate(G.edges(data=True, keys=True)):
	if random.random() < 0.1:
		G.remove_edge(u,v,key=key)
		edges_validation.loc[len(edges_validation)] = [u,v,data['linkType']]
print('number of edge set aside for validation:',len(edges_validation))


# In[21]:


# initialize the model
print('initializing the linkPrediction model ...')
lp = LinkPrediciton(G)

# fit the training graph
print('fitting the training graph ...')
lp.fit()

# make predictions on the validation data
print('making predicitons on validation edges ...')
edges_prediction=lp.predict(edges_validation)

# compute accuracy on validation data
print('computing accuracy on validation data ...')
accuracy = len(edges_prediction[edges_prediction['linkExists']==1])/len(edges_prediction)
print('model accuracy:', accuracy)

# now train the model on the whole graph
print('training the model on the whole graph ...')
# read the graph from gml file
G = nx.read_gml(graph, label='id')
# initialize the model
lp = LinkPrediciton(G)
# fit the graph
lp.fit()

print('===============================================================================')

## Submit predictions on test data

print('predictions on test data ...')
testData = d3mds.get_test_data()

predictions = lp.predict(testData)
y_pred = pd.DataFrame(predictions['linkExists'])
y_truth = d3mds.get_test_targets().ravel()
score = accuracy_score(y_truth, y_pred)
print('model accuracy on test data:', score)

# saving the predictions.csv file
y_pred_df = pd.DataFrame(index=testData.index, data=y_pred, columns=[target['colName'] for target in d3mds.problem.get_targets()])
y_pred_df.to_csv(os.path.join(solpath, 'predictions.csv'))

# saving the scores.csv file
df = pd.DataFrame(columns=['metric', 'value'])
df.loc[len(df)] = ['accuracy', score]
df.to_csv(os.path.join(solpath, 'scores.csv'))
