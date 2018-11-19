
# coding: utf-8

# In[1]:


import nltk, os, glob, sys
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


here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS

dspath = os.path.join(here, '..', '..', '30_personae_dataset')
prpath = os.path.join(here, '..', '..', '30_personae_problem')
solpath = os.path.join(here, '..')
textPath = os.path.join(dspath, 'text')
assert os.path.exists(dspath)
assert os.path.exists(prpath)

TARGET_FIELD = 'extrovert'
d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond
RANDOM_STATE = 100


# In[3]:


def get_data(whichData='train'):
    dataset = Bunch()
    dataset.data = np.array([]) 
    dataset.target = np.array([])

    if whichData=='train':
        data = d3mds.get_train_data()
        targets = d3mds.get_train_targets()
    elif whichData=='test':
        data = d3mds.get_test_data()
        targets = d3mds.get_test_targets()
    else:
        raise RuntimeError('get_data should be passed either train or test, but got%s'%whichData)

    for i, rf in enumerate(data['raw_text_file']):
        path = os.path.join(textPath, rf)
        raw = open(path, encoding='utf-8').read()
        dataset.data = np.append(dataset.data, raw)
    dataset.target = targets.ravel()

    return dataset


# In[4]:


print('reading training data corpus ...')
dataset = get_data(whichData='train')
corpus, labels = dataset.data, dataset.target

print('normalizing corpus ...')
norm_corpus = normalize_corpus(corpus)

print('creating BOW features ...')
bow_vectorizer, bow_features = bow_extractor(norm_corpus)
# print(bow_features.shape)

print('creating tfidf features ...')
tfidf_vectorizer, tfidf_features = tfidf_extractor(norm_corpus)  
# print(tfidf_features.shape)

print('creating averaged word vector features ...')
tokenized_corpus = [nltk.word_tokenize(text) for text in norm_corpus]
model = gensim.models.Word2Vec(tokenized_corpus, size=500, window=100, min_count=30, sample=1e-3)
avg_wv_features = averaged_word_vectorizer(corpus=tokenized_corpus, model=model, num_features=500) 
# print(avg_wv_features.shape)


print('creating tfidf weighted averaged word vector features ...')
vocab = tfidf_vectorizer.vocabulary_
tfidf_wv_features = tfidf_weighted_averaged_word_vectorizer(corpus=tokenized_corpus, tfidf_vectors=tfidf_features, 
                                                            tfidf_vocabulary=vocab, 
                                                            model=model, 
                                                            num_features=500)
# print(tfidf_wv_features.shape)

print('initializing RandomForestClassifier(RFC) and SVM classfiers ...')
rfc = RandomForestClassifier(n_estimators=20, max_depth=20, random_state=RANDOM_STATE)
svm = SGDClassifier(loss='hinge', n_iter=100, random_state=RANDOM_STATE)


models=[]
scores=[]
train_performance = OrderedDict()


print('training RFC with BOW features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(rfc, bow_features, labels, cv=cv, scoring='f1')
models.append((rfc, 'bow_features'))
scores.append(cv_scores.mean())


print('training SVM with BOW features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(svm, bow_features, labels, cv=cv, scoring='f1')
models.append((svm, 'bow_features'))
scores.append(cv_scores.mean())


print('training RFC with tfidf features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(rfc, tfidf_features, labels, cv=cv, scoring='f1')
models.append((rfc, 'tfidf_features'))
scores.append(cv_scores.mean())


print('training SVM with tfidf features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(svm, tfidf_features, labels, cv=cv, scoring='f1')
models.append((svm, 'tfidf_features'))
scores.append(cv_scores.mean())


print('training RFC  with avg_wv_features features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(rfc, avg_wv_features, labels, cv=cv, scoring='f1')
models.append((rfc, 'avg_wv_features'))
scores.append(cv_scores.mean())


print('training SVM with avg_wv_features features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(svm, avg_wv_features, labels, cv=cv, scoring='f1')
models.append((svm, 'avg_wv_features'))
scores.append(cv_scores.mean())


print('training RFC with tfidf_wv_features features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(rfc, tfidf_wv_features, labels, cv=cv, scoring='f1')
models.append((rfc, 'tfidf_wv_features'))
scores.append(cv_scores.mean())


print('training SVM with tfidf_wv_features features ...')
cv = KFold(n_splits=10, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(svm, tfidf_wv_features, labels, cv=cv, scoring='f1')
models.append((svm, 'tfidf_wv_features'))
scores.append(cv_scores.mean())


print('choosing the best model for baseline...')
baseline = models[np.argmax(scores)]
baselineScore = scores[np.argmax(scores)]
print('baseline model:', str(baseline))
print('baseline performance on 10-fold CV (mean f1):', baselineScore)
# In[22]:


print('training the model on the entire train data...')
baselineMod = baseline[0]
baselineFea = eval(baseline[1])
# print(baselineFea.shape)


baselineMod.fit(baselineFea, labels)
print('=============================================================================================')


## Make prediction on testData
print('making predictions on testData (assuming that testData is available) ...')
dataset = get_data(whichData='test')
corpus, labels = dataset.data, dataset.target

print('normalizing corpus ...')
norm_corpus = normalize_corpus(corpus)

print('creating BOW features ...')
bow_features = bow_vectorizer.transform(norm_corpus)
# print(bow_features.shape)

print('creating tfidf features ...')
tfidf_features = tfidf_vectorizer.transform(norm_corpus)
# print(tfidf_features.shape)


print('creating averaged word vector features ...')
tokenized_corpus = [nltk.word_tokenize(text) for text in norm_corpus]
model = gensim.models.Word2Vec(tokenized_corpus, size=500, window=100, min_count=30, sample=1e-3)
avg_wv_features = averaged_word_vectorizer(corpus=tokenized_corpus, model=model, num_features=500)
# print(avg_wv_features.shape)


print('creating tfidf weighted averaged word vector features ...')
vocab = tfidf_vectorizer.vocabulary_
tfidf_wv_features = tfidf_weighted_averaged_word_vectorizer(corpus=tokenized_corpus, tfidf_vectors=tfidf_features, 
                                                            tfidf_vocabulary=vocab, 
                                                            model=model, 
                                                            num_features=500)
# print(tfidf_wv_features.shape)

test_features = None
if baseline[1] == 'bow_features':
    test_features = bow_features
elif baseline[1] == 'tfidf_features':
    test_features = tfidf_features
elif baseline[1] == 'avg_wv_features':
    test_features = avg_wv_features
elif baseline[1] == 'tfidf_wv_features':
    test_features = tfidf_wv_features

print('predicting ...')
y_predict = baselineMod.predict(test_features)

y_truth = labels
f1 = f1_score(y_truth, y_predict)
print('baseline performance on test data (mean f1):', f1)

# save predictions.csv
X_test = d3mds.get_test_data()
target_cols = ([target['colName'] for target in d3mds.problem.get_targets()])
y_predict_df = pd.DataFrame(data=y_predict, index=X_test.index, columns=target_cols)
y_predict_df.to_csv(os.path.join(here, '..', 'predictions.csv'))

# save scores.csv file
df = pd.DataFrame(columns=['metric', 'value'])
df.loc[len(df)] = ['f1', f1]
df.to_csv(os.path.join(here, '..', 'scores.csv'))

