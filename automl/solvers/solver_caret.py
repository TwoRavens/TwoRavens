
from automl.base import Search, Dataset, Model, R_SERVICE
import requests

model_space_default = {
    'regression': [
        {"method": 'lm'},  # old faithful
        {"method": 'pcr'},  # principal components regression
        {"method": 'glmnet'},  # lasso/ridge
        {"method": 'rpart'},  # regression tree
        {"method": 'knn'},  # k nearest neighbors
        {"method": 'earth'},  # regression splines
        {"method": 'svmLinear'}  # linear support vector regression
    ],
    "classification": [
        {"method": 'glm', "hyperparameters": {"family": 'binomial'}},
        {"method": 'glmnet', "hyperparameters": {"family": 'binomial'}},
        {"method": 'lda'},  # linear discriminant analysis
        {"method": 'qda'},  # quadratic discriminant analysis
        {"method": 'rpart'},  # decision tree
        {"method": 'svmLinear'},  # support vector machine
        {"method": 'naive_bayes'},
        {"method": 'knn'}
    ]
}


class SearchCaret(Search):

    async def run(self):

        for method_spec in self.system_params.get('model_space', model_space_default):

            response = requests.post(R_SERVICE + 'caret.app', json={
                'specification': self.specification,
                'system_params': {'method_spec': method_spec}}).json()

        if not response['success']:
            raise ValueError(response['message'])

        for model_spec in response['data']['model']:
            ModelCaret(model_spec)


class ModelCaret(Model):
    def __init__(self, model, model_id=None, search_id=None):
        super().__init__(model, 'caret', model_id, search_id)

    def describe(self):
        # TODO: improve model description
        return {
            "description": str(self.model),
            "model_id": self.model_id
        }

    def score(self, specification):
        response = requests.post(
            R_SERVICE + 'caretProduce.app',
            json={'specification': specification}).json()

        if not response['success']:
            raise ValueError(response['message'])
        data = Dataset(specification['input']).get_dataframe()
        predicted = Dataset(response['data']).get_dataframe()

        scores = []
        for metric in specification['performanceMetrics']:
            for target in predicted.columns:
                try:
                    scores.append({
                        'value': Model._score(metric, data[target], predicted[target]),
                        'metric': metric,
                        'target': target
                    })
                except NotImplementedError:
                    pass

        return scores

    def produce(self, specification):
        response = requests.post(
            R_SERVICE + 'caretProduce.app',
            json={'specification': specification}).json()

        if not response['success']:
            raise ValueError(response['message'])

        return response['data']

    def save(self):
        # ignore, model is only present in remote caret.app
        raise ValueError('Caret model is not saveable in Python.')

