# -*- coding: utf-8 -*-
# file: d3mds.py
# lab: MIT Lincoln Lab
# author(s): sw26425
# description: a rudimentary API for interacting with D3MDataSupply, which mainly consists of a Dataset and a Problem

import os, json, sys
import pandas as pd
import numpy as np
import warnings

DATASET_SCHEMA_VERSION = '3.0'
PROBLEM_SCHEMA_VERSION = '3.0'

class D3MDataset:
	dsHome = None
	dsDoc = None
	learningDataFile = None

	def __init__(self, datasetPath):
		self.dsHome = datasetPath

		# read the schema in dsHome
		_dsDoc = os.path.join(self.dsHome, 'datasetDoc.json')
		assert os.path.exists(_dsDoc)
		with open(_dsDoc, 'r') as f:
			self.dsDoc = json.load(f)

		# make sure the versions line up
		if self.get_datasetSchemaVersion() != DATASET_SCHEMA_VERSION:
			warnings.warn("the datasetSchemaVersions in the API and datasetDoc do not match !!!!!!!")


		# locate the special learningData file
		self.learningDataFile = self._get_learning_data_path()

	def get_datasetID(self):
		"""
		Returns the datasetID from datasetDoc
		"""
		return self.dsDoc['about']['datasetID']

	def get_datasetSchemaVersion(self):
		"""
		Returns the dataset schema version that was used to create this dataset
		"""
		return self.dsDoc['about']['datasetSchemaVersion']

	def get_learning_data(self, view=None, problem=None):
		"""
		Returns the contents of learningData.doc as a DataFrame.
		If view is 'TRAIN' or 'TEST', then the full learningData is filtered to return learningData only for that view.
		For view-based filtering, the problem object has to be passed because this method used the splitsData from the problem.
		"""
		df = pd.read_csv(self.learningDataFile, index_col='d3mIndex')

		if view is None:
			return df

		if view.upper() == 'TRAIN' or view.upper() == 'TEST':
			if problem is None:
				raise RuntimeError('asking for learningData for a split, but the problem is not given') 
			splitsdf = problem.get_datasplits(view)
			df = df.loc[splitsdf.index]
			return df

	def get_learning_data_columns(self):
		res = self._get_learning_data_resource()
		return res['columns']


	def set_learning_data(self, df):
		"""
		Sets the contents of the learningData file to df
		"""
		df.to_csv(self.learningDataFile)


	def delete_column_entries(self, target):
		"""
		Deletes all the entries of a particular column of a particular tabular data resource.
		The deleted entries are set to numpy.NaN
		"""
		resID = target['resID']
		colIndex = target['colIndex']
		colName = target['colName']

		for res in self.dsDoc['dataResources']:
			_resID = res['resID']
			if _resID != resID:
				continue
			_resPath = res['resPath']
			_resPath = os.path.join(self.dsHome, _resPath)
			_resType = res['resType']
			assert _resType == 'table'
			for col in res['columns']:
				_colIndex = col['colIndex']
				if _colIndex != colIndex:
					continue
				_colName = col['colName']
				assert _colName == colName
				df = pd.read_csv(_resPath)
				df[_colName] = [np.NaN]*len(df[_colName])
				df.to_csv(_resPath, index=None)
				return True
			raise RuntimeError('could not find the column') 
		raise RuntimeError('could not find the resource')

	def delete_identifying_fields(self, view):
		"""
		Deletes some fields that might contain identifying information. 
		These fields should not be in the train or test view during the blinds evaluation.
		"""
		assert view.upper()=='TRAIN' or view.upper()=='TEST' # ensures we perform this only if view is train or test
		
		self.dsDoc['about']['datasetName']='NULL'
		self.dsDoc['about']['redacted'] = True
		
		try:
			del self.dsDoc['about']['description']
		except KeyError:
			pass
		try:
			del self.dsDoc['about']['citation']
		except KeyError:
			pass
		try:
			del self.dsDoc['about']['source']
		except KeyError:
			pass
		try:
			del self.dsDoc['about']['sourceURI']
		except KeyError:
			pass
		
		# save datasetDoc.json file
		with open(os.path.join(self.dsHome, 'datasetDoc.json'), 'w') as fp:
			json.dump(self.dsDoc, fp, indent=2, sort_keys=False)



	############# private methods 
	def _get_learning_data_path(self):
		"""
		Returns the path of learningData.csv in a dataset
		"""
		for res in self.dsDoc['dataResources']:
			resID = res['resID']
			resPath = res['resPath']
			resType = res['resType']
			resFormat = res['resFormat']
			
			dirname = os.path.basename(os.path.normpath(os.path.dirname(resPath)))

			if resType =='table' and dirname=='tables':
				if 'learningData.csv' in res['resPath'] :
					return os.path.join(self.dsHome, resPath)
				else:
					# raise RuntimeError('non-CSV learningData (not implemented yet ...)')		
					continue
		# if the for loop is over and learningDoc is not found, then return None
		raise RuntimeError('could not find learningData file the dataset')

	def _get_learning_data_resource(self):
		"""
		Returns the path of learningData.csv in a dataset
		"""
		for res in self.dsDoc['dataResources']:
			resID = res['resID']
			resPath = res['resPath']
			resType = res['resType']
			resFormat = res['resFormat']
			if resType =='table':
				if 'learningData.csv' in res['resPath'] :
					return res
				else:
					raise RuntimeError('could not find learningData.csv')		
		# if the for loop is over and learningDoc is not found, then return None
		raise RuntimeError('could not find learningData resource')


class D3MProblem:
	prHome = None
	prDoc = None
	splitsFile = None

	def __init__(self, problemPath):
		self.prHome = problemPath

		# read the schema in prHome
		_prDoc = os.path.join(self.prHome, 'problemDoc.json')
		assert os.path.exists(_prDoc)
		with open(_prDoc, 'r') as f:
			self.prDoc = json.load(f)

		# make sure the versions line up
		if self.get_problemSchemaVersion() != PROBLEM_SCHEMA_VERSION:
			warnings.warn("the problemSchemaVersions in the API and datasetDoc do not match !!!!!!!")

		# locate the splitsFile
		self.splitsFile = self._get_datasplits_file()

	def get_problemID(self):
		"""
		Returns the problemID from problemDoc
		"""
		return self.prDoc['about']['problemID']

	def get_problemSchemaVersion(self):
		"""
		Returns the problem schema version that was used to create this dataset
		"""
		return self.prDoc['about']['problemSchemaVersion']

	def get_datasetID(self):
		"""
		Returns the ID of the dataset referenced in the problem 
		"""
		return self.prDoc['inputs']['data'][0]['datasetID']

	def get_targets(self):
		"""
		Looks at the problemDoc and returns the colIndex and colName of the target variable
		"""
		return self.prDoc['inputs']['data'][0]['targets']

	def get_datasplits(self, view=None):
		"""
		Returns the data splits splits in a dataframe
		"""
		df = pd.read_csv(self.splitsFile, index_col='d3mIndex')
		
		if view is None:
			return df
		elif view.upper() == 'TRAIN':
			df = df[df['type']=='TRAIN']
			return df
		elif view.upper() == 'TEST':
			df = df[df['type']=='TEST']
			return df

	def set_datasplits(self, df):
		"""
		Sets the contents of the dataSplits file to df
		"""
		df.to_csv(self.splitsFile)

	def delete_identifying_fields(self, view):
		"""
		Deletes some fields that might contain identifying information. 
		These fields should not be in the train or test view during the blinds evaluation.
		"""
		assert view.upper()=='TRAIN' or view.upper()=='TEST' # ensures we perform this only if view is train or test
		
		self.prDoc['about']['problemName']='NULL'
		try:
			del self.prDoc['about']['problemDescription']
		except KeyError:
			pass
		
		# save datasetDoc.json file
		with open(os.path.join(self.prHome, 'problemDoc.json'), 'w') as fp:
			json.dump(self.prDoc, fp, indent=2, sort_keys=False)

	def get_performance_metrics(self):
		return self.prDoc['inputs']['performanceMetrics']

	############# private methods 
	def _get_datasplits_file(self):
		splitsFile = self.prDoc['inputs']['dataSplits']['splitsFile']
		splitsFile = os.path.join(self.prHome, splitsFile)
		assert os.path.exists(splitsFile)
		return splitsFile


class D3MDS:
	dataset = None
	problem = None
	
	def __init__(self, datasetPath, problemPath):
		self.dataset = D3MDataset(datasetPath) 
		self.problem = D3MProblem(problemPath)
		# sanity check
		assert self.dataset.get_datasetID() == self.problem.get_datasetID()

	def _get_target_columns(self, df):
		target_cols = []
		targets = self.problem.get_targets()
		for target in targets:
			colIndex = target['colIndex']-1 # 0th column is d3mIndex
			colName = df.columns[colIndex]
			assert colName == target['colName']
			target_cols.append(colIndex)
		return target_cols

	def get_data_all(self):
		df = self.dataset.get_learning_data(view=None, problem=None)
		return df

	def get_train_data(self):
		df = self.dataset.get_learning_data(view='train', problem=self.problem)
		target_cols = self._get_target_columns(df)
		df.drop(df.columns[target_cols],axis=1,inplace=True)
		return df

	def get_train_targets(self):
		df = self.dataset.get_learning_data(view='train', problem=self.problem)
		target_cols = self._get_target_columns(df)
		X = df.shape[0]
		Y = len(target_cols)
		return (df[df.columns[target_cols]]).as_matrix().reshape(X,Y)
		# return np.ravel(df[df.columns[target_cols]])
		
	def get_test_data(self):
		df = self.dataset.get_learning_data(view='test', problem=self.problem)
		target_cols = self._get_target_columns(df)
		df.drop(df.columns[target_cols],axis=1,inplace=True)
		return df

	def get_test_targets(self):
		df = self.dataset.get_learning_data(view='test', problem=self.problem)
		target_cols = self._get_target_columns(df)
		X = df.shape[0]
		Y = len(target_cols)
		return (df[df.columns[target_cols]]).as_matrix().reshape(X,Y)
		# return np.ravel(df[df.columns[target_cols]])
