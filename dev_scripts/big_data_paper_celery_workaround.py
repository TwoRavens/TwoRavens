from autosklearn.classification import AutoSklearnClassifier
import pandas as pd
from sklearn.metrics import accuracy_score, roc_auc_score


# Goldstone
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

predictions = None
pred_raw = None


def preprocess(dataframe, specification):

    X = specification['problem']['predictors']
    y = specification['problem']['targets'][0]

    categorical_features = [i for i in specification['problem']['categorical'] if i != y and i in X]

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='missing')),
        ('onehot', OneHotEncoder(handle_unknown='ignore'))
    ])

    numerical_features = [i for i in X if i not in categorical_features]
    numerical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    preprocessor = ColumnTransformer(transformers=[
        ('numeric', numerical_transformer, numerical_features),
        ('categorical', categorical_transformer, categorical_features)
    ])

    stimulus = dataframe[X]
    stimulus = preprocessor.fit_transform(stimulus)

    return stimulus, preprocessor


def goldstone_autosklearn():

    all_df = pd.read_csv('/home/shoe/automl_scores/TR13a_Goldstone_Table_1_Full_problem_TRAIN/13-11-2019 01:54:44/splits/all.csv')

    X = [
        "sftptv2a3",
        "sftptv2a4",
        "sftptv2a5",
        "sftptv2a2",
        "sftptv2a6",
        "logim",
        "maccat",
        "disp4cat",
        "stratidc"
    ]

    y = 'sftpcons'
    automl = AutoSklearnClassifier(time_left_for_this_task=60*5)

    stimulus, preprocessor = preprocess(all_df, {'problem': {
        "predictors": X,
        'targets': [y],
        'categorical': []
    }})
    automl.fit(stimulus, all_df[y])

    stimulus_all = preprocessor.transform(all_df)
    automl.refit(stimulus_all, all_df[y])

    print(accuracy_score(all_df[y], automl.predict(stimulus_all)))


def gelpi_avdan_autosklearn():

    train_df = pd.read_csv('/home/shoe/automl_scores/TR11_Gelpi_Avdan_problem_TRAIN/11-11-2019 01:56:40/splits/train.csv')
    test_df = pd.read_csv('/home/shoe/automl_scores/TR11_Gelpi_Avdan_problem_TRAIN/11-11-2019 01:56:40/splits/test.csv')

    X = [
        "polity2b",
        "polity2borigin",
        "loggdptarget",
        "logpop",
        "majpowhome",
        "majpoworigin",
        "coloniallink",
        "ethnictie",
        "ethnicPCW",
        "ethnicany911",
        "dyadalliance",
        "dyadalliancePCW",
        "rivalrydummy",
        "postCW",
        "post911",
        "lndyaddist",
        "dyadpcyear1",
        "dyadpcyear2",
        "dyadpcyear3",
        "dyadpcyear4",
        "year"
    ]

    y = 'incident'
    automl = AutoSklearnClassifier(time_left_for_this_task=60*10)

    stimulus, preprocessor = preprocess(train_df, {'problem': {
        "predictors": X,
        'targets': [y],
        'categorical': []
    }})
    automl.fit(stimulus, train_df[y])
    automl.refit(stimulus, train_df[y])

    stimulus_test = preprocessor.transform(test_df)

    global predictions
    predictions = automl.predict_proba(stimulus_test)

    global pred_raw
    pred_raw = automl.predict(stimulus_test)

    print(predictions)
    print(roc_auc_score(test_df[y], predictions[:, 1]))


def gleditsch_ward_autosklearn():

    train_df = pd.read_csv('/home/shoe/automl_scores/TR12c_Gleditsch_Ward_Combined_problem_TRAIN/13-11-2019 01:16:06/splits/train.csv')
    test_df = pd.read_csv('/home/shoe/automl_scores/TR12c_Gleditsch_Ward_Combined_problem_TRAIN/13-11-2019 01:16:06/splits/test.csv')

    X = [
        "pmid",
        "py",
        "py2",
        "py3",
        "terriss",
        "riveriss",
        "mariss",
        "terrAtt",
        "rivAtt",
        "marAtt",
        "minpol",
        "rbal",
        "lnkmdist"
    ]

    y = 'mido'
    automl = AutoSklearnClassifier(time_left_for_this_task=60*5)

    stimulus, preprocessor = preprocess(train_df, {'problem': {
        "predictors": X,
        'targets': [y],
        'categorical': []
    }})
    automl.fit(stimulus, train_df[y])
    automl.refit(stimulus, train_df[y])

    stimulus_test = preprocessor.transform(test_df)

    global predictions
    predictions = automl.predict_proba(stimulus_test)

    global pred_raw
    pred_raw = automl.predict(stimulus_test)

    print(predictions)
    print(roc_auc_score(test_df[y], predictions[:, 1]))

gleditsch_ward_autosklearn()