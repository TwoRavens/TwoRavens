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


#  to check if the variable is binary
is_binary <- function(v) {
    x <- unique(v)
    length(x) - sum(is.na(x)) == 2L
}

solver.app <- function(env) {
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
    print("everything: ")
    print(everything)

    dataurl <- everything$dataset_path
    if (is.null(dataurl)) {
        return(send(list(warning = "No data url.")))
    }
    description <- everything$prob$description
    if (is.null(description)) {
        return(send(list(warning = "No description.")))
    }

    task <- everything$prob$task
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

    vars <- c(target, predictors)

    separator <- if (endsWith(dataurl, 'csv'))',' else '\t'
    mydata <- read.table(dataurl, sep = separator, header = TRUE, fileEncoding = 'UTF-8')

    tryCatch({

        ## data
        d <- mydata[, vars]

        ## listwise deleting
        d <- na.omit(d)
        print(colnames(d))

        # Perform binary check
        isBinary <- is_binary(d[target])
        print("is_binary : ")
        print(isBinary)
        if (task == "regression" || task == "OLS") {
            fit <- lm(formula(paste(target, "~", paste(predictors, collapse = "+"))), data = d)
            model_type <- "OLS Regression Model"
        } else if (task == "classification" ||
            task == "LogisticRegression" ||
            task == "RandomForest") {
            if (isBinary || task == "LogisticRegression") {
                fit <- glm(formula(paste(target, "~", paste(predictors, collapse = "+"))), data = d, family = "binomial")
                # We predict
                model_type <- "Logistic Regression Model"
            }
            else {
                fit <- ranger(formula(paste(target, "~", paste(predictors, collapse = "+"))), data = d, classification = TRUE)
                predict <- predict(fit, data = d)
                fitted_values <- predict$predictions
                model_type <- "Random Forest Model"
            }
        }
        if (class(fit) == "ranger") {
            stargazer_lm <- paste("")
            jsonfit <- jsonlite::serializeJSON(fit)
            fittedvalues <- fitted_values
            actualvalues <- d[, target]
        }
        else {
            stargazer_lm <- paste(stargazer(fit, type = "html"), collapse = "")
            jsonfit <- jsonlite::serializeJSON(fit)

            fittedvalues <- fit$fitted.values
            actualvalues <- d[, target]
        }
        if (class(fit) == "lm" ||
            class(fit) == "glm" ||
            class(fit) == "ranger") {
            return(send(list(description = description, dependent_variable = target, predictors = predictors, task = task, model_type = model_type, stargazer = stargazer_lm,
            predictor_values = list(fittedvalues = fittedvalues, actualvalues = actualvalues))))
        } else {
            return(send(list(warning = "No model estimated.")))
        }
    },
    error = function(err) {
        result <<- list(warning = paste("error: ", err))
        print("result ---- ")
        print(result)
    })

    return(send(result))
}
