
# coding: utf-8
from functools import reduce
import re
import tarfile
import os, json, sys
import numpy as np
np.random.seed(1337)  # for reproducibility
from keras.utils.data_utils import get_file
from keras.utils import np_utils
from keras.layers.embeddings import Embedding
from keras.layers import Dense, Merge, Dropout, RepeatVector
from keras.layers import recurrent, merge
from keras.models import Sequential
from keras.preprocessing.sequence import pad_sequences
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score
import tensorflow as tf
import pandas as pd
import warnings
warnings.filterwarnings('ignore')
from collections import OrderedDict


# rootDir = '../..'
# dataDir = os.path.join(rootDir,'data')
# assert os.path.exists(dataDir)
# rawDir = os.path.join(dataDir,'raw_data')
# assert os.path.exists(rawDir)
# interimDir = os.path.join(dataDir,'interim')
# assert os.path.exists(interimDir)

here = os.path.dirname(os.path.abspath(__file__))

from d3mds import D3MDataset, D3MProblem, D3MDS

dspath = os.path.join(here, '..', '..', '32_wikiqa_dataset')
prpath = os.path.join(here, '..', '..', '32_wikiqa_problem')
rawDir = os.path.join(dspath, 'tables')
solpath = os.path.join(here, '..')
GLOVE_DIR= os.path.join(here, 'Glove')
assert os.path.exists(dspath)
assert os.path.exists(prpath)
assert os.path.exists(GLOVE_DIR)

requirements = ['nltk','gensim','tensorflow','keras', 'Glove/glove.6B.100d.txt']


RNN = recurrent.LSTM
EMBED_HIDDEN_SIZE = 100
SENT_HIDDEN_SIZE = 100
QUERY_HIDDEN_SIZE = 100
BATCH_SIZE = 300
EPOCHS = 1
nb_classes=2
print('RNN / Embed / Sent / Query = {}, {}, {}, {}'.format(RNN, EMBED_HIDDEN_SIZE, SENT_HIDDEN_SIZE, QUERY_HIDDEN_SIZE))



d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

def tokenize(sent):
	'''Return the tokens of a sentence including punctuation.

	>>> tokenize('Bob dropped the apple. Where is the apple?')
	['Bob', 'dropped', 'the', 'apple', '.', 'Where', 'is', 'the', 'apple', '?']
	'''
	return [x.strip() for x in re.split('(\W+)?', sent) if x.strip()]


def buildtrainfile(fileName):
		fp=open(fileName,'r')
		data= []
		for line in fp:
			#print (line)
			if '\t' in line:
				arr= line.split('\t')
				data.append((tokenize(arr[0]),tokenize(arr[1]),arr[2].strip()))
		fp.close()
		#print (data)
		return data
	
def buildData_new(whichData='train'):
	
	Q = pd.read_csv(os.path.join(rawDir, 'questions.csv'), index_col=0)
	S = pd.read_csv(os.path.join(rawDir, 'sentences.csv'), index_col=0)
	
	if whichData=='train':
		dfData = d3mds.get_train_data()
		targets = d3mds.get_train_targets().ravel()
	elif whichData=='test':
		dfData = d3mds.get_test_data()
		targets = d3mds.get_test_targets().ravel()

	dfTargets = pd.DataFrame(index=dfData.index, data=targets, columns=[target['colName'] for target in d3mds.problem.get_targets()])

	dfData = pd.concat([dfData, dfTargets], axis=1)
	
	print(dfData['isAnswer'].value_counts())
	
	dfData.insert(1, 'question',dfData['qIndex'].apply(lambda i: Q.iloc[i]))
	dfData.pop('qIndex')
	dfData.insert(2, 'sentence',dfData['sIndex'].apply(lambda i: S.iloc[i]))
	dfData.pop('sIndex')
	return dfData

def df2array(df):
	data=[]
	for i, row in enumerate(df.iterrows()):
		qText = row[1].question
		sText = row[1].sentence
		isAnswer = row[1].isAnswer
#         print(qText, sText, isAnswer)
		data.append((tokenize(qText),tokenize(sText),isAnswer))
	return data


def vectorize_stories(data, word_idx, story_maxlen, query_maxlen):
	X = []
	Xq = []
	Y = []
	for story, query, answer in data:
		x = [word_idx[w] for w in story]
		xq = [word_idx[w] for w in query]
		if answer==0:
			Y.append(0)
		else:
			Y.append(1)
		X.append(x)
		Xq.append(xq)
	return pad_sequences(X, maxlen=story_maxlen), pad_sequences(Xq, maxlen=query_maxlen), np.array(Y)


def prepare_embeddings_matrix(vocab_size, vocab):
	embeddings_index = {}
	f = open(os.path.join(GLOVE_DIR, 'glove.6B.100d.txt'))
	for line in f:
		values = line.split()
		word = values[0]
		coefs = np.asarray(values[1:], dtype='float32')
		embeddings_index[word] = coefs
	f.close()

	print('Found %s word vectors.' % len(embeddings_index))
	
	embedding_matrix = np.zeros((vocab_size, EMBED_HIDDEN_SIZE))
	for i, word in enumerate(vocab):
		embedding_vector = embeddings_index.get(word)
		if embedding_vector is not None:
			# words not found in embedding index will be all-zeros.
			embedding_matrix[i] = embedding_vector    
	return(embedding_matrix)


## exploring model space on train data

print('exploring model space on training data...')


# In[10]:


print('loading train data ...')
df = buildData_new(whichData='train')
print(df.shape)

splitPoint = 20360 # this split was provided in the datasets


print('splitting the trian data into train and validation data')
trainData = df2array(df[:splitPoint].copy())
validData = df2array(df[splitPoint:].copy())

print('loading the vocabulary form vocabulary.csv file....')
vocab = list(pd.read_csv(os.path.join(rawDir,'vocabulary.csv'), index_col=0)['word'])
vocab_size = len(vocab) + 1
print('vocab_size',vocab_size)
word_idx = dict((c, i + 1) for i, c in enumerate(vocab))
story_maxlen = max(map(len, (x for x, _, _ in trainData + validData)))
query_maxlen = max(map(len, (x for _, x, _ in trainData + validData)))

X, Xq, Y = vectorize_stories(trainData, word_idx, story_maxlen, query_maxlen)
X.shape, Xq.shape, Y.shape

vX, vXq, vY = vectorize_stories(validData, word_idx, story_maxlen, query_maxlen)
vX.shape, vXq.shape, vY.shape

Y_label=Y
vY_label=vY

Y= np_utils.to_categorical(Y, nb_classes)
vY= np_utils.to_categorical(vY, nb_classes)

print('X.shape = {}'.format(X.shape))
print('Xq.shape = {}'.format(Xq.shape))
print('Y.shape = {}'.format(Y.shape))
print('story_maxlen, query_maxlen = {}, {}'.format(story_maxlen, query_maxlen))
print('vX.shape = {}'.format(vX.shape))
print('vXq.shape = {}'.format(vXq.shape))
print('vY.shape = {}'.format(vY.shape))

print('matrix embedding...')
embedding_matrix= prepare_embeddings_matrix(vocab_size, vocab)
print(embedding_matrix.shape)

print('Build model...')
sentrnn = Sequential()
sentrnn.add(Embedding(vocab_size, EMBED_HIDDEN_SIZE, weights= [embedding_matrix],input_length=story_maxlen, trainable= False))

sentrnn.add(Dropout(0.3))

qrnn = Sequential()
qrnn.add(Embedding(vocab_size, EMBED_HIDDEN_SIZE, weights= [embedding_matrix],input_length=query_maxlen, trainable= False))

qrnn.add(Dropout(0.3))
qrnn.add(RNN(EMBED_HIDDEN_SIZE, return_sequences=False))
qrnn.add(RepeatVector(story_maxlen))

model = Sequential()
model.add(Merge([sentrnn, qrnn], mode='sum', concat_axis=1))
model.add(RNN(EMBED_HIDDEN_SIZE, return_sequences=False))
model.add(Dropout(0.3))
model.add(Dense(2, activation='softmax'))
model.compile(optimizer='adam',
			  loss='categorical_crossentropy',
			  metrics=['binary_accuracy'])


if os.path.exists(os.path.join(here, 'my_model_weights.h5')):
	model.load_weights(os.path.join(here,'my_model_weights.h5'))
	print('loading pre-trained model...')
else:
	print('Training...')
	print('\tmodel fitting with train and validation_data...')
	class_weight = {0 : 1., 1: 6}
#     hist= model.fit([X, Xq], Y, batch_size=BATCH_SIZE, nb_epoch=EPOCHS,  validation_split=0.2, class_weight=class_weight)
	hist= model.fit([X, Xq], Y, batch_size=BATCH_SIZE, epochs=EPOCHS,  validation_data=([vX, vXq],vY), class_weight=class_weight)
	# model.fit([X, Xq], Y, batch_size=BATCH_SIZE, nb_epoch=EPOCHS, validation_split=0.05)
	model.save_weights(os.path.join(here,'my_model_weights.h5'))
	print('\tpersisting the trained model weights in my_model_weights.h5 file...')
	

print('computing performance on dev data...')
loss, acc = model.evaluate([vX, vXq], vY, batch_size=BATCH_SIZE)

print('dev loss / dev accuracy = {:.4f} / {:.4f}'.format(loss, acc))

## Making prediction on test data
print('making prediction on test data...')
testData = df2array(buildData_new(whichData='test'))
tX, tXq, tY = vectorize_stories(testData, word_idx, story_maxlen, query_maxlen)
y_pred = model.predict_classes([tX, tXq]).tolist()
# y_pred_df = pd.DataFrame(index=testData.index, data=y_pred, columns=[target['colName'] for target in d3mds.problem.get_targets()])
y_pred_df = pd.DataFrame(data=y_pred, columns=[target['colName'] for target in d3mds.problem.get_targets()])
y_pred_df.index = d3mds.get_test_data().index
y_pred_df.to_csv(os.path.join(solpath, 'predictions.csv'))

print("================================================================================================================")
print('computing performance on test data... ')

tY_label=tY
tY= np_utils.to_categorical(tY, nb_classes)
loss, acc = model.evaluate([tX, tXq], tY, batch_size=BATCH_SIZE)
print('Test loss / test accuracy = {:.4f} / {:.4f}'.format(loss, acc))

y_test= tY_label
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
print('Accuracy: {}'.format(accuracy))
print('Recall: {}'.format(recall))
print('Precision: {}'.format(precision))
print('F1: {}'.format(f1))

# saving the scores.csv file
df = pd.DataFrame(columns=['metric', 'value'])
df.loc[len(df)] = ['f1', f1]
df.to_csv(os.path.join(solpath, 'scores.csv'))


