
# coding: utf-8

import numpy as np
import pandas as pd
import os, json, sys, random
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix


if __name__ == "__main__":
	here = os.path.dirname(os.path.abspath(__file__))

	from d3mds import D3MDataset, D3MProblem, D3MDS

	dspath = os.path.join(here, '..', '..', 'LL0_acled_dataset')
	prpath = os.path.join(here, '..', '..', 'LL0_acled_problem')
	assert os.path.exists(dspath)
	assert os.path.exists(prpath)

	d3mds = D3MDS(dspath, prpath) # this checks that the problem and dataset correspond

	print('\nLoading train and test data')
	X_train = d3mds.get_train_data()
	y_train = d3mds.get_train_targets().ravel()
	print('X_train shape:', X_train.shape)
	print('y_train shape:', y_train.shape)

	X_test = d3mds.get_test_data()
	y_test = d3mds.get_test_targets().ravel()
	print('X_test shape:', X_test.shape)
	print('y_test shape:', y_test.shape)

	X_train = X_train[['notes']]
	X_test = X_test[['notes']]

	# Convert categorical labels to integers
	le = LabelEncoder()
	y_train_encoded = le.fit_transform(y_train)
	y_test_encoded = le.transform(y_test)

	print('\nBuilding and applying TF-IDF vectorizer')
	text_train = X_train['notes'].values
	vectorizer = TfidfVectorizer(token_pattern='(?u)\\b[^\d\W]+\\b')
	X_train_vec = vectorizer.fit_transform(text_train) 

	print('\nTraining Random Forest Classifier')
	clf = RandomForestClassifier(n_estimators=100, random_state=0)
	clf.fit(X_train_vec, y_train_encoded)

	# print('\nEvaluating model on train set')
	# X_train_vec = vectorizer.transform(text_train)
	# pred_train = clf.predict(X_train_vec)
	# accuracy_train = accuracy_score(y_train_encoded, pred_train)
	# confusion_mat_train = confusion_matrix(y_train_encoded, pred_train)
	# print('Accuracy (train): ', accuracy_train)
	# print('Confusion Matrix (train): \n', confusion_mat_train)

	print('\nEvaluating model on test set')
	text_test = X_test['notes'].values
	X_test_vec = vectorizer.transform(text_test)
	pred_test = clf.predict(X_test_vec)
	accuracy_test = accuracy_score(y_test_encoded, pred_test)
	#confusion_mat_test = confusion_matrix(y_test_encoded, pred_test)
	print('Accuracy (test): ', accuracy_test)
	# print('Confusion Matrix (test): \n', confusion_mat_test)

	# Save predictions.csv
	target_cols = ([target['colName'] for target in d3mds.problem.get_targets()])
	y_predict_df = pd.DataFrame(data=le.inverse_transform(pred_test), index=X_test.index, columns=target_cols)
	# y_predict_df = pd.DataFrame(data=pred_test, index=X_test.index, columns=target_cols)
	y_predict_df.to_csv(os.path.join(here, '..', 'predictions.csv'))

	# Save scores.csv file
	df = pd.DataFrame(columns=['metric', 'value'])
	df.loc[len(df)] = ['accuracy', accuracy_test]
	df.to_csv(os.path.join(here, '..', 'scores.csv'))
