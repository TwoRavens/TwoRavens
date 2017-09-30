
# coding: utf-8

# In[2]:


import numpy as np
import struct, random
import networkx as nx
import pandas as pd
import networkx.algorithms.isomorphism.vf2userfunc as vf2
import random
from networkx.generators import gnm_random_graph
from collections import OrderedDict
import networkx.algorithms.isomorphism as iso
from sklearn.datasets import make_classification
import functools
import sys, os
from os.path import join
from sklearn.metrics import accuracy_score
import json


# ## Define graph matching model

# In[8]:


# helper functions
def nodeID2node(nodeID, G):
    """
    takes a nodeID and returns a node in the graph G
    """
    node=None
    for n,d in G.nodes_iter(data=True):
        if d['nodeID']==nodeID:
            node=n
            break
    return node

def node2nodeID(node, G):
    """
    takes a node and returns a nodeID for that node in the graph G
    """
    return G.node[node]['nodeID']


# In[9]:


class GraphMatching:
    def __init__(self, G1, G2):
        self.G1 = G1
        self.G2 = G2
        
    def match(self):
        G1_max = max(nx.connected_component_subgraphs(self.G1), key=len)
        G2_max = max(nx.connected_component_subgraphs(self.G2), key=len)
        
        graphMatcher = vf2.GraphMatcher(G1_max, G2_max)
        graphMatcher.subgraph_is_isomorphic()
        # get the full/max node mapping
        self.mapping = graphMatcher.mapping
        
    def predict(self, testDataDf):
        # make a dictionary from the node mapping beteen G1 and G2
        l_g1 = list(map(functools.partial(node2nodeID, G=self.G1), self.mapping.keys()))
        l_g2 = list(map(functools.partial(node2nodeID, G=self.G2), self.mapping.values()))
        d_g1_g2 = dict(zip(l_g1, l_g2))
        
        lookup = lambda a, D: D[a]
        testDataDf['G2.nodeID'] = testDataDf['G1.nodeID'].apply(functools.partial(lookup, D=d_g1_g2))
        return testDataDf


# ## Make pipeline

# In[10]:


print('building graph matching model ...')


# In[11]:


dataDir = "../../data"
rawDataDir = os.path.join(dataDir, "raw_data")
rootDir = os.path.join(dataDir, "..")
assert os.path.exists(dataDir)
assert os.path.exists(rawDataDir)
assert os.path.exists(rootDir)


# In[12]:


# read the graphs
G1 = nx.read_gml(join(rawDataDir, 'G1.gml'))
G2 = nx.read_gml(join(rawDataDir, 'G2.gml'))


# In[13]:


# align the graphs
gm = GraphMatching(G1, G2)
gm.match()


# ### Try the model on trainData

# In[14]:


print('trying the model on training data ...')


# In[15]:


# evaluate the model on train data
train_performance = OrderedDict()
trainDataDf = pd.read_csv(join(dataDir, 'trainData.csv'), index_col=0)
prediction = gm.predict(trainDataDf)['G2.nodeID']
train_truth = pd.read_csv(join(dataDir, 'trainTargets.csv'), index_col=0)['G2.nodeID']
accuracy = accuracy_score(train_truth, prediction)

train_performance = OrderedDict([
    ('train', OrderedDict([
        ('score', OrderedDict([
                ('metric', 'accuracy'),
                ('value', accuracy)])
        )
    ]))
])

print('accuracy on training data:', accuracy)


# ## Submit predictions on testData

# In[1]:


print('making predictions on testData (assuming that testData is available) ...')
try:
    print('1. reading testData ...')
    testDataDf = pd.read_csv(join(dataDir, 'testData.csv'), index_col=0)
    print('2. making predictions ...')
    prediction = pd.DataFrame(gm.predict(testDataDf)['G2.nodeID'])
    print('3. formatting and saving testTargets.csv')
    prediction.insert(0, 'graph', 'G2.gml')
    # print(prediction.head())
    prediction.to_csv('testTargets.csv')
except:
    print('Looks like this is a redacted dataset. testData is unavailable. Cannot complete this step ...')


# ## Compute performance on testData

# In[ ]:


test_performance = OrderedDict()


# In[20]:


print('computing performance on testData (assuming the testTargets is available) ...')
try:
    print('1. reading testTargets...')# read the y_truth
    y_truth = pd.read_csv(join(dataDir, 'testTargets.csv'))['G2.nodeID']
    print('2. reading predictions ...')
    # read the y_predicted
    y_predicted = pd.read_csv('testTargets.csv')['G2.nodeID']
    print('3. computing accuracy ...')
    accuracy = accuracy_score(y_truth, y_predicted)
    print('performance on test data:',accuracy)
    print('4. saving the performance score...')
    test_performance = OrderedDict([
        ('test', OrderedDict([
            ('score', OrderedDict([
                    ('metric', 'accuracy'),
                    ('value', accuracy)])
            )
        ]))
    ])
except:
    print('Looks like this is a redacted dataset. testTargets is unavailable. cannot complete this step ...')


# In[ ]:


overall_performance = OrderedDict()
overall_performance.update(train_performance)
overall_performance.update(test_performance)

with open('performance.json', 'w', encoding='utf-8') as f:
    json.dump(overall_performance, f, indent=2)
print(json.dumps(overall_performance, indent=2))


# In[ ]:



