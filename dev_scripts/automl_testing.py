data_path = 'file:///home/shoe/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv'
#
# import h2o
# from h2o.automl import H2OAutoML
#
# h2o.init()
#
# data = h2o.import_file(data_path)
#
# data['TWORAVENS_FOLD_COLUMN'] = data.kfold_column(n_folds=4)
# automl = H2OAutoML(
#     max_runtime_secs=30,
#     keep_cross_validation_predictions=True,
#     keep_cross_validation_fold_assignment=True)
#
# automl.train(y="Hall_of_Fame", x=['At_bats', 'Runs'], training_frame=data, fold_column='TWORAVENS_FOLD_COLUMN')
#
# best_model = h2o.get_model(automl.leaderboard.as_data_frame()['model_id'][0])
#
# print(best_model.cross_validation_fold_assignment())
#

from supervised.automl import AutoML
import pandas as pd

dataframe = pd.read_csv(data_path)
dataframe = dataframe[dataframe['Hall_of_Fame'] != 2]

automl_mljar = AutoML(total_time_limit=30)
automl_mljar.fit(dataframe[['Runs', 'At_bats']], dataframe['Hall_of_Fame'])

mljar_model = automl_mljar._models[0]

mljar_model.train({"train": {"X": dataframe[['Runs', 'At_bats']], "y": dataframe['Hall_of_Fame']}})
mljar_model.predict(dataframe[['Runs', 'At_bats']])


# import mlbox.model.classification
# import mlbox.model.regression
#
#
# automl = mlbox.model.classification.Classifier()
#
# automl.fit(dataframe[['Runs', 'At_bats']], dataframe['Hall_of_Fame'])
