# -*- coding: utf-8 -*-
"""
Given the path to a data file (learningData.csv), this script generates a split
and saves it in output directory.

@author: JO21372
"""

import os
import csv
import sys
import numpy as np
import d3m_utils as utils
from collections import Counter
from sklearn.model_selection import train_test_split

DEFAULT_TRAIN_FRACTION = .8
SPLIT_RANDOM_STATE = 42
TYPE_TEST = "TEST"
TYPE_TRAIN = "TRAIN"


def readData(dataFilePath, classKey = 'class', d3mIndexKey = 'd3mIndex'):
    """ Returns 3 lists:
            1. d3mInds - d3m indices of samples with labels
            2. klasses - lables of samples indexed by corresponding elements in 1.
            3. missingLabelsInds -  d3m indices of samples with missing labels
        Note: Indices of samples that do not have a label don't appear in d3mInds.
        
        Arguments:
            1. dataFilePath - path to a data file (learningData.csv)
            2. classKey (default: 'class') - key of class column
            3. d3mIndexKey (default: 'd3mIndex') - key of d3m index column
    """
    d3mInds = []
    klasses = []
    missingLabelInds = [] 
    with open(dataFilePath, mode='r') as csv_file:
        csv_reader = csv.DictReader(csv_file)
        line_count = 0
        for row in csv_reader:
            #Print headers
            if line_count == 0:
                print(f'Column names are {", ".join(row)}')
            
            klass = row[classKey]
            d3mIndex = row[d3mIndexKey]
            #Check if label is missing and record
            if klass.strip() == "":
                missingLabelInds.append(d3mIndex)
            else:
                d3mInds.append(d3mIndex)
                klasses.append(klass)
                
            line_count += 1
            
        print(f'Processed {line_count} lines.')
        print(f'Number of samples with no label: {len(missingLabelInds)}')
        print(f'Num samples with labels: {len(d3mInds)}')
        print(f'Num total of samples: {len(d3mInds) + len(missingLabelInds)}')
        return d3mInds, klasses, missingLabelInds
        

def getNTest(nInstances, trainFraction):
        return round((1 - trainFraction) * nInstances)


def safeTrainTestSplit(indices, missingLabelInds, labels, doStratify, trainFraction, randState = SPLIT_RANDOM_STATE):
    """
    Returns two numpy arrays containing the d3m indices of the train and test samples
    respectively.
    """
    
    print(f'Splitting samples into a {trainFraction * 100} % train set.')
    ## Classes with one samples should be added to the train set after the split has been made.
    #Verify whether there are classes with just one sample.
    classesWithOneSample = set()
    counts = Counter(labels)
    #print(counts)
    for y, count in counts.items():
        if count < 2:
            print(f"** WARNING: Dataset contains only 1 sample of class: {y} **")
            classesWithOneSample.add(y)
    if len(classesWithOneSample) == 0:
        filteredIndices = indices
        filteredLabels  = labels
        lonelyIndices = []
    else:
        filteredIndices = []
        filteredLabels = []
        lonelyIndices = []
        for i in range(len(indices)):
            indx = indices[i]
            label = labels[i]
            if label in classesWithOneSample:
                lonelyIndices.append(indx)
            else:
                filteredIndices.append(indx)
                filteredLabels.append(label)

    #Get test sample size
    nTest = getNTest(len(filteredIndices), trainFraction)
    #Stratify?
    stratify = None
    if doStratify:
        stratify = filteredLabels
    #Split
    print(f'Splitting: random_state = {randState}, test_size = {nTest}, stratify={doStratify}\n')
    indxTrain, indxTest = train_test_split(np.array(filteredIndices), test_size=nTest, random_state=randState, stratify=stratify)
    
    #If samples with missing labels are present in dataset, add them to train set
    if len(missingLabelInds) > 0:
        print(f"\n** WARNING: Number of missing labels: {len(missingLabelInds)}. Adding those samples to train set.**\n")
        indxTrain = np.append(indxTrain, missingLabelInds)
    
    #Add lonely samples to the train set as well
    if len(lonelyIndices) > 0:
        indxTrain = np.append(indxTrain, lonelyIndices)
    
    return indxTrain, indxTest


def writeDataSplitFile(indxTrain, indxTest, outDir, splitFile = 'dataSplits.csv'):
    res = []
    for ind in indxTrain:
        res.append((ind,TYPE_TRAIN))
    for ind in indxTest:
        res.append((ind, TYPE_TEST))
    outFile = os.path.join(outDir, splitFile)
    print(f'Writing split to file {outFile}')
    
    #sort rows
    res.sort(key=lambda tup:int(tup[0]))
    #Write file
    with open(outFile, 'w') as outF:
        #Write header
        outF.write("d3mIndex,type,repeat,fold\n")
        for tup in res:
            outF.write(tup[0] + "," + tup[1] + "," + '0,0\n')
    
def generateSplitForDataset (corporaBaseDir, datasetName):
    dataFilePath = os.path.join(corporaBaseDir, datasetName, datasetName + "_dataset", 'tables', 'learningData.csv')
    outDir = utils.getProblemDir(corporaBaseDir, datasetName)
    
    testRatio, doStratify, randomSeed, splitsFile, classColName = utils.getSplitParameters(corporaBaseDir, datasetName)
    d3mInds, labels, missingLabelInds = readData(dataFilePath, classKey=classColName)
    indxTrain, indxTest = safeTrainTestSplit(d3mInds, missingLabelInds, labels, doStratify, 1 - testRatio, randomSeed)
    writeDataSplitFile(indxTrain, indxTest, outDir, splitsFile)
    
    #Report
    #print(indxTrain)
    #print(indxTest)
    totalNumSamples = len(indxTrain) + len(indxTest)
    numTrainSamples = len(indxTrain)
    numTestSamples = len(indxTest)
    print(f"Num of train samples: {numTrainSamples} ({numTrainSamples/totalNumSamples * 100}%)")
    print(f"Num of test samples: {numTestSamples} ({numTestSamples/totalNumSamples * 100}%)")

      
if __name__ == '__main__':
    """
    corporaBaseDir  - directory where corpora is.
    datasetListFile - path to file containing names of datasets to be processed.
    """
    if len(sys.argv) != 3:
        print("Usage: python splitData.py <corporaBaseDir> <datasetListFile>")
        sys.exit()
    
    corporaBaseDir = sys.argv[1]
    datasetListFile = sys.argv[2]
    datasets = utils.readListFromFile(datasetListFile)
    for ds in datasets:
        print(f'\n\nProcessing dataset {ds}')
        generateSplitForDataset(corporaBaseDir, ds)
    
   
