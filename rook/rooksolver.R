##
##  rooksolver.r
##  uses caret. Current limitations:
##  1. caret doesn't support a multivariate response. Each target is fit as a univariate model
##  2. caret doesn't support partial results under a timeout. Timeouts are returned empty
##

production <- FALSE
timeout <- 20 # maximum time to spend on a univariate fit

# limit on number of fitted values to return to frontend
observationLimit <- 10

# parallelize grid search
allowParallel=TRUE
if (allowParallel) {
  library(parallel)
  library(doParallel)
  cluster <- makeCluster(detectCores() - 1)
  registerDoParallel(cluster)
}

# POST specification
# {
#     dataurl: 'path to url',
#     problem: {
#         predictors: ['pred1', 'pred2', ...],
#         targets: ['targ'],
#         weights: *optional column name of observation weights*,
#
#         task: 'regression' or 'classification',
#     },
#     models: *one of keys of methodList variable, like 'linear' or 'poisson'*,
#     methods: *if specified, overrides task and model, passed directly into caret*,
#     hyperparameters: [{named arguments to the relevant R library function, like 'family' or 'k'}], # must be of same length as models or methods
#     crossValidation: 'cv' or 'timeslice',
#     metric: "RMSE" and "Rsquared" for regression and "Accuracy" and "Kappa" for classification
# }

solver.app <- function(env) {

  print(paste("--- solver.app ---", sep = ""))

  if (production) sink(file = stderr(), type = "output")

  solaJSON <- Request$new(env)$POST()$solaJSON
  if (!jsonlite::validate(solaJSON))
    return(list(error = "POST request is not valid json. Check for special characters."))

  send(solver(jsonlite::fromJSON(solaJSON)))
}


send <- function(res) {
  res <- jsonlite:::toJSON(res)
  if (production) sink()

  response <- Response$new(headers = list(`Access-Control-Allow-Origin` = "*"))
  response$write(res)
  response$finish()
}

error <- function(message) list(error=jsonlite::unbox(message))

analyzeWrapper <- function(wrapper, hyperparameters, samples) list(
  fittedValues=fitted(wrapper)[samples],
  gridResults=wrapper$results, # fit statistics for each point in a grid over all free hyperparameters
  bestResult=wrapper$bestTune,
  hyperparameters=c(hyperparameters, wrapper$bestTune), # combine user hyperparams with the discovered hyperparams
  sortingMetric=jsonlite::unbox(wrapper$metric), # best hyperparameters were selected by this metric (all metrics still returned)
  # times=wrapper$times, # elapsed time for grid search, and for training final model
  predictorTypes=wrapper$terms # types for each term. Useful for verifying types used in fit model
)

analyzeGLM <- function(model, samples) list(
  coefficients=coef(model),
  statistics=broom::glance(model),
  coefficientCovarianceMatrix=vcov(model),
  anova=anova(model),
  vif=if(length(coef(model)) > 1) as.list(car::vif(model)) else NULL
  # This is where some outlier detection could be conducted. Return points that are outliers
  # cooksDistance=cooks.distance(model)[samples],
  # hatDiagonals=influence(model)$hat[samples]
)

methodList <- list(
  linear='lm',
  poisson='glm',
  binomial='glm',
  logistic='glm',
  gamma='glm',
  exponential='glm',
  `negative binomial`='glm.nb',
  `decision tree`='rpart',
  `random forest`='ranger'
)

# add family hyperparameter for glm models
familyList <- list(
  poisson='poisson',
  binomial='binomial',
  logistic='binomial',
  gamma='gamma',
  exponential='gamma'
)

metrics <- list(
  classification=c('Accuracy', 'Kappa'),
  regression=c('RMSE', 'Rsquared')
)

#  to check if the variable is binary
isBinary <- function(v) {
  x <- unique(v)
  length(x) - sum(is.na(x)) == 2L
}

solver <- function(everything) {

  if (is.null(everything[['dataset_path']]))
    return(error("'dataset_path' is null"))
  datasetPath <- everything[['dataset_path']]

  if (is.null(everything[['problem']]))
    return(error("'problem' is null"))
  problem <- everything[['problem']]

  if (is.null(problem[['predictors']])) return(error("No defined predictors."))
  if (is.null(problem[['targets']])) return(error("No defined targets."))
  if (is.null(problem[['task']])) return(error("No defined task."))

  if (is.null(problem[['metric']]) || !(problem[['metric']] %in% metrics[[problem[['task']]]]))
    problem[['metric']] <- metrics[[problem[['task']]]][[1]]

  hyperparameters <- list()
  if (!is.null(everything[['hyperparameters']])) {
    # if (!jsonlite::validate(everything[['hyperparameters']]))
    #   return(error("'hyperparameters' is not valid json."))

    hyperparameters <- jsonlite::toJSON(everything[['hyperparameters']])
  }
  if (length(hyperparameters) == 0L) hyperparameters <- list(list())

  crossValidation <- ifelse(is.null(everything[['crossValidation']]), 'cv', everything[['crossValidation']])

  if (!(crossValidation %in% c('cv', 'timeslice')))
    return(list(error = paste0('Invalid crossValidation "', crossValidation, '"')))
  
  # load data
  data <- tryCatch({
    # TODO: use library for loading data, don't rely on extension
    separator <- if (endsWith(datasetPath, 'csv'))',' else '\t'
    # print(paste("LOAD: separator", separator))

    data <- read.table(datasetPath, sep = separator, header = TRUE, fileEncoding = 'UTF-8')
    # print('LOAD: head')
    # print(head(data))

    # assigning as factor causes caret to treat as classification
    if (problem[['task']] == 'classification')
      data[problem[['targets']]] <- lapply(data[problem[['targets']]], as.factor)
    na.omit(data, cols=problem[['predictors']])
    data
  }, error=function(msg) error(paste0("R solver failed loading data (", msg, ")")))
  if (names(data) == c("error")) return(data)

  # use same samples for every target
  n <- length(rownames(data))
  samples <- if (n < observationLimit) 1:n else sort(sample(1:n, observationLimit))
  # if sample d3mIndex indices are provided, overwrite data sample indices
  if (everything[['samples']])
    samples <- which(data[,'d3mIndex'] %in% everything[['samples']])

  methods <- everything[['method']]
  if (is.null(methods)) {
    model <- everything[['model']]

    # infer a default model (based on the nature of the first target)
    if (is.null(model) || model == 'modelUndefined') {
      if (is.null(problem[['task']]) || problem[['task']] == 'regression') model <- 'linear'
      if (problem[['task']] == 'classification')
        model <- if (isBinary(data[,problem[['targets']][[1]]])) 'logistic' else 'qda'
    }

    # map user model to caret method
    methods <- if (model %in% names(methodList)) methodList[[model]] else model

    # add glm family if using glm and hyperparameter if not set
    if (methods == 'glm' && is.null(hyperparameters[['family']])) hyperparameters[['family']] <- familyList[[model]]
  }

  solver.univariate <- function(target, method, hyperparam) {

    # fit model
    caretWrapper <- tryCatch(
      do.call(caret::train, c(list(
        data[,problem[['predictors']], drop=FALSE], # if only one predictor, disable drop, so indexing doesn't behave differently
        data[,target],
        method=method,
        trControl=caret::trainControl(
          method=crossValidation,
          number=10,
          search="random",
          allowParallel=allowParallel
        ),
        tuneLength=10 # maximum number of points to check on the hyperparameter grid
        # na.action=na.omit # listwise deletion of rows
        # weights=problem[['weights']],
        # metric=problem[['metric']]
      ))),
      error=function(err) error(paste0("R solver failed fitting model (", err, ")")))
    if (names(caretWrapper) == c("error")) return(caretWrapper)
    
    # analyze model
    analysis <- tryCatch({

      analysis <- analyzeWrapper(caretWrapper, hyperparameters, samples)
      # analysis$trainvalues <- data[samples, problem[['predictors']]

      # supplemental information for linear models
      if (method %in% c('lm', 'glm', 'glm.nb'))
        analysis <- c(analysis, analyzeGLM(caretWrapper$finalModel, samples))

      # percentual average cell counts across resamples
      if (caretWrapper$modelType == 'Classification') {
        confMatrix <- caret::confusionMatrix(caretWrapper)
        analysis$confusionMatrix <- as.data.frame(confMatrix$table)
        analysis$performance <- confMatrix$overall
      }

      analysis
    }, error=function(err) error(paste0("R solver failed analyzing fitted model (", err, ")")))

    analysis
  }
  
  names(methods) <- sapply(methods, function(method) caret::getModelInfo()[[method]]$label)
  
  results <- mapply(function(method, hyperparams) {
    
    # exit if package is not installed, to prevent thread block on caret's user prompt to install package
    methodInfo <- caret::getModelInfo()[[method]]
    if (is.null(methodInfo)) return(error(paste0("'", method, "' is not a valid method.")))
    for (package in methodInfo$library) {
      if (inherits(try(library(package, character.only = TRUE)), 'try-error'))
        return(error(paste0("Dependency '", package, "' is not installed for caret method '", methods, "'. Please contact us to add the dependency.")))
    }
  
    list(
      models=sapply(problem[['targets']], function(target) {
        R.utils::withTimeout(solver.univariate(target, method, hyperparams), timeout=timeout)
      }, simplify = FALSE, USE.NAMES = TRUE),
      meta=list(
        label=jsonlite::unbox(methodInfo$label), # plain english model label
        method=jsonlite::unbox(method), # caret library method
        task=jsonlite::unbox(problem[['task']]),
        library=methodInfo$library, # R library used
        tags=methodInfo$tags,
        actualValues=if (!is.na(everything[['samples']])) data[samples,problem[['targets']]]
      )
    )
  }, methods, hyperparameters, SIMPLIFY=FALSE)

  # fit a univariate model to each of the dependent variables
  list(
    results=results,
    problem=problem,
    source='rook'
  )
}

# wrapper <- solver(list(
#   dataset_path='/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
#   problem=list(
#     targets=c("Hall_of_Fame"),
#     predictors=c(
#       "Number_seasons", "Games_played", "At_bats", "Runs", "Hits", "Doubles",
#       "Triples", "Home_runs", "RBIs", "Walks", "Strikeouts", "Batting_average",
#       "On_base_pct", "Slugging_pct", "Fielding_ave", "Position"),
#     task="classification"),
#   method=c("rpart"),
#   samples=c(2, 5)
# ))

# wrapper$results$CART$models$Hall_of_Fame$gridResults


# jsonlite::toJSON(wrapper)

# basic regression
# jsonlite::toJSON(solver(list(
#   dataset_path='/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
#   problem='{"targets": ["Doubles", "RBIs"], "predictors": ["At_bats", "Triples"], "task": "regression"}',
#   method="lm"
# )))

# should error with a friendly prompt to install the package
# jsonlite::toJSON(solver(list(
#   dataset_path='/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
#   problem='{"targets": ["Hall_of_Fame", "Position"], "predictors": ["Doubles"], "task": "classification"}',
#   method="ordinalNet"
# )))
