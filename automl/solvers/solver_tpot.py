import tpot

from automl.base import Dataset, Search, ModelSklearn


class SearchTPOT(Search):

    async def run(self):
        dataset = Dataset(self.specification['input'])

        dataframe = dataset.get_dataframe()
        X = dataframe[self.specification['problem']['predictors']]
        y = dataframe[self.specification['problem']['targets'][0]]

        automl = {
            'regression': tpot.TPOTRegressor,
            'classification': tpot.TPOTClassifier
        }[self.specification['problem']['taskType']](**self.system_params)

        automl.fit(X, y)

        # selected models along the cost-complexity vs accuracy frontier
        for model_str in automl.pareto_front_fitted_pipelines_:
            model = ModelSklearn(automl.pareto_front_fitted_pipelines_[model_str], system='tpot', search_id=self.search_id)
            model.save()
            self.callback_found(model)
