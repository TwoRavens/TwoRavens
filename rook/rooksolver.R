##
##  rooksolver.r
##
library(stargazer)
library(ranger)

send <- function(res) {
    res <- jsonlite:::toJSON(res)
    if (production) {
        sink()
    }
    write(res, "../assets/result.json")

    response <- Response$new(headers = list("Access-Control-Allow-Origin" = "*"))
    response$write(res)
    response$finish()
}

make.formula <- function(targets, predictors) {
    targets.str <- paste(make.names(target), collapse='+')
    predictors.str <- paste(make.names(target), collapse='+')
    return(formula(paste(targets.str, '~', predictors.str)))
}

glm_analysis <- function(model, data, predictors, confidence) {
    samples <- if (length(data) < 1000) 1:length(data) else sort(sample(1:length(data), 1000))

    # construct pointwise confidence intervals
    predictions <- predict(model, type = "link", se.fit = TRUE) # before link function is applied
    statistic <- abs(qt((1 - confidence) / 2, length(model$fitted.values) - length(coef(model))))
    # map intervals from the linear space into the response space via inverse link function
    interval_lower <- family(model)$linkinv(predictions$fit - statistic * predictions$se.fit)
    interval_upper <- family(model)$linkinv(predictions$fit + statistic * predictions$se.fit)

    inf = influence(model)
    return(list(
        fitted.values=model$fitted.values[samples],  # after link function is applied
        coefficients=broom::tidy(model, conf.int=TRUE, conf.level=confidence),
        statistics=broom::glance(model),
        covariance.matrix=vcov(model)
    ))
}

model_glm_gaussian <- function(target, predictors, data, confidence) {
    # use lm to keep R^2, sigma, F statistic
    model <- lm(make.formula(target, predictors), data=data)
    return(glm_analysis(model, predictors, data, confidence))
}

model_glm_poisson <- function(target, predictors, data, confidence) {
    model <- glm(make.formula(target, predictors), data=data, family='poisson')
    return(glm_analysis(model, confidence))
}

model_glm_binomial <- function(target, predictors, data, confidence) {
    model <- glm(make.formula(target, predictors), data=data, family='binomial')
    return(glm_analysis(model, confidence))
}

model_glm_negative_binomial <- function(target, predictors, data, confidence) {
    model <- glm.nb(make.formula(target, predictors), data=data)
    return(glm_analysis(model, confidence))
}

model_decision_tree <- function(target, predictors, data, confidence) {
    model <- ranger(make.formula(target, predictors), data = data, classification = TRUE)
    return(list(
        fitted.values=predict(model, data=data)$predictions,
    ))
}

model_kmeans <- function(target, predictors, data, confidence) {
    model <- knn()
}

model_linear_discriminant <- function(target, predictors, data, confidence) {
    model
}

models <- list(
    ols_regression=model_glm_gaussian,
    poisson_regression=model_glm_poisson,
    negative_binomial_regression=model_glm_negative_binomial,
    logistic_regression=model_glm_binomial,
    decision_tree=model_decision_tree
)

#  to check if the variable is binary
is_binary <- function(v) {
    x <- unique(v)
    length(x) - sum(is.na(x)) == 2L
}


#  to check if the variable is binary
  is_binary <- function(v) {
    x <- unique(v)
    length(x) - sum(is.na(x)) == 2L
  }

solver.app <- function(env) {
    print(paste("--- solver.app ---", sep=""))

    print(env)
    production <- FALSE
    result <- list()

    if (production) {
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)
    valid <- jsonlite::validate(request$POST()$solaJSON)
    if (! valid) {
        return(send(list(warning = "The request is not valid json. Check for special characters.")))
    }

    everything <- jsonlite::fromJSON(request$POST()$solaJSON, flatten = TRUE)
    print(paste("everything: ", everything, sep=""))

    dataurl <- everything$dataset_path
    if (is.null(dataurl)) {
        return(send(list(warning = "No data url.")))
    }

    model <- everything$model

    task <- everything$prob$task
    print(paste("task: ", task, sep=""))

    if (is.null(task)) {
        return(send(list(warning = "No defined task.")))
    }

    predictors <- everything$prob$predictors
    if (is.null(predictors)) {
        return(send(list(warning = "No predictors.")))
    }

    target <- everything$prob$target
    if (is.null(target)) {
        return(send(list(warning = "No target.")))
    }

    hyperparameters <- everything$hyperparameters

    separator <- if (endsWith(dataurl, 'csv'))',' else '\t'
    print(paste("Pre Reading table, separator: ", separator, sep=""))

    mydata <- read.table(dataurl, sep = separator, header = TRUE, fileEncoding = 'UTF-8')
    print(paste("POST Reading table", sep=""))

    tryCatch({

        # data
        data <- data[, c(target, predictors)]

        # listwise deletion
        d <- na.omit(d)
        print(colnames(d))

        # Perform binary check
        isBinary<- is_binary(d[target])
        print("is_binary : ")
        print(isBinary)
        if(task=="regression" || task=="OLS")
        {
        fit <- lm(formula(paste(target,"~",paste(predictors, collapse="+"))),data=d)
        model_type <- "OLS Regression Model"
      }else if(task=="classification" || task=="LogisticRegression" || task=="RandomForest"){
        if(isBinary || task=="LogisticRegression"){
        fit <- glm(formula(paste(target,"~",paste(predictors, collapse="+"))),data=d, family="binomial")
        # We predict 
        model_type <- "Logistic Regression Model"
        }
        else{
          fit <- ranger(formula(paste(target,"~",paste(predictors, collapse="+"))),data=d, classification=TRUE)
          predict <- predict(fit, data=d)
          fitted_values<- predict$predictions
          model_type <- "Random Forest Model"
        }
      }
        if(class(fit)== "ranger"){
        stargazer_lm <- paste("")
        jsonfit <- jsonlite::serializeJSON(fit)
        fittedvalues <- fitted_values
        actualvalues <- d[,target]
        }
        else
        {
        stargazer_lm <- paste(stargazer(fit, type="html"), collapse="")
        jsonfit <- jsonlite::serializeJSON(fit)
        
        fittedvalues <- fit$fitted.values
        actualvalues <- d[,target]
        
        }

        if (class(fit)=="lm" || class(fit)=="glm" || class(fit)== "ranger") {
            return(send(list(data=d, description=description, dependent_variable=target, predictors=predictors,  task=task, model_type = model_type, stargazer= stargazer_lm, 
            predictor_values=list(fittedvalues=fittedvalues, actualvalues=actualvalues))))
        } else {
            return(send(list(warning = "No model estimated.")))
        }

        # fit the model
        solution <- models[[model]](target, predictors, data, hyperparameters)

        # evaluate the model
        solution$score <- metrics[[metric]](solution$fitted.values, solution$actual.values)

        solution$task <- task
        solution$model <- model
        solution$metric <- metric

        return(send(solution))
    },
    error = function(err) {
        result <<- list(warning = paste("error: ", err))
        print("result ---- ")
        print(result)
    })

    return(send(result))
}
