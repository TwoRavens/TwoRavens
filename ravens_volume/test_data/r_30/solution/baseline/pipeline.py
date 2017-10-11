
# coding: utf-8

# In[1]:


import nltk, os, glob
import pandas as pd
from normalization import normalize_corpus, tokenize_text
import numpy as np
import codecs
from sklearn.datasets.base import Bunch
from sklearn.cross_validation import train_test_split
from sklearn.model_selection import cross_val_score, ShuffleSplit, KFold
from feature_extractors import bow_extractor, tfidf_extractor
from feature_extractors import averaged_word_vectorizer
from feature_extractors import tfidf_weighted_averaged_word_vectorizer
import nltk
import gensim
from sklearn import metrics
from sklearn.naive_bayes import MultinomialNB, GaussianNB
from sklearn.linear_model import SGDClassifier
import re, json
import warnings
warnings.filterwarnings('ignore')
from collections import OrderedDict
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score


# In[2]:


rootDir = '../..'
dataDir = os.path.join(rootDir, 'data')
assert os.path.exists(dataDir)
rawDir = os.path.join(dataDir, 'raw_data')
assert os.path.exists(rawDir)

TARGET_FIELD = 'extrovert'


# In[3]:


def get_data(whichData='train'):
    trainData = pd.read_csv(os.path.join(dataDir, '%sData.csv'%whichData), index_col=0)
    trainTargets = pd.read_csv(os.path.join(dataDir, '%sTargets.csv'%whichData), index_col=0)
    dataset = Bunch()
    dataset.data = np.array([]) 
    dataset.target = np.array([])
    for i, rf in enumerate(trainData['raw_text_file']):
        path = os.path.join(rawDir, rf)
        raw = open(path, encoding='utf-8').read()
        dataset.data = np.append(dataset.data, raw)
    dataset.target = trainTargets[TARGET_FIELD]
    return dataset


# In[4]:


print('reading training data corpus ...')
dataset = get_data(whichData='train')
corpus, labels = dataset.data, dataset.target


# In[5]:


print('normalizing corpus ...')
norm_corpus = normalize_corpus(corpus)


# In[6]:


print('creating BOW features ...')
bow_vectorizer, bow_features = bow_extractor(norm_corpus)


# In[7]:


print('creating tfidf features ...')
tfidf_vectorizer, tfidf_features = tfidf_extractor(norm_corpus)  


# In[ ]:





# In[9]:


print('creating averaged word vector features ...')
tokenized_corpus = [nltk.word_tokenize(text) for text in norm_corpus]
model = gensim.models.Word2Vec(tokenized_corpus, size=500, window=100, min_count=30, sample=1e-3)
avg_wv_features = averaged_word_vectorizer(corpus=tokenized_corpus, model=model, num_features=500) 


# In[10]:


print('creating tfidf weighted averaged word vector features ...')
vocab = tfidf_vectorizer.vocabulary_
tfidf_wv_features = tfidf_weighted_averaged_word_vectorizer(corpus=tokenized_corpus, tfidf_vectors=tfidf_features, 
                                                            tfidf_vocabulary=vocab, 
                                                            model=model, 
                                                            num_features=500)


# In[ ]:





# In[11]:


print('initializing RandomForestClassifier(RFC) and SVM classfiers ...')
rfc = RandomForestClassifier(max_depth=5, random_state=0)
svm = SGDClassifier(loss='hinge', n_iter=100, random_state=42)


# In[12]:


models=[]
scores=[]
train_performance = OrderedDict()


# In[13]:


print('training RFC with BOW features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=0)
cv_scores = cross_val_score(rfc, bow_features, labels, cv=cv, scoring='f1')
models.append((rfc, 'bow_features'))
scores.append(cv_scores.mean())


# In[14]:


print('training SVM with BOW features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=0)
cv_scores = cross_val_score(svm, bow_features, labels, cv=cv, scoring='f1')
models.append((svm, 'bow_features'))
scores.append(cv_scores.mean())


# In[15]:


print('training RFC with tfidf features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=0)
cv_scores = cross_val_score(rfc, tfidf_features, labels, cv=cv, scoring='f1')
models.append((rfc, 'tfidf_features'))
scores.append(cv_scores.mean())


# In[16]:


print('training SVM with tfidf features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=0)
cv_scores = cross_val_score(svm, tfidf_features, labels, cv=cv, scoring='f1')
models.append((svm, 'tfidf_features'))
scores.append(cv_scores.mean())


# In[17]:


print('training RFC  with avg_wv_features features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=0)
cv_scores = cross_val_score(rfc, avg_wv_features, labels, cv=cv, scoring='f1')
models.append((rfc, 'avg_wv_features'))
scores.append(cv_scores.mean())


# In[18]:


print('training SVM with avg_wv_features features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=0)
cv_scores = cross_val_score(svm, avg_wv_features, labels, cv=cv, scoring='f1')
models.append((svm, 'avg_wv_features'))
scores.append(cv_scores.mean())


# In[19]:


print('training RFC with tfidf_wv_features features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=0)
cv_scores = cross_val_score(rfc, tfidf_wv_features, labels, cv=cv, scoring='f1')
models.append((rfc, 'tfidf_wv_features'))
scores.append(cv_scores.mean())


# In[20]:


print('training SVM with tfidf_wv_features features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=0)
cv_scores = cross_val_score(svm, tfidf_wv_features, labels, cv=cv, scoring='f1')
models.append((svm, 'tfidf_wv_features'))
scores.append(cv_scores.mean())


# In[21]:


print('choosing the best model for baseline...')
baseline = models[np.argmax(scores)]
baselineScore = scores[np.argmax(scores)]
print('baseline model:', str(baseline))
print('baseline performance on 10-fold CV (mean f1):', baselineScore)
train_performance = OrderedDict([
    ('train', OrderedDict([
        ('split', OrderedDict([
                ('type', 'KFold'),
                ('n_splits', 10),
                ('shuffle', True),
                ('random_state', 0)])
        ),
        ('score', OrderedDict([
                ('metric', 'f1'),
                ('value', baselineScore)])
        )
    ]))
])


# In[22]:


print('training the model on the entire train data...')
baselineMod = baseline[0]
baselineFea = eval(baseline[1])


# In[23]:


baselineMod.fit(baselineFea, labels)


# ## Make prediction on testData

# In[29]:


print('making predictions on testData (assuming that testData is available) ...')
try:
    print('reading test data ...')
    dataset = get_data(whichData='test')
    corpus, labels = dataset.data, dataset.target

    print('normalizing corpus ...')
    norm_corpus = normalize_corpus(corpus)
    
    print('extracting tfidf features ...')
    tfidf_features = (tfidf_vectorizer.transform(norm_corpus))
    
    print('predicting ...')
    y_predict = pd.DataFrame(baselineMod.predict(tfidf_features))
    
    print('formatting and saving predictions as testTargets.csv ...')
    y_train = pd.read_csv(os.path.join(dataDir,'trainTargets.csv'), index_col=0)
    y_predict.columns = y_train.columns
    y_predict.index.name = y_train.index.name
    y_predict.to_csv('testTargets.csv')
except:
    print('Looks like this is a redacted dataset. testData is unavailable. Cannot complete this step ...')


# ## Compute perforamnce on testData

# In[30]:


test_performance = OrderedDict()


# In[31]:


print('computing performance on testData (assuming the testTargets is available) ...')
try:
    print('reading testTargets...')
    y_test = pd.read_csv(os.path.join(dataDir, 'testTargets.csv'), index_col=0)
    print('reading predictions ...')
    y_predict = pd.read_csv('testTargets.csv', index_col=0)
    print('computing score...')
    f1 = f1_score(y_test, y_predict)
    print('performance on test data (f1):',f1)
    print('saving the performance score...')
    test_performance = OrderedDict([
        ('test', OrderedDict([
            ('score', OrderedDict([
                    ('metric', 'f1'),
                    ('value', f1)])
            )
        ]))
    ])
except:
    raise
#     print('Looks like this is a redacted dataset. testTargets is unavailable. cannot complete this step ...')


# In[ ]:



