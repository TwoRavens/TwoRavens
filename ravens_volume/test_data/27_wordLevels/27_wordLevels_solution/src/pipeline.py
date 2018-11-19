
# coding: utf-8

# In[13]:


import os, glob, math, json, sys
import pandas as pd 
from sklearn.feature_extraction import DictVectorizer
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn import ensemble
from sklearn import metrics
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.model_selection import GridSearchCV
from collections import OrderedDict

here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS

dspath = os.path.join(here, '..', '..', '27_wordLevels_dataset')
prpath = os.path.join(here, '..', '..', '27_wordLevels_problem')
solpath = os.path.join(here, '..')
assert os.path.exists(dspath)
assert os.path.exists(prpath)

d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

# In[2]:


## one-hot-encoding of categorical features
def encode_onehot(df, cols):
	"""
	One-hot encoding is applied to columns specified in a pandas DataFrame.
	"""
	vec = DictVectorizer()
	vec_data = pd.DataFrame(vec.fit_transform(df[cols].to_dict(orient='records')).toarray())
	vec_data.columns = vec.get_feature_names()
	vec_data.index = df.index
	
	df = df.drop(cols, axis=1)
	df = df.join(vec_data)
	return df


# In[3]:


# #projectdir = os.path.realpath(__file__).split('src')[0]
# projectDir = "../../"
# solDir = os.path.join(projectDir, "solution")
# dataDir = os.path.join(projectDir, "data")
# assert os.path.exists(solDir)
# assert os.path.exists(dataDir)


# # In[4]:


# print('loading in training data ....')


# # In[5]:


# trainData = pd.read_csv(os.path.join(dataDir, "trainData.csv.gz"), sep=',', compression='gzip', index_col=0)
# trainTargets = pd.read_csv(os.path.join(dataDir, "trainTargets.csv.gz"), sep=',', compression='gzip', index_col=0)


# In[6]:


# Re-assign training data and targets for scikit-learn
X_train = d3mds.get_train_data()
y_train = d3mds.get_train_targets().ravel()
print(y_train)

# In[7]:


# add word-length feature
print('adding derived word length feature ....')
X_train['word_length'] = X_train.apply(lambda row: len(row['Word']),axis=1)
# quick and dirty
X_train.drop(['Word'],axis=1, inplace=True)
# One-Hot Encode Categorical Variables
# simple categorical column detection

cat_cols = []
for index,val in X_train.tail(1).iteritems():
	if isinstance(val.values[0],str): # simple categorical feature detection
		cat_cols.append(index)
# one-hot encode
X_train = encode_onehot(X_train, cat_cols)


# In[8]:


print('training model on train data ...')
print('using 10-fold CV...')

cv = StratifiedKFold(n_splits=10, random_state=42, shuffle=True)
parameters = {'n_estimators':[100, 200, 300]}
rf = GridSearchCV(estimator=ensemble.RandomForestClassifier(class_weight="balanced"), 
					   param_grid=parameters, 
					   scoring='f1_macro', 
					   cv=cv)

# cv = StratifiedKFold(n_splits=2, random_state=42, shuffle=True)
# parameters = {'n_estimators':[100]}
# rf = GridSearchCV(estimator=ensemble.RandomForestClassifier(class_weight="balanced"), 
# 					   param_grid=parameters, 
# 					   scoring='f1_macro', 
# 					   cv=cv)


# rf = ensemble.RandomForestClassifier(n_estimators=100)
rf.fit(X_train,y_train)
# print(list(zip(X_train, rf.best_estimator_.feature_importances_)))
rf_score = rf.best_score_
print('f1 score on training CV', rf.best_score_)

# In[9]:


print('making prediciton on test data ....')
print('loading test data ...')

X_test = d3mds.get_test_data()
# add word-length feature
X_test['word_length'] = X_test.apply(lambda row: len(row['Word']),axis=1)
# quick and dirty
X_test.drop(['Word'],axis=1, inplace=True)
# One-Hot Encode Categorical Variables
# simple categorical column detection
cat_cols = []
for index,val in X_test.tail(1).iteritems():
	if isinstance(val.values[0],str): # simple categorical feature detection
		cat_cols.append(index)
# one-hot encode
X_test = encode_onehot(X_test, cat_cols)

print('calling predict ...')
y_pred = pd.DataFrame(rf.predict(X_test)).values.ravel()

print(y_pred)

targetCols = []
targets = d3mds.problem.get_targets()
for target in targets: targetCols.append(target['colName'])
	
testData = d3mds.get_test_data()

y_pred_df = pd.DataFrame(index=testData.index, data=y_pred, columns=targetCols)
print(y_pred_df.head())

y_pred_df.to_csv(os.path.join(solpath, 'predictions.csv'))


# In[10]:

print('computing performance on test data ...')
y_test = d3mds.get_test_targets()
f1 = metrics.f1_score(y_test, y_pred, average='macro')
print('f1 score on test data', f1)

# In[11]:
# save scores.csv file
df = pd.DataFrame(columns=['metric', 'value'])
df.loc[len(df)] = ['f1Macro', f1]
df.to_csv(os.path.join(solpath, 'scores.csv'))



