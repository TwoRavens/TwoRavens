import pandas as pd
import shutil
import os
import json
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


def reformat_chenowith_ulfelder():
    predictors = ["year", "country", "sftgcode", "yrborn", "yrdied", "reg.eap", "reg.afr",
                  "reg.eur", "reg.mna", "reg.sca", "reg.amr", "dosreg", "nvc.start", "nvc.ongoing",
                  "nvc.end", "elceleth", "bnk.assntns", "bnk.strikes", "bnk.guerwar", "bnk.govcrises",
                  "bnk.purges", "bnk.riots", "bnk.revs", "bnk.agdems", "bnk.coups", "bnk.conchgs",
                  "bnn.yroff", "cnsimr", "dispota4", "xxxcimr", "bnk.papers", "ythbul", "ythbul2",
                  "ythbul3", "ythbul4", "mev.ind", "mev.intind", "mev.intviol", "mev.intwar",
                  "mev.civviol", "mev.civwar", "mev.ethviol", "mev.ethwar", "mev.inttot", "mev.civtot",
                  "mev.actotal", "mev.nborder", "mev.region", "mev.nregion", "mev.afrreg", "mev.regcon",
                  "mev.muslim", "cmm.succ", "cmm.fail", "cmm.plot", "cmm.rumr", "pol.democ", "pol.autoc",
                  "pol.polity", "pol.polity2", "pol.durable", "pol.xrreg", "pol.xrcomp", "pol.xropen",
                  "pol.xconst", "pol.parreg", "pol.parcomp", "pol.exrec", "pol.exconst", "pol.polcomp",
                  "fiw.pr", "fiw.cl", "fiw.status", "wdi.trade", "wdi.gdppcppp", "wdi.gdppc", "wdi.gdpchg",
                  "wdi.inflat", "wdi.cpi", "wdi.agric", "wdi.manuf", "wdi.indus", "wdi.servs", "wdi.pop",
                  "wdi.popurb", "wdi.armed", "wdi.armpct", "wdi.forest", "wdi.mineral", "wdi.energy", "wdi.sch2",
                  "wdi.sch2f", "wdi.sch2m", "wdi.litf", "wdi.litm", "wdi.littot", "wdi.litpar", "wdi.mobp100",
                  "wdi.webusers", "wdi.webp100", "wdi.pop0014t", "wdi.pop1519f", "wdi.pop1519m", "wdi.pop2024f",
                  "wdi.pop2024m", "wdi.imrate", "ccode", "ios.eu", "ios.nato", "ios.natopfp", "ios.osce",
                  "ios.oecd", "ios.coe", "ios.comnw", "ios.franc", "ios.geneva", "ios.gattwto", "ios.apec",
                  "ios.asean", "ios.seato", "ios.oas", "ios.mercosur", "ios.opec", "ios.arablg", "ios.oau",
                  "ios.ecowas", "ios.iccpr", "ios.iccpr1", "ios.achr", "ios.achpr", "ios.icj", "ios.oic",
                  "nld.exec", "nld.leg", "nld.ca", "nld.any", "cir.physint", "cir.disap", "cir.kill", "cir.polpris",
                  "cir.tort", "cir.newempinx", "cir.assn", "cir.formov", "cir.dommov", "cir.speech", "cir.elecsd",
                  "cir.newrelfre", "cir.worker", "cir.wecon", "cir.wopol", "cir.wosoc", "cir.injud", "kill",
                  "pit.reg.magfail", "pit.reg.magcol", "pit.reg.magviol", "pit.reg.magave", "pit.reg.ongoing",
                  "pit.reg.onset", "pit.reg.end", "pit.reg.dur", "pit.rev.magfight", "pit.rev.magfatal",
                  "pit.rev.magarea", "pit.rev.magave", "pit.rev.ongoing", "pit.rev.onset", "pit.rev.end",
                  "pit.rev.dur", "pit.eth.magfight", "pit.eth.magfatal", "pit.eth.magarea", "pit.eth.magave",
                  "pit.eth.ongoing", "pit.eth.onset", "pit.eth.end", "pit.eth.dur", "pit.gen.deathmag",
                  "pit.gen.ongoing", "pit.gen.onset", "pit.gen.end", "pit.gen.dur", "nvc.dosregt", "elceleth.c",
                  "dispota4.c", "cir.femrights", "cir.femrights.c", "traderes", "traderes.c", "bnk.unrest",
                  "cir.speech.c", "postcoldwar", "civilwar", "wdi.gdpchg.s", "fiw.pr.chg", "fiw.cl.chg", "cou.tries5",
                  "pitfdem", "wdi.sch2.mi", "wdi.manuf.mi", "wdi.servs.mi", "wdi.popurb.mi", "wdi.pop.mi",
                  "nld.any.1", "age", "predyr"]
    targets = ['nvc.start.1']

    dataframe_train = pd.read_csv(
        os.path.join(data_input_dir, 'ChenowethUlfelder/cu_fig2_train.tsv'), delimiter='\t')
    dataframe_test = pd.read_csv(
        os.path.join(data_input_dir, 'ChenowethUlfelder/cu_fig2_test.tsv'), delimiter='\t')

    dataframe = pd.concat([dataframe_train, dataframe_test])

    # drop other columns
    dataframe = dataframe[predictors + targets]

    # build intermediate data file
    intermediate_data_path = os.path.join(data_intermediate_dir, 'chenowith_ulfelder', 'learningData.csv')
    os.makedirs(os.path.dirname(intermediate_data_path), exist_ok=True)
    dataframe.to_csv(intermediate_data_path, index=False)

    dataset_name = 'TR10_Chenowith_Ulfelder'

    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[intermediate_data_path],
        about={
            'datasetName': dataset_name,
        },
        problem={
            'targets': targets,
            'predictors': predictors,
            'time': ['year']
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


def reformat_gelpi_avdan():
    predictors = ["polity2b", "polity2borigin", "loggdptarget", "logpop", "majpowhome", "majpoworigin", "coloniallink", "ethnictie", "ethnicPCW", "ethnicany911", "dyadalliance", "dyadalliancePCW", "rivalrydummy", "postCW", "post911", "lndyaddist", "dyadpcyear1", "dyadpcyear2", "dyadpcyear3", "dyadpcyear4"]
    targets = ['incident']

    dataframe = pd.read_csv(
        os.path.join(data_input_dir, 'GelpiAvdan2018/ga_TA2.tsv'), delimiter='\t')

    dataframe = dataframe[predictors + targets]

    # build intermediate data file
    intermediate_data_path = os.path.join(data_intermediate_dir, 'gelpi_avdan', 'learningData.csv')
    os.makedirs(os.path.dirname(intermediate_data_path), exist_ok=True)
    dataframe.to_csv(intermediate_data_path, index=False)

    dataset_name = 'TR11_Gelpi_Avdan'

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
        }
    )

    # load custom out-of-sample splits into TwoRavens/d3m
    dataframe_splits = pd.DataFrame({
        'd3mIndex': range(len(dataframe)),
        'type': ['TRAIN' if year > 32 else 'TEST' for year in dataframe.dyadpcyear1],
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


def reformat_gleditsch_ward(predictors):
    targets = ['mido']

    dataframe_train = pd.read_csv(
        os.path.join(data_input_dir, 'GleditschWard2013/gw_tab1.tsv'), delimiter='\t')
    dataframe_test = pd.read_csv(
        os.path.join(data_input_dir, 'GleditschWard2013/gw_tab1_test.tsv'), delimiter='\t')

    dataframe = pd.concat([dataframe_train, dataframe_test])

    dataframe = dataframe[predictors + targets]

    # build intermediate data file
    intermediate_data_path = os.path.join(data_intermediate_dir, 'gleditsch_ward', 'learningData.csv')
    os.makedirs(os.path.dirname(intermediate_data_path), exist_ok=True)
    dataframe.to_csv(intermediate_data_path, index=False)

    dataset_name = 'TR12_Gleditsch_Ward'

    d3m_wrap_dataset(
        data_output_dir,
        dataPaths=[intermediate_data_path],
        about={
            'datasetName': dataset_name,
        },
        problem={
            'targets': targets,
            'predictors': predictors
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


def reformat_goldstone():
    predictors = ["year", "byregn2", "group", "sftgname", "feanctig", "sftptv2a", "sftpcons",
                  "ethherf", "relhrel", "disp4cat", "sftpdur2", "floil", "maccat",
                  "logim", "logtpop", "logmtn", "anocracy", "democracy", "log_gdpc", "miss_ind",
                  "glb_ind", "cwar_ind", "reg_ind", "sample", "sftptv2a1", "sftptv2a2", "sftptv2a3",
                  "sftptv2a4", "sftptv2a5", "sftptv2a6", "byregn2_1", "byregn2_2", "byregn2_3", "byregn2_4",
                  "byregn2_5", "stratida", "stratidb", "stratidc"]
    targets = ['sftpcons']

    dataframe = pd.read_csv(
        os.path.join(data_input_dir, 'GoldstoneEtAl2013/pitf_tab1_mod1.tsv'), delimiter='\t')

    # build intermediate data file
    intermediate_data_path = os.path.join(data_intermediate_dir, 'goldstone', 'learningData.csv')
    os.makedirs(os.path.dirname(intermediate_data_path), exist_ok=True)
    dataframe.to_csv(intermediate_data_path, index=False)

    dataset_name = 'TR13_Goldstone'

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
        }
    )


gw_issues_predictors = ["pmid", "py", "py2", "py3", "terriss", "riveriss", "mariss",
                        "terrAtt", "rivAtt", "marAtt"]
gw_combined_predictors = ["pmid", "py", "py2", "py3", "terriss", "riveriss", "mariss",
                          "terrAtt", "rivAtt", "marAtt", "minpol", "rbal", "lnkmdist"]
gw_structural_predictors = ["pmid", "py", "py2", "py3", "minpol", "rbal", "lnkmdist"]

reformat_gelpi_avdan()
reformat_chenowith_ulfelder()
reformat_gleditsch_ward(gw_issues_predictors)
reformat_goldstone()

shutil.rmtree(data_intermediate_dir)
