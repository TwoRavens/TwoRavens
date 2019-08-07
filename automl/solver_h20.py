import h2o
from h2o.automl import H2OAutoML


def solve_h20(specification):

    # ensure solver is running
    h2o.init()

    train = h2o.import_file(specification['search']['dataset_path'])

    x = specification['search']['problem']['predictors']
    y = specification['search']['problem']['target']

    if specification['search']['problem']['task'] in ['classification', 'semisupervisedClassification']:
        # For binary classification, response should be a factor
        train[y] = train[y].asfactor()

    # Run AutoML for 20 base models (limited to 1 hour max runtime by default)
    aml = H2OAutoML(
        max_models=20,
        seed=1
    )

    aml.train(
        x=x, y=y,
        training_frame=train)

    test = h2o.import_file("https://s3.amazonaws.com/erin-data/higgs/higgs_test_5k.csv")
