import pandas as pd
import shutil
import os
import json
import numpy as np
from dev_scripts.d3m_wrap_dataset import d3m_wrap_dataset

# 1. copy data into dev_scripts/big_data_paper
# 2. python
# 3. runfile('/home/shoe/TwoRavens/dev_scripts/big_data_paper_reformatter.py', wdir='/home/shoe/TwoRavens/dev_scripts')
data_input_dir = os.path.abspath('./big_data_paper/')
os.makedirs(data_input_dir, exist_ok=True)

data_intermediate_dir = os.path.abspath('./big_data_paper_intermediate/')
os.makedirs(data_intermediate_dir, exist_ok=True)

data_output_dir = os.path.abspath('/ravens_volume/test_data')
os.makedirs(data_output_dir, exist_ok=True)


def reformat_chenowith_ulfelder(dataset_name, predictors_function):
    targets = ['nvc.start.1']

    dataframe_train = pd.read_csv(
        os.path.join(data_input_dir, 'ChenowethUlfelder/cu_fig2_train.tsv'), delimiter='\t')
    dataframe_test = pd.read_csv(
        os.path.join(data_input_dir, 'ChenowethUlfelder/cu_fig2_test.tsv'), delimiter='\t')

    dataframe_merged = pd.concat([dataframe_train, dataframe_test], ignore_index=True)

    dataframe = predictors_function(dataframe_merged)
    predictors = dataframe.columns.values

    dataframe[targets[0]] = dataframe_merged[[targets[0]]]
    # build intermediate data file
    intermediate_data_path = os.path.join(data_intermediate_dir, dataset_name, 'learningData.csv')
    os.makedirs(os.path.dirname(intermediate_data_path), exist_ok=True)
    dataframe.to_csv(intermediate_data_path, index=False)

    dataset_dir = os.path.join(data_output_dir, dataset_name)
    if os.path.exists(dataset_dir):
        shutil.rmtree(dataset_dir)

    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[intermediate_data_path],
        about={
            'datasetName': dataset_name,
        },
        problem={
            'targets': targets,
            'predictors': predictors,
            'time': ['year'],
            'metrics': ['rocAuc', 'accuracy', 'precision', 'recall', 'f1']
        }
    )

    # load custom out-of-sample splits into TwoRavens/d3m
    dataframe_splits = pd.DataFrame({
        'd3mIndex': range(len(dataframe)),
        'type': (['TRAIN'] * len(dataframe_train)) + (['TEST'] * len(dataframe_test)),
        'repeat': [0] * len(dataframe),
        'fold': [0] * len(dataframe)
    })
    sample_splits_path = os.path.join(data_output_dir, dataset_name, 'TRAIN', 'problem_TRAIN', 'sampleSplits.csv')
    dataframe_splits.to_csv(sample_splits_path, index=False)
    problem_doc_path = os.path.join(data_output_dir, dataset_name, 'TRAIN', 'problem_TRAIN', 'problemDoc.json')
    with open(problem_doc_path, 'r') as problem_file:
        problem_doc = json.load(problem_file)

    problem_doc['inputs']['sampleSplits'] = {
        'splitsFile': 'sampleSplits.csv',
        'splitsDir': os.path.dirname(sample_splits_path),
        'testSize': None,
        'method': 'holdout'
    }
    with open(problem_doc_path, 'w') as problem_file:
        json.dump(problem_doc, problem_file)


def reformat_gelpi_avdan(dataset_name):
    predictors = ["polity2b", "polity2borigin", "loggdptarget", "logpop", "majpowhome", "majpoworigin", "coloniallink", "ethnictie", "ethnicPCW", "ethnicany911", "dyadalliance", "dyadalliancePCW", "rivalrydummy", "postCW", "post911", "lndyaddist", "dyadpcyear1", "dyadpcyear2", "dyadpcyear3", "dyadpcyear4"]
    targets = ['incident']

    dataframe = pd.read_csv(
        os.path.join(data_input_dir, 'GelpiAvdan2018/ga_TA2c.tsv'), delimiter='\t')

    dataframe = dataframe[predictors + targets + ['year']]

    # build intermediate data file
    intermediate_data_path = os.path.join(data_intermediate_dir, dataset_name, 'learningData.csv')
    os.makedirs(os.path.dirname(intermediate_data_path), exist_ok=True)
    dataframe.to_csv(intermediate_data_path, index=False)

    dataset_dir = os.path.join(data_output_dir, dataset_name)
    if os.path.exists(dataset_dir):
        shutil.rmtree(dataset_dir)

    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[intermediate_data_path],
        about={
            'datasetName': dataset_name,
        },
        problem={
            "taskType": "classification",
            "taskSubType": "binary",
            'targets': targets,
            'predictors': predictors,
            'metrics': ['rocAuc', 'accuracy', 'precision', 'recall', 'f1']
        }
    )

    # load custom out-of-sample splits into TwoRavens/d3m
    dataframe_splits = pd.DataFrame({
        'd3mIndex': range(len(dataframe)),
        'type': ['TRAIN' if year < 2002 else 'TEST' for year in dataframe['year']],
        'repeat': [0] * len(dataframe),
        'fold': [0] * len(dataframe)
    })
    sample_splits_path = os.path.join(data_output_dir, dataset_name, 'TRAIN', 'problem_TRAIN', 'sampleSplits.csv')
    dataframe_splits.to_csv(sample_splits_path, index=False)
    problem_doc_path = os.path.join(data_output_dir, dataset_name, 'TRAIN', 'problem_TRAIN', 'problemDoc.json')
    with open(problem_doc_path, 'r') as problem_file:
        problem_doc = json.load(problem_file)

    problem_doc['inputs']['sampleSplits'] = {
        'splitsFile': 'sampleSplits.csv',
        'splitsDir': os.path.dirname(sample_splits_path),
        'testSize': None,
        'method': 'holdout'
    }
    with open(problem_doc_path, 'w') as problem_file:
        json.dump(problem_doc, problem_file)


def reformat_gleditsch_ward(dataset_name, predictors):
    targets = ['mido']

    dataframe_train = pd.read_csv(
        os.path.join(data_input_dir, 'GleditschWard2013/gw_tab1.tsv'), delimiter='\t')
    dataframe_test = pd.read_csv(
        os.path.join(data_input_dir, 'GleditschWard2013/gw_tab1_test.tsv'), delimiter='\t')

    dataframe = pd.concat([dataframe_train, dataframe_test])

    dataframe = dataframe[predictors + targets]

    # build intermediate data file
    intermediate_data_path = os.path.join(data_intermediate_dir, dataset_name, 'learningData.csv')
    os.makedirs(os.path.dirname(intermediate_data_path), exist_ok=True)
    dataframe.to_csv(intermediate_data_path, index=False)

    dataset_dir = os.path.join(data_output_dir, dataset_name)
    if os.path.exists(dataset_dir):
        shutil.rmtree(dataset_dir)

    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[intermediate_data_path],
        about={
            'datasetName': dataset_name,
        },
        problem={
            'targets': targets,
            'predictors': predictors,
            'metrics': ['rocAuc', 'accuracy', 'precision', 'recall', 'f1']
        }
    )

    # load custom out-of-sample splits into TwoRavens/d3m
    dataframe_splits = pd.DataFrame({
        'd3mIndex': range(len(dataframe)),
        'type': (['TRAIN'] * len(dataframe_train)) + (['TEST'] * len(dataframe_test)),
        'repeat': [0] * len(dataframe),
        'fold': [0] * len(dataframe)
    })
    sample_splits_path = os.path.join(data_output_dir, dataset_name, 'TRAIN', 'problem_TRAIN', 'sampleSplits.csv')
    dataframe_splits.to_csv(sample_splits_path, index=False)
    problem_doc_path = os.path.join(data_output_dir, dataset_name, 'TRAIN', 'problem_TRAIN', 'problemDoc.json')
    with open(problem_doc_path, 'r') as problem_file:
        problem_doc = json.load(problem_file)

    problem_doc['inputs']['sampleSplits'] = {
        'splitsFile': 'sampleSplits.csv',
        'splitsDir': os.path.dirname(sample_splits_path),
        'testSize': None,
        'method': 'holdout'
    }
    with open(problem_doc_path, 'w') as problem_file:
        json.dump(problem_doc, problem_file)


def reformat_goldstone(dataset_name, dataset_filename):
    targets = ['sftpcons']

    dataframe = pd.read_csv(
        os.path.join(data_input_dir, 'GoldstoneEtAl2013', dataset_filename), delimiter='\t')

    # build intermediate data file
    intermediate_data_path = os.path.join(data_intermediate_dir, dataset_name, 'learningData.csv')
    os.makedirs(os.path.dirname(intermediate_data_path), exist_ok=True)
    dataframe.to_csv(intermediate_data_path, index=False)

    predictors = dataframe.columns.values[1:]

    dataset_dir = os.path.join(data_output_dir, dataset_name)
    if os.path.exists(dataset_dir):
        shutil.rmtree(dataset_dir)

    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[intermediate_data_path],
        about={
            'datasetName': dataset_name,
        },
        problem={
            "taskType": "classification",
            "taskSubType": "binary",
            'targets': targets,
            'predictors': predictors,
            'metrics': ['rocAuc', 'accuracy', 'precision', 'recall', 'f1']
        }
    )


def cu_base(dataframe):
    return pd.DataFrame({
        "log(wdi.pop)": np.log(dataframe['wdi.pop'])
    })


def cu_grievances(dataframe):
    return pd.DataFrame({
        "log(wdi.pop)": np.log(dataframe['wdi.pop']),
        "log(xxxcimr)": np.log(dataframe['xxxcimr']),
        "wdi.gdpchg.s": dataframe['wdi.gdpchg.s'],
        "sqrt(wdi.cpi)": np.sqrt(dataframe['wdi.cpi']),
        "log1p(bnn.yroff)": np.log1p(dataframe['bnn.yroff']),
        "elceleth.c": dataframe['elceleth.c'],
        "dispota4.c": dataframe['dispota4.c'],
        "cir.physint": dataframe['cir.physint'],
        "I(cir.physint^2)": np.power(dataframe['cir.physint'], 2)
    })


def cu_modernization(dataframe):
    return pd.DataFrame({
        "log(wdi.pop)": np.log(dataframe['wdi.pop']),
        "wdi.popurb.mi": dataframe['wdi.popurb.mi'],
        "I(wdi.manuf.mi + wdi.servs.mi)": dataframe['wdi.manuf.mi'] + dataframe['wdi.servs.mi'],
        "wdi.sch2.mi": dataframe['wdi.sch2.mi'],
        "log1p(wdi.mobp100)": np.log1p(dataframe['wdi.mobp100']),
        "ios.gattwto": dataframe['ios.gattwto']
    })


def cu_resource_mobilization(dataframe):
    return pd.DataFrame({
        "log(wdi.pop)": np.log(dataframe['wdi.pop']),
        "wdi.popurb.mi": dataframe['wdi.popurb.mi'],
        "ythbul4": dataframe['ythbul4'],
        "log1p(bnk.unrest)": np.log1p(dataframe['bnk.unrest']),
        "log1p(bnk.strikes)": np.log1p(dataframe['bnk.strikes']),
        "log1p(nvc.dosregt)": np.log1p(dataframe['nvc.dosregt']),
        "nvc.ongoing": dataframe['nvc.ongoing'],
        "civilwar": dataframe['civilwar']
    })


def cu_political_opportunity(dataframe):
    return pd.DataFrame({
        "log(wdi.pop)": np.log(dataframe['wdi.pop']),
        "log1p(age)": np.log1p(dataframe['age']),
        "postcoldwar": dataframe['postcoldwar'],
        "ios.iccpr1": dataframe["ios.iccpr1"],
        "nld.any.1": dataframe["nld.any.1"],
        "pitfdem": dataframe["pitfdem"],
        "I(pitfdem * nld.any.1)": dataframe["pitfdem"] * dataframe['nld.any.1'],
        "I(postcoldwar * nld.any.1)": dataframe['postcoldwar'] * dataframe['nld.any.1'],
        "as.factor(fiw.cl)": dataframe['fiw.cl'].astype(str),
        "log1p(pol.durable)": np.log1p(dataframe['pol.durable']),
        "log1p(cou.tries5)": np.log1p(dataframe['cou.tries5'])
    })


reformat_chenowith_ulfelder('TR10a_Chen_Ulf_Base', cu_base)
reformat_chenowith_ulfelder('TR10b_Chen_Ulf_Grievances', cu_grievances)
reformat_chenowith_ulfelder('TR10c_Chen_Ulf_Resource_Mobilization', cu_resource_mobilization)
reformat_chenowith_ulfelder('TR10d_Chen_Ulf_Modernization', cu_modernization)
reformat_chenowith_ulfelder('TR10e_Chen_Ulf_Political_Opportunity', cu_political_opportunity)


reformat_gelpi_avdan('TR11_Gelpi_Avdan')

reformat_gleditsch_ward(
    'TR12a_Gleditsch_Ward_Issues',
    ["pmid", "py", "py2", "py3", "terriss", "riveriss", "mariss", "terrAtt", "rivAtt", "marAtt"])
reformat_gleditsch_ward(
    'TR12b_Gleditsch_Ward_Structural',
    ["pmid", "py", "py2", "py3", "minpol", "rbal", "lnkmdist"])
reformat_gleditsch_ward(
    'TR12c_Gleditsch_Ward_Combined',
    ["pmid", "py", "py2", "py3", "terriss", "riveriss", "mariss",
     "terrAtt", "rivAtt", "marAtt", "minpol", "rbal", "lnkmdist"])


reformat_goldstone('TR13a_Goldstone_Table_1_Full', "pitf_tab1_mod1.tsv")
reformat_goldstone('TR13b_Goldstone_Table_3_Full', "pitf_tab3_allpreds.tsv")
reformat_goldstone('TR13c_Goldstone_Table_3_Fearon_Laitin', "pitf_tab3_modFL.tsv")
reformat_goldstone('TR13c_Goldstone_Table_3_PITF', "pitf_tab3_modPITF.tsv")

shutil.rmtree(data_intermediate_dir)
