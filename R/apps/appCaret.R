##
##  uses caret. Current limitations:
##  1. caret doesn't support a multivariate response. Each target is fit as a univariate model
##  2. caret doesn't support partial results under a timeout. Timeouts are returned empty
##

# parallelize grid search
allowParallel=FALSE
if (allowParallel) {
  library(parallel)
  library(doParallel)
  cluster <- makeCluster(detectCores() - 1)
  registerDoParallel(cluster)
}

RECEIVE_DESCRIBE_MSG <- 'receive_describe_msg'
RECEIVE_SCORE_MSG <- 'receive_score_msg'
RECEIVE_PRODUCE_MSG <- 'receive_produce_msg'
RECEIVE_ERROR_MSG <- 'receive_error_msg'

sendError <- function(message, websocketId) httr::POST(
  RECEIVE_ENDPOINT,
  encode='json',
  body=list(
    success=jsonlite::unbox(FALSE),
    msg_type=jsonlite::unbox(RECEIVE_ERROR_MSG),
    websocket_id=jsonlite::unbox(websocketId),
    message=jsonlite::unbox(message)
  )
)

# wrap relevant parts of return json with unboxes
castBody <- function(body) {
  if (!is.null(body[['success']])) body[['success']] <- jsonlite::unbox(body[['success']])
  if (!is.null(body[['message']])) body[['message']] <- jsonlite::unbox(body[['message']])
  if (!is.null(body[['msg_type']])) body[['msg_type']] <- jsonlite::unbox(body[['msg_type']])
  if (!is.null(body[['websocket_id']])) body[['websocket_id']] <- jsonlite::unbox(body[['websocket_id']])
  return(body)
}

defaultModelSpace = list(
  REGRESSION= list(
    list(method='lm'),  # old faithful
    list(method='pcr'),  # principal components regression
    list(method='glmnet'),  # lasso/ridge
    list(method='rpart'),  # regression tree
    list(method='knn'),  # k nearest neighbors
    list(method='earth'),  # regression splines
    list(method='svmLinear')  # linear support vector regression
  ),
  CLASSIFICATION=list(
    list(method='glm', hyperparameters=list(family='binomial')),
    list(method='glmnet', hyperparameters=list(family='binomial')),
    list(method='lda'),  # linear discriminant analysis
    list(method='qda'),  # quadratic discriminant analysis
    list(method='rpart'),  # decision tree
    list(method='svmLinear'),  # support vector machine
    list(method='naive_bayes'),
    list(method='knn')
  )
)

caretSearch <- function(specification, systemParams, callbackFound, searchId=NULL) {
  if (is.null(searchId)) searchId <- uuid::UUIDgenerate()

  metrics <- list(
    CLASSIFICATION=c('ACCURACY', 'F1'),
    REGRESSION=c('ROOT_MEAN_SQUARED_ERROR', 'R_SQUARED')
  )

  # PROBLEM
  if (is.null(specification[['problem']]))
    return(list(success=FALSE, message="'problem' is null"))
  problem <- specification[['problem']]

  if (is.null(problem[['predictors']])) return(list(success=FALSE, message="No defined predictors."))
  if (is.null(problem[['targets']])) return(list(success=FALSE, message="No defined targets."))
  if (is.null(problem[['taskType']])) return(list(success=FALSE, message="No defined task."))

  # TRAIN CONFIGURATION
  trControlParams <- list(method='cv',number=10,search="random",allowParallel=allowParallel)

  configuration <- specification[['configuration']]
  if (!is.null(configuration)) {

    # set trainControl method if specified in configuration
    if (!is.null(configuration[['method']])) {
      trControlParams[['method']] <- list(K_FOLD='cv', HOLDOUT='LGOCV')[[configuration[['method']]]]
    }

    # set additional metadata for K_FOLD cv
    if (all(configuration[['method']] == 'K_FOLD')) {
      if (!is.null(configuration[['folds']])) {
        trControlParams[['number']] <- configuration[['folds']]
      }
    }

    # set additional metadata to emulate holdout via leave-group-out control params
    if (all(configuration[['method']] == 'HOLDOUT')) {
      if (!is.null(configuration[['trainTestRatio']])) {
        trControlParams[['p']] <- configuration[['trainTestRatio']]
      }
      trControlParams[['number']] <- 1
    }

    # upsample if stratified sampling enabled
    if (!is.null(configuration[['stratified']]) && configuration[['stratified']]) {
      # resampling doesn't apply to REGRESSION
      if (problem[['taskType']] == 'CLASSIFICATION') trControlParams[['sampling']] <- 'up'
    }
  }

  performanceMetric <- specification[['performanceMetric']]
  if (is.null(performanceMetric) || !(performanceMetric[['metric']] %in% metrics[[problem[['taskType']]]]))
    performanceMetric <- list(metric=metrics[[problem[['taskType']]]][[1]])

  metricUtility <- getMetricUtility(performanceMetric)
  if (is.null(metricUtility))
    return(list(success=FALSE, message=paste('Performance metric not found:', performanceMetric[['metric']])))

  trControlParams[['summaryFunction']] <- metricUtility[['summaryFunction']]
  trControlParams[['classProbs']] <- metricUtility[['classProbs']]

  if (!is.null(systemParams[['trControlParams']])) trControlParams <- c(trControlParams, systemParams[['trControlParams']])

  # DATA
  dataWrap <- loadData(specification)
  if (!dataWrap[['success']]) return(dataWrap)
  data <- dataWrap[['data']]

  # FIT
  solver.univariate <- function(target, method, hyperparameters=NULL) tryCatch({

    # HYPERPARAMETERS
    if (is.null(hyperparameters)) hyperparameters <- list()
    # edge case to prevent hyperparam bug
    if (length(hyperparameters) == 0L) hyperparameters <- list(list())
    print('predictors')
    print(problem[['predictors']])
    print('data')
    print(colnames(data))
    fitControlParams <- list(
      x=data[,problem[['predictors']], drop=FALSE], # if only one predictor, disable drop, so indexing doesn't behave differently
      y=data[,target],
      method=method
      # trControl=do.call(caret::trainControl, trControlParams)
      # tuneLength=10, # maximum number of points to check on the hyperparameter grid
      # na.action=na.omit, # listwise deletion of rows for columns used in model
      # weights=problem[['weights']],
      # metric=metricUtility[['metric']],
      # maximize=metricUtility[['maximize']]
    )

    model <- do.call(caret::train, fitControlParams) # c(fitControlParams, hyperparameters))
    return(list(success=TRUE, data=model))

  }, error=function(msg) list(success=FALSE, message=paste0("R solver failed fitting model (", msg, ")")))

  modelSpace <- systemParams[['models']]
  if (is.null(modelSpace)) modelSpace <- defaultModelSpace[[problem[['taskType']]]]

  for (systemModelSpec in modelSpace) {

    hyperparameters <- systemModelSpec[['hyperparameters']]
    if (is.null(hyperparameters)) hyperparameters <- list()

    method <- systemModelSpec[['method']]
    if (is.null(method)) {
      model <- systemModelSpec[['model']]

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

      # check if the variable is binary
      isBinary <- function(v) {
        x <- unique(v)
        length(x) - sum(is.na(x)) == 2L
      }

      # infer a default model (based on the nature of the first target)
      if (is.null(model) || all(model == 'modelUndefined')) {
        if (is.null(problem[['taskType']]) || problem[['taskType']] == 'regression') model <- 'linear'
        if (problem[['taskType']] == 'classification')
        model <- if (isBinary(data[,problem[['targets']][[1]]])) 'logistic' else 'qda'
      }

      # map user model to caret method
      method <- if (model %in% names(methodList)) methodList[[model]] else model

      # add glm family if using glm and hyperparameter if not set
      if (method == 'glm' && is.null(hyperparameters[['family']])) hyperparameters[['family']] <- familyList[[model]]
    }

    # exit if package is not installed, to prevent thread block on caret's user prompt to install package
    methodInfo <- caret::getModelInfo()[[method]]
    if (is.null(methodInfo)) return(list(success=FALSE, message=paste0("'", method, "' is not a valid method.")))
    for (package in methodInfo$library) {
      if (inherits(try(library(package, character.only = TRUE)), 'try-error'))
      return(list(success=FALSE, message=paste0("Dependency '", package, "' is not installed for caret method '", method, "'. Please contact us to add the dependency.")))
    }

    # TODO: re-add timeout
    # R.utils::withTimeout(task, timeout=timeout)

    # fit univariate model for first target
    target <- problem[['targets']][[1]]

    resultWrap <- solver.univariate(target, method, problem[['hyperparameters']])
    if (!resultWrap$success) return(resultWrap)
    model <- resultWrap$data

    metadata <- list(
      search_id=searchId,
      predictors=problem[['predictors']],
      task_type=problem[['taskType']],
      targets=target,
      system='caret'
    )

    callbackFound(model, metadata)
  }

  # search is complete
  return(list(
    success=TRUE,
    data=list(search_id=searchId),
    message='search completed'
  ))
}

caretDescribe <- function(model, metadata) list(
  success=TRUE,
  data=list(
    description=model$modelInfo$label,
    model_id=metadata$model_id,
    search_id=metadata$search_id,
    method=model$method,
    library=model$modelInfo$library,
    tags=model$modelInfo$tags
  )
)


caretAnalyze <- function(model, metadata) tryCatch({

  analyzeWrapper <- function(wrapper, hyperparameters) list(
    fittedValues=fitted(wrapper),
    gridResults=wrapper$results, # fit statistics for each point in a grid over all free hyperparameters
    bestResult=wrapper$bestTune,
    hyperparameters=c(hyperparameters, wrapper$bestTune), # combine user hyperparams with the discovered hyperparams
    sortingMetric=jsonlite::unbox(wrapper$metric), # best hyperparameters were selected by this metric (all metrics still returned)
    # times=wrapper$times, # elapsed time for grid search, and for training final model
    predictorTypes=wrapper$terms # types for each term. Useful for verifying types used in fit model
  )

  analyzeGLM <- function(model) list(
    coefficients=coef(model),
    statistics=broom::glance(model),
    coefficientCovarianceMatrix=vcov(model),
    anova=anova(model),
    vif=if(length(coef(model)) > 1) as.list(car::vif(model)) else NULL
    # This is where some outlier detection could be conducted. Return points that are outliers
    # cooksDistance=cooks.distance(model),
    # hatDiagonals=influence(model)$hat
  )

  analysis <- analyzeWrapper(caretWrapper, hyperparameters)

  # supplemental information for linear models
  if (method %in% c('lm', 'glm', 'glm.nb')) {
    analysis <- c(analysis, analyzeGLM(model$finalModel))
  }

  # percentual average cell counts across resamples
  if (caretWrapper$modelType == 'Classification') {
    confMatrix <- caret::confusionMatrix(caretWrapper)
    analysis$confusionMatrix <- as.data.frame(confMatrix$table)
    analysis$performance <- confMatrix$overall
  }

  analysis
}, error=function(err) list(success=FALSE, message=paste0("R solver failed analyzing fitted model (", err, ")")))


caretProduce <- function(model, metadata, specification) {
  dataWrap <- loadData(specification)
  if (!dataWrap[['success']]) return(dataWrap)
  data <- dataWrap$data

  resultsWrap <- getPredictions(model, data, metadata, specification)
  if (!resultsWrap[['success']]) return(resultsWrap)
  predicted <- resultsWrap[['data']][['predicted']]
  predictType <- resultsWrap[['data']][['predictType']]

  resultDirectoryPath <- gsub('file://', '', specification[['output']][['resource_uri']], fixed=TRUE)

  uid <- uuid::UUIDgenerate()
  resultPath <- paste(resultDirectoryPath, paste0(uid, '.csv'), sep='/')
  currentPath <- getwd()

  resultWrap <- tryCatch({
      setwd('/')
      write.csv(predicted, resultPath, row.names=FALSE)
      list(success=TRUE, message='R writing produce file successful')
    },
    error=function(msg) return(list(success=FALSE, message=paste0('R writing produce file failed (', msg, ')')))
  )
  setwd(currentPath)
  if (!resultWrap[['success']]) return(resultWrap)

  produceResponse <- list(
    data_pointer=resultPath,
    predict_type=predictType,
    search_id=metadata[['search_id']],
    model_id=metadata[['model_id']]
  )

  return(list(success=TRUE, data=produceResponse))
}


caretScore <- function(model, metadata, specification, callbackScore) {

  # this sends raw predictions into the 'pred' column for summaryFunction
  target <- metadata[['targets']][[1]]

  metadata[['targets']] <- 'pred'

  # DATA
  dataWrap <- loadData(specification)
  if (!dataWrap$success) return(dataWrap)
  data <- dataWrap$data

  # cache for predicted data
  predictions <- list(PROBABILITIES=NULL, RAW=NULL)

  for (performanceMetricSpec in specification[['performanceMetrics']]) {
    metricUtility <- getMetricUtility(performanceMetricSpec)

    # predict class probabilities if needed for metric
    if (is.null(specification[['configuration']])) specification[['configuration']] <- list()
    predictType <- if (metricUtility[['classProbs']]) 'PROBABILITIES' else 'RAW'
    specification[['configuration']][['predict_type']] <- predictType

    # if no prediction cache
    if (is.null(predictions[[specification[['configuration']][['predict_type']]]])) {
      resultsWrap <- getPredictions(model, data, metadata, specification)
      if (!resultsWrap[['success']]) return(resultsWrap)
      predictions[[predictType]] <- resultsWrap[['data']][['predicted']]
      predictions[[predictType]]['obs'] <- data[[target]]
    }

    scoreValue <- metricUtility$summaryFunction(
      predictions[[predictType]],
      lev=levels(predictions[[predictType]]$obs)
    )

    callbackScore(list(
      metric=metricUtility$metric,
      value=scoreValue,
      target=target,
      search_id=metadata[['search_id']],
      model_id=metadata[['model_id']]
    ))
  }
}


# BEGIN ENDPOINTS

caretSolve.app <- function(everything) {
  print('entered caretSolve.app')
  requirePackages(c(packageList.any, packageList.caret.app))

  # TODO: handle timeout
  searchId <- everything[['search_id']]

  callbackParams <- everything[['callback_params']]
  if (is.null(callbackParams)) return(jsonlite::toJSON(castBody(list(
    success=FALSE, message='callback_params must be specified to return results'
  ))))

  websocketId <- callbackParams[['websocket_id']]

  systemParams <- if (!is.null(everything[['system_params']])) everything[['system_params']] else list()

  specification <- everything[['specification']]
  if (is.null(specification)) return(jsonlite::toJSON(castBody(list(
    success=FALSE, message="'specification' is null"
  ))))

  callbackFound <- function(model, metadata) {
    resultWrap <- saveModel(model, metadata)
    if (!resultWrap$success) sendError(resultWrap$message, websocketId)
    metadata[['model_id']] <- resultWrap$data

    resultWrap <- caretDescribe(model, metadata)
    if (resultWrap$success) httr::POST(
      RECEIVE_ENDPOINT,
      body=castBody(list(
        success=jsonlite::unbox(TRUE),
        data=resultWrap$data,
        msg_type=jsonlite::unbox(RECEIVE_DESCRIBE_MSG),
        websocket_id=jsonlite::unbox(websocketId),
        message=jsonlite::unbox('describe successful')
      )), encode='json'
    )
    else sendError(resultWrap$message, websocketId)

    if ('produce' %in% names(callbackParams[['specification']])) {

      for (produceSpec in callbackParams[['specification']][['produce']]) {
        resultWrap <- caretProduce(model, metadata, produceSpec)

        if (resultWrap$success) httr::POST(
          RECEIVE_ENDPOINT,
          body=castBody(list(
            success=jsonlite::unbox(TRUE),
            data=resultWrap[['data']],
            msg_type=jsonlite::unbox(RECEIVE_PRODUCE_MSG),
            websocket_id=jsonlite::unbox(websocketId),
            message=jsonlite::unbox('produce successful')
          )), encode='json'
        )
        else sendError(resultWrap$message, websocketId)
      }
    }

    if ('score' %in% names(callbackParams[['specification']])) {

      callbackScore <- function(metadata) httr::POST(
        RECEIVE_ENDPOINT,
        body=castBody(list(
          success=jsonlite::unbox(TRUE),
          data=metadata,
          msg_type=jsonlite::unbox(RECEIVE_SCORE_MSG),
          websocket_id=jsonlite::unbox(websocketId),
          message=jsonlite::unbox('score successful')
        )), encode='json'
      )

      for (scoreSpec in callbackParams[['specification']][['score']]) {
        caretScore(model, metadata, scoreSpec, callbackScore)
      }
    }
  }
  resultWrap <- caretSearch(specification, systemParams, callbackFound, searchId)

  return(jsonlite::toJSON(castBody(resultWrap)))
}

caretSearch.app <- function(everything) {
  requirePackages(c(packageList.any, packageList.caret.app))

  callbackParams <- everything[['callback_params']]
  if (is.null(callbackParams)) return(jsonlite::toJSON(castBody(list(
    success=FALSE, message="'callback_params' is null"
  ))))

  websocketId <- callbackParams[['websocket_id']]

  searchId <- everything[['search_id']]

  systemParams <- if (!is.null(everything[['system_params']])) everything[['system_params']] else list()

  specification <- everything[['specification']]
  if (is.null(specification)) return(jsonlite::toJSON(castBody(list(
    success=FALSE, message="'specification' is null"
  ))))

  callbackFound <- function(model, metadata) {
    metadata[['model_id']] <- saveModel(model)

    resultWrap <- caretDescribe(model, metadata)
    if (resultWrap$success) httr::POST(
      RECEIVE_ENDPOINT,
      body=castBody(list(
        success=jsonlite::unbox(TRUE),
        data=resultWrap$data,
        msg_type=jsonlite::unbox(RECEIVE_DESCRIBE_MSG),
        websocket_id=jsonlite::unbox(websocket_id),
        message=jsonlite::unbox('describe successful')
      )), encode='json'
    )
    else sendError(resultWrap$message, websocketId)
  }

  resultWrap <- caretSearch(specification[['search']], systemParams, callbackFound, searchId)
  return(jsonlite::toJSON(castBody(resultWrap)))
}

caretDescribe.app <- function(everything) {
  requirePackages(c(packageList.any, packageList.caret.app))

  modelId <- everything[['model_id']]
  if (is.null(modelId)) return(
    jsonlite::toJSON(castBody(list(success=FALSE, message="'model_id' is null")))
  )

  resultWrap <- loadModel(modelId)
  if (!resultWrap$success) return(jsonlite::toJSON(castBody(resultWrap)))
  model <- resultWrap$data

  resultWrap <- loadMetadata(modelId)
  if (!resultWrap$success) return(jsonlite::toJSON(castBody(resultWrap)))
  metadata <- resultWrap$data

  resultWrap <- caretDescribe(model, metadata)
  return(jsonlite::toJSON(castBody(resultWrap)))
}

caretProduce.app <- function(everything) {
  requirePackages(c(packageList.any, packageList.caret.app))

  specification <- everything[['specification']]
  if (is.null(specification)) return(jsonlite::toJSON(castBody(list(
    success=FALSE, message="'specification' is null"
  ))))

  modelId <- everything[['model_id']]
  if (is.null(modelId)) return(jsonlite::toJSON(castBody(list(
    success=FALSE, message="'model_id' is null"
  ))))

  resultWrap <- loadModel(modelId)
  if (!resultWrap$success) return(jsonlite::toJSON(castBody(resultWrap)))
  model <- resultWrap$data

  resultWrap <- loadMetadata(modelId)
  if (!resultWrap$success) return(jsonlite::toJSON(castBody(resultWrap)))
  metadata <- resultWrap$data

  resultWrap <- caretProduce(model, metadata, specification)
  return(jsonlite::toJSON(castBody(resultWrap)))
}

caretScore.app <- function(everything) {
  requirePackages(c(packageList.any, packageList.caret.app))

  specification <- everything[['specification']]
  if (is.null(specification)) return(jsonlite::toJSON(castBody(list(
    success=FALSE, message="'specification' is null"
  ))))

  modelId <- everything[['model_id']]
  if (is.null(modelId)) return(jsonlite::toJSON(castBody(list(
    success=FALSE, message="'model_id' is null"
  ))))

  resultWrap <- loadMetadata(modelId)
  if (!resultWrap$success) return(jsonlite::toJSON(castBody(resultWrap)))
  metadata <- resultWrap$data

  resultWrap <- caretScore(model, metadata, specification)
  return(jsonlite::toJSON(castBody(resultWrap)))
}
