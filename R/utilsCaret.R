


getMetricUtility <- function(specification) {

    unsupportedMetrics <- c(
        'ROC_AUC_MICRO',
        'NORMALIZED_MUTUAL_INFORMATION',
        'JACCARD_SIMILARITY_SCORE',
        'PRECISION_AT_TOP_K',
        'OBJECT_DETECTION_AVERAGE_PRECISION',
        'HAMMING_LOSS')

    print('getMetricUtility')
    print(specification[['metric']])
    print(specification[['metric']] %in% unsupportedMetrics)

    if (specification[['metric']] %in% unsupportedMetrics) print(paste0(specification[['metric']], ' is not supported.'))

    positiveLabel <- NULL
    if (!is.null(specification[['positiveLabel']])) positiveLabel <- toString(specification[['positiveLabel']])

    if (specification[['metric']] == 'ACCURACY') {
        return(list(
            metric=specification[['metric']],
            summaryFunction=function(data, lev=NULL, model=NULL) {
                return(list(ACCURACY=MLmetrics::Accuracy(data$pred, data$obs)))
            },
            maximize=TRUE,
            classProbs=FALSE
        ))
    }

    if (specification[['metric']] == 'PRECISION') {
        return(list(
            metric=specification[['metric']],
            summaryFunction=function(data, lev=NULL, model=NULL) {
                return(list(PRECISION=MLmetrics::Precision(data$obs, data$pred, positive=positiveLabel)))
            },
            maximize=TRUE,
            classProbs=FALSE
        ))
    }

    if (specification[['metric']] == 'RECALL') {
        return(list(
            metric=specification[['metric']],
            summaryFunction=function(data, lev=NULL, model=NULL) {
                return(list(RECALL=MLmetrics::Recall(data$obs, data$pred, positive=positiveLabel)))
            },
            maximize=TRUE,
            classProbs=FALSE
        ))
    }

    if (specification[['metric']] %in% c('F1', 'F1_MACRO')) {
        return(list(
            metric=specification[['metric']],
            # compute average F1 if positive label not specified
            summaryFunction=function(data, lev=NULL, model=NULL) {
                result <- list()
                if (!is.null(positiveLabel)) lev <- c(positiveLabel)
                scores <- sapply(lev, function(lvl) MLmetrics::F1_Score(data$obs, data$pred, positive=lvl))
                result[[specification[['metric']]]] <- mean(scores)
                return(result)
            },
            maximize=TRUE,
            classProbs=FALSE
        ))
    }

    if (specification[['metric']] == 'F1_MICRO') {
        return(list(
            metric=specification[['metric']],
            summaryFunction=function(data, lev=NULL, model=NULL) {
                classWiseCM <- Reduce(`+`, lapply(unique(data$obs), function(lvl) {
                    return(table(
                    factor(data$obs == lvl, levels=c(TRUE, FALSE)),
                    factor(data$pred == lvl, levels=c(TRUE, FALSE))))
                }))
                tp <- classWiseCM["TRUE", "TRUE"]
                fn <- classWiseCM["TRUE", "FALSE"]
                fp <- classWiseCM["FALSE", "TRUE"]
                pr <- tp / (tp + fp)
                re <- tp / (tp + fn)
                return(list(F1_MICRO=2 * ((pr * re) / (pr + re))))
            },
            maximize=TRUE,
            classProbs=FALSE
        ))
    }


    if (specification[['metric']] %in% c('ROC_AUC', 'ROC_AUC_MACRO')) {
        return(list(
            metric=specification[['metric']],
            # return average ROC_AUC if positive label not specified
            summaryFunction=function(data, lev=NULL, model=NULL) {
                result <- list()
                if (!is.null(positiveLabel)) lev <- c(positiveLabel)
                scores <- sapply(lev, function(lvl) MLmetrics::AUC(data[[lvl]], as.numeric(data$obs == lvl)))
                result[[specification[['metric']]]] <- mean(scores)
                return(result)
            },
            maximize=TRUE,
            classProbs=TRUE
        ))
    }

    if (specification[['metric']] == 'MEAN_SQUARED_ERROR') {
        return(list(
            metric=specification[['metric']],
            summaryFunction=function(data, lev=NULL, model=NULL) {
                return(list(MEAN_SQUARED_ERROR=MLmetrics::MSE(data$pred, data$obs)))
            },
            maximize=FALSE,
            classProbs=FALSE
        ))
    }

    if (specification[['metric']] == 'ROOT_MEAN_SQUARED_ERROR') {
        return(list(
            metric=specification[['metric']],
            summaryFunction=function(data, lev=NULL, model=NULL) {
                return(list(ROOT_MEAN_SQUARED_ERROR=MLmetrics::RMSE(data$pred, data$obs)))
            },
            maximize=FALSE,
            classProbs=FALSE
        ))
    }

    if (specification[['metric']] == 'MEAN_ABSOLUTE_ERROR') {
        return(list(
            metric=specification[['metric']],
            summaryFunction=function(data, lev=NULL, model=NULL) {
                return(list(MEAN_ABSOLUTE_ERROR=MLmetrics::MAE(data$pred, data$obs)))
            },
            maximize=FALSE,
            classProbs=FALSE
        ))
    }

    if (specification[['metric']] == 'R_SQUARED') {
        return(list(
            metric=specification[['metric']],
            summaryFunction=function(data, lev=NULL, model=NULL) {
                return(list(R_SQUARED=MLmetrics::R2_Score(data$pred, data$obs)))
            },
            maximize=TRUE,
            classProbs=FALSE
        ))
    }

    print(paste(specification[['metric']], 'is not a valid metric.'))
}

loadData <- function(specification) tryCatch({

    print('loadData')
    if (is.null(specification[['input']][['resource_uri']]))
    return(list(success=FALSE, message="'resource_uri' is null"))
    datasetPath <- gsub('file://', '', specification[['input']][['resource_uri']], fixed=TRUE)

    print('loadData.a')
    separator <- if (endsWith(datasetPath, 'csv'))',' else '\t'

    if (!is.null(specification[['input']][['delimiter']]))
    separator <- specification[['input']][['delimiter']]

    data <- read.table(datasetPath, sep = separator, header = TRUE, fileEncoding = 'UTF-8')
    # print('LOAD: head')
    # print(head(data))

    print('loadData.b')
    # assigning as factor causes caret to treat as classification
    if (!is.null(specification[['problem']])) {
        problem <- specification[['problem']]
        if (all(problem[['taskType']] == 'classification'))
        data[problem[['targets']]] <- lapply(data[problem[['targets']]], as.factor)
        na.omit(data, cols=problem[['predictors']])
    }
    print('loadData.c')
    return(list(success=TRUE, data=data, message='data loaded successfully'))

}, error=function(msg) list(success=FALSE, message=paste0("R solver failed loading data (", msg, ")")))

saveModel <- function(model, metadata) tryCatch({
    modelId <- uuid::UUIDgenerate()

    modelDirectoryPath <- paste(SAVED_MODELS_PATH, modelId, sep='/')
    modelPath <- paste(modelDirectoryPath, 'model.rds', sep='/')
    metadataPath <- paste(modelDirectoryPath, 'metadata.json', sep='/')

    dir.create(modelDirectoryPath)

    metadata[['search_id']] <- jsonlite::unbox(metadata[['search_id']])
    metadata[['system']] <- jsonlite::unbox(metadata[['system']])
    metadata[['task_type']] <- jsonlite::unbox(metadata[['task_type']])

    # save metadata
    cat(jsonlite::toJSON(c(
        list(model_id=jsonlite::unbox(modelId)),
        metadata
    )), file=metadataPath)

    # save model
    saveRDS(model, modelPath)

    return(list(success=TRUE, data=modelId))
}, error=function(msg) list(success=FALSE, message=paste('R solver failed saving model (', msg, ')')))


loadMetadata <- function(modelId) tryCatch({
    modelDirectoryPath <- paste(SAVED_MODELS_PATH, modelId, sep='/')
    metadataPath <- paste(modelDirectoryPath, 'metadata.json', sep='/')

    return(jsonlite::fromJSON(metadataPath))
}, error=function(msg) list(success=FALSE, message=paste('R solver failed loading metadata (', msg, ')')))

loadModel <- function(modelId) tryCatch({
    metadata <- loadMetadata(modelId)

    modelDirectoryPath <- paste(SAVED_MODELS_PATH, modelId, sep='/')
    modelPath <- paste(modelDirectoryPath, 'model.rds', sep='/')

    if (metadata[['system']] == 'caret') {
        return(loadRDS(modelPath))
    }
    print(paste('System not recognized:', metadata[['system']]))
}, error=function(msg) list(success=FALSE, message=paste('R solver failed loading metadata (', msg, ')')))


getPredictions <- function(model, data, metadata, specification) {

    configuration <- specification[['configuration']]
    if (is.null(configuration)) configuration <- list()

    predictType <- configuration[['predict_type']]
    if (is.null(predictType)) predictType <- 'RAW'

    if (metadata[['task_type']] == 'REGRESSION' && predictType == 'PROBABILITIES') return(list(
        success=FALSE, message='cannot predict class probabilities for a regression problem'
    ))

    # map to R names
    predictType <- list(PROBABILITIES='prob', RAW='raw')[[predictType]]
    if (is.null(predictType)) return(list(
        success=FALSE, message=paste('unrecognized predict_type:', configuration[['predict_type']])
    ))

    predictions <- predict(
        model,
        newdata=data[,metadata[['predictors']], drop=FALSE],
        type=predictType
    )

    # upgrade raw predictions to a data frame
    if (predictType == 'raw') {
        predictions <- data.frame(predictions)
        names(predictions) <- metadata[['targets']][[1]]
    }

    joined <- cbind(data.frame(d3mIndex=data[['d3mIndex']]), predictions)

    return(list(success=TRUE, data=list(
        predicted=joined, predictType=predictType
    )))
}