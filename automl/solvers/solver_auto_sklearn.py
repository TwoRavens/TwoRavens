import autosklearn.classification
import autosklearn.regression

from automl.base import Search, ModelSklearn, Dataset


class SearchAutoSklearn(Search):

    async def run(self):
        dataset = Dataset(self.specification['input'])
        dataframe = dataset.get_dataframe()

        x = dataframe[self.specification['problem']['predictors']]
        y = dataframe[self.specification['problem']['targets'][0]]

        #
        # if os.path.exists(tmp_folder):
        #     shutil.rmtree(tmp_folder)
        # if os.path.exists(output_folder):
        #     shutil.rmtree(output_folder)

        if 'configuration' in self.specification:
            config = self.specification['configuration']

            self.system_params['resampling_strategy_arguments'] = self.system_params.get('resampling_strategy_arguments', {})
            self.system_params['resampling_strategy_arguments']['shuffle'] = config.get('shuffle', False)

            if config['method'] == "HOLDOUT":
                self.system_params['resampling_strategy'] = 'holdout'
                self.system_params['resampling_strategy_arguments']['train_size'] = config.get('trainTestRatio') or .6

            if config['method'] == "K_FOLD":
                self.system_params['resampling_strategy'] = 'cv'
                self.system_params['resampling_strategy_arguments']['folds'] = config.get('folds') or 10

        automl = {
            'regression': autosklearn.regression.AutoSklearnRegressor,
            'classification': autosklearn.classification.AutoSklearnClassifier
        }[self.specification['problem']['taskType']](**self.system_params)

        automl.fit(dataframe[x], dataframe[y], dataset_name=dataset.get_name())

        model = ModelSklearn(automl, system='auto_sklearn', search_id=self.search_id)
        model.save()

        self.callback_found(model)
