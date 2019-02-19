##
##  rooksolver.r
##

production <- FALSE

# limit on number of fitted values to return to frontend
observationLimit <- 1000


# POST specification
# {
#     dataurl: 'path to url',
#     predictors: ['pred1', 'pred2', ...],
#     target: 'targ',
#     weights: *optional column name of observation weights*,
#
#     task: 'regression' or 'classification',
#     model: *one of keys of methodList variable, like 'linear' or 'poisson'*,
#     method: *if specified, overrides task and model, passed directly into caret*,
#     hyperparameters: {named arguments to the relevant R library function, like 'family' or 'k'},
#     crossValidation: 'cv' or 'timeslice'
# }


send <- function(res) {
    res <- jsonlite:::toJSON(res)
    if (production) sink()
    else write(res, "../assets/result.json")

    response <- Response$new(headers = list(`Access-Control-Allow-Origin` = "*"))
    response$write(res)
    response$finish()
}

# TODO: include confusion matrix (due to observationLimit)
analyzeWrapper <- function(wrapper, hyperparameters, samples) list(
    fittedValues=predict(wrapper, type='raw')[samples],
    label=wrapper$modelInfo$label, # plain english model label
    method=wrapper$method, # caret library method
    task=tolower(wrapper$modelType), # if user passed model, then ignore user-passed task (defer to caret)
    library=wrapper$modelInfo$library, # R library used
    gridResults=wrapper$results, # fit statistics for each point in a grid over all free hyperparameters
    hyperparameters=c(hyperparameters, wrapper$bestTune), # combine user hyperparams with the discovered hyperparams
    sortingMetric=wrapper$metric, # best hyperparameters were selected by this metric (all metrics still returned)
    times=wrapper$times, # elapsed time for grid search, and for training final model
    predictorTypes=wrapper$terms, # types for each term. Useful for verifying types used in fit model
)

analyzeGLM <- function(model, samples) list(
    coefficients=coef(model),
    statistics=broom::glance(model),
    coefficientCovarianceMatrix=vcov(model),
    anova=anova(model),
    # vif=car::vif(model),
    cooksDistance=cooks.distance(model)[samples],
    hatDiagonals=influence(model)$hat[samples],
    meanSquaredError=mean(resid(model)^2)
)

methodList <- list(
    linear='lm',
    poisson='glm',
    binomial='glm',
    logistic='glm',
    gamma='glm',
    exponential='glm',
    `negative binomial`='glm.nb',
    `decision tree`='ranger'
)

# add family hyperparameter for glm models
familyList <- list(
    poisson='poisson',
    binomial='binomial',
    logistic='binomial',
    gamma='gamma',
    exponential='gamma'
)

#  to check if the variable is binary
isBinary <- function(v) {
    x <- unique(v)
    length(x) - sum(is.na(x)) == 2L
}

solver.app <- function(env) {

    print(paste("--- solver.app ---", sep=""))

    if (production) sink(file = stderr(), type = "output")

    request <- Request$new(env)
    valid <- jsonlite::validate(request$POST()$solaJSON)
    if (!valid) return(send(list(warning = "The request is not valid json. Check for special characters.")))

    everything <- jsonlite::fromJSON(request$POST()$solaJSON, flatten = TRUE)

    dataurl <- everything$dataset_path
    if (is.null(dataurl)) return(send(list(error = "No data url.")))

    predictors <- everything$prob$predictors
    if (is.null(predictors)) return(send(list(error = "No predictors.")))

    target <- everything$prob$target
    if (is.null(target)) return(send(list(error = "No target.")))

    weights <- everything$weights

    task <- everything$prob$task
    if (is.null(task)) return(send(list(error = "No defined task.")))

    hyperparameters <- ifelse(is.null(everything$hyperparameters), list(), everything$hyperparameters)
    crossValidation <- ifelse(is.null(everything$crossValidation), 'cv', everything$crossValidation)

    if (!(crossValidation %in% c('cv', 'timeslice')))
        return(send(list(error = paste0('Invalid crossValidation "', crossValidation, '"'))))

    method <- everything$method
    if (is.null(method)) {
        model <- everything$model

        # set a default model
        if (is.null(model) || model == 'modelUndefined') {
            if (is.null(task) || task == 'regression') model <- 'linear'
            if (task == 'classification') {
                model <- if (isBinary(data[target])) 'logistic' else 'ranger'
            }
        }

        # map user model to caret method
        method <- if (model %in% names(methodList)) methodList[[model]] else model

        # add glm family if using glm and hyperparameter if not set
        if (method == 'glm' && is.null(hyperparameters$family)) hyperparameters$family <- familyList[[model]]
    }


    # load data
    data <- tryCatch({
        separator <- if (endsWith(dataurl, 'csv'))',' else '\t'
        print(paste("Pre Reading table, separator: ", separator, sep=""))

        data <- read.table(dataurl, sep = separator, header = TRUE, fileEncoding = 'UTF-8')
        print(paste("POST Reading table", sep=""))

        if (task == 'classification') data[[target]] <- factor(data[[target]]) # this causes caret to treat as classification
        data[, c(target, predictors)] # subset columns
    }, error=function(err) list(error = paste0("R solver failed loading data (", err, ")")))
    if (names(data) == c("error")) return(send(data))


    # fit model
    caretWrapper <- tryCatch(
        # TODO: prevent thread block when encountering uninstalled package dependency
        do.call(caret::train, c(list(
            formula(paste(target, '~', paste(make.names(predictors), collapse='+'))),
            data=data,
            method=method,
            trControl=trainControl(method=crossValidation, number=10),
            na.action=na.omit, # listwise deletion of rows
            weights=weights
        ), hyperparameters)),
    error=function(err) list(error=paste0("R solver failed fitting model (", err, ")")))
    if (names(caretWrapper) == c("error")) return(send(caretWrapper))


    # analyze model
    analysis <- tryCatch({
        samples <- if (length(fitted(model)) < observationLimit) 1:length(fitted(model))
        else sort(sample(1:length(fitted(model)), observationLimit))

        analysis <- analyzeWrapper(caretWrapper, hyperparameters, samples)

        # supplemental information for linear models
        if (method %in% c('lm', 'glm', 'glm.nb'))
            analysis <- c(analysis, analyzeGLM(caretWrapper$finalModel, samples))

        # percentual average cell counts across resamples
        if (caretWrapper$modelType == 'Classification')
            analysis$confusionMatrix <- as.data.frame(caret::confusionMatrix(temp)$table)

        # TODO: use metric from user argument
        # TODO: evaluate all metrics for model

        analysis
    }, error=function(err) list(error=paste0("R solver failed analyzing fitted model (", err, ")")))

    send(analysis)
}
