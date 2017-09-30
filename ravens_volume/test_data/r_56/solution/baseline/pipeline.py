
# coding: utf-8

# In[1]:


import os, json, itertools, sys
import pandas as pd
from d3mTS import D3MTS
import pyflux as pf
from sklearn.metrics import mean_squared_error
from math import sqrt
import numpy as np
from collections import OrderedDict


# ## Make pipeline

# In[2]:


print('begin pipeline ...')


# In[3]:


dataset_dir = os.path.abspath('../..')
d3m = D3MTS(dataset_dir)
# print(d3m.data_schema.dataset_id)


# In[4]:


# class for loading/saving .timeseries format
class TimeSeries(object):
    def __init__(self, df):
        self.df = df.copy()
        self.df.index.name = 'time'
        self.df.columns = df.columns
    
    def save(self, file):
        try:
            self._save(file)
        except AttributeError:
            with open(file, 'w', encoding='utf-8') as f:
                self._save(f)
    
    def _save(self, f):
        self.df.to_csv(f)
    
    @classmethod
    def load(cls, file):
        try:
            return cls._load(file)
        except AttributeError:
            with open(file, 'r', encoding='utf-8') as f:
                res = cls._load(f)
            return res
    
    @classmethod
    def _load(cls, f):
        df = pd.read_csv(f, index_col='time')
        return cls(df)


# In[5]:


def get_train_validation_split(test_split=0.1):
    """
    split the given dataset into train/validation sets
    """
    print('train/validation split ...')
    train_validdation_split = {}
    for (tsName, tsFile) in zip(d3m.train_data['timeSeriesName'], 
                                d3m.train_data['timeSeriesDataFile']):
        ## load training data from raw_data dir
        data = TimeSeries.load(d3m.open_raw_data(tsFile)).df.reset_index()
        splitpoint = len(data)-int(test_split*len(data))
        trainData = data[:splitpoint]
        validationData = data[splitpoint:]
        train_validdation_split[(tsName, 'train')] = trainData
        train_validdation_split[(tsName, 'validation')] = validationData
    return train_validdation_split


# ### Search model space using train/validation data

# Model space consists of three types of models:
# - ARIMA
# - Dynamic Autoregression (DAR) Model
# - GARCH model (Beta Skew-t)

# In[6]:


modelSpace = {
    'arima': {'ar':[2,3,4], 'ma':[4,5,6,7]},
#     'arima': {'ar':[2,], 'ma':[4,5]},
#     'dar':{'ar':[2,3,4]},
#     'garch':{'p':[1,2],'q':[1,2]}
}

trainedModels = {}

perf_fold1 = pd.DataFrame(columns=['fold','timeSeriesName', 'model', 'params', 'rmse'])
perf_fold2 = perf_fold1.copy()

print('loading train data ...')
print('exploring model space on train data (2-Fold CV) ...')

for fold, test_split in enumerate([0.1, 0.25]):
    print('fold:',fold)
    train_validdation_split = get_train_validation_split(test_split)
    
    for modelName, paramsDict in modelSpace.items():
        # get the cartesian product of model parameters, e.g. [{'ar': 2, 'ma': 2}, {'ar': 2, 'ma': 4}, {'ar': 4, 'ma': 2}, {'ar': 4, 'ma': 4}]
        paramCartesian = list((dict(zip(paramsDict, x)) for x in itertools.product(*paramsDict.values())))
        for paramCombo in paramCartesian: # e.g. {'ar': 2, 'ma': 2}
            for (tsName, tsFile) in zip(d3m.train_data['timeSeriesName'], 
                                d3m.train_data['timeSeriesDataFile']):
                TD = pd.DataFrame(train_validdation_split[(tsName, 'train')][tsName])
                VD = pd.DataFrame(train_validdation_split[(tsName, 'validation')][tsName])
                h = len(VD)
                model = None
                if modelName == 'arima':
                    ar = paramCombo['ar']
                    ma = paramCombo['ma']
                    model = pf.ARIMA(data=TD, ar=ar, ma=ma, integ=0, target=tsName, family=pf.Normal())
                    print('arima model %s %s %s'%(ar, ma, tsName),)
                    model.fit("MLE")
                    trainedModels[(tsName, 'arima', ar, ma)] = model
                elif modelName == 'dar':
                    ar = paramCombo['ar']
                    model = pf.DAR(data=TD, ar=ar, integ=0, target=tsName)
                    model.fit("MLE")
                    trainedModels[(tsName, 'dar', ar)] = model
                elif modelName == 'garch':
                    p = paramCombo['p']
                    q = paramCombo['q']
                    model = pf.SEGARCHM(p=p, q=q, data=TD, target=tsName)
                    model.fit()
                    trainedModels[(tsName, 'garch', p, q)] = model

                # evaluate the trained model on validation data
                if model != None:
                    try:
                        predict = model.predict(h=h)
                        rmse = sqrt(mean_squared_error(predict, VD))
                        if fold == 1:
                            perf_fold1.loc[len(perf_fold1)]=[fold, tsName, modelName, paramCombo, rmse]
                        else:
                            perf_fold2.loc[len(perf_fold2)]=[fold, tsName, modelName, paramCombo, rmse]
                    except:
                        pass
print('')


# In[10]:


perf = perf_fold1.copy()
perf['rmse'] = (perf_fold1['rmse']+perf_fold2['rmse'])/2
# perf


# ### Select the best models for each timeseries

# In[11]:


print('selecting best model for baseline ...')


# In[12]:


best_models = {}

for tsName in d3m.train_data['timeSeriesName']:
    model = (perf[perf['timeSeriesName']==tsName].sort_values('rmse').iloc[0][['model', 'params','rmse']])
    best_models[tsName] = model
    print('baseline model for %s'%tsName)
    print(model)
    
train_performance = OrderedDict([
    ('train', OrderedDict([
        ('split', OrderedDict([
                ('type', ['train_test_split','train_test_split']),
                ('n_splits', [1, 1]),
                ('test_size', [0.1, 0.25]),
                ('shuffle', [False, False])])
        ),
        ('score', OrderedDict([
                ('metric', 'rootMeanSquaredError'),
                ('value', [list(best_models.values())[0].rmse,list(best_models.values())[1].rmse]
                )])
        )
    ]))
])
# print(json.dumps(train_performance, indent=2))


# ## Submit predictions on testData

# In[13]:


print('loading test data ...')
try:
    testData = pd.concat([d3m.test_data, d3m.test_targets], axis=1)
except:
    print('Looks like this is a redacted dataset. testData is unavailable. Cannot complete this step ...')
    
# print(testData.shape)


# In[14]:


print('making predictions ...')


# In[15]:


# per series:
# 1. select the best model for that series
# 2. make predictions on that series portion of the testData
y_predict_perSeries = []

for tsName in testData['timeSeriesName'].unique():
    X_TD = testData[testData['timeSeriesName']==tsName]
    y_TD = pd.DataFrame(X_TD.pop('value'))
#     print(X_TD.tail())
#     print(y_TD.tail())
    
    h = len(y_TD)
    best_model = None
    
    # retrieve the best model for the timeSeries
    best_model_specs = best_models[tsName]
    best_model_type = best_model_specs.model
    if best_model_type == 'arima':
        best_model = trainedModels[(tsName, 'arima', ar, ma)]
    elif best_model_type == 'dar':
        pass
    elif best_model_type == 'garch':
        pass
    assert best_model != None
    
    y_P = best_model.predict(h=h)
    y_P.index = y_TD.index
    y_P.columns=['value']
#     print(y_P.tail())
    y_predict_perSeries.append(y_P)


# In[16]:


print('saving predictions in testTargets.csv ...')


# In[17]:


# combine the y's per series to get the overall y
y = pd.concat(y_predict_perSeries, axis=0)
# print(y.head())
# print(y.tail())
# save the y
y.to_csv('testTargets.csv')


# ## Compute performance on test data

# In[18]:


print('computing performance on testData (assuming the testTargets is available) ...')


# In[19]:


test_performance = OrderedDict()


# In[20]:


y_truth = d3m.test_targets
y_predicted = y
rmse = sqrt(mean_squared_error(y_truth, y_predicted))
print('performance on test data (rmse):',rmse)
print('saving the performance score ...')
test_performance = OrderedDict([
    ('test', OrderedDict([
        ('score', OrderedDict([
                ('metric', 'rootMeanSquaredError'),
                ('value', rmse)])
        )
    ]))
])


# In[21]:


overall_performance = OrderedDict()
overall_performance.update(train_performance)
overall_performance.update(test_performance)

with open('performance.json', 'w', encoding='utf-8') as f:
    json.dump(overall_performance, f, indent=2)
print(json.dumps(overall_performance, indent=2))


# In[ ]:



