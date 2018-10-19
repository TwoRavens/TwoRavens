##
##  rooksolver.r
##
library(stargazer)

send <- function(res) {
  res <- jsonlite:::toJSON(res)
  if(production){
    sink()
  }
  write(res, "../assets/result.json")

  response <- Response$new(headers=list("Access-Control-Allow-Origin"="*"))
  response$write(res)
  response$finish()
}

solver.app <- function(env) {
  print(env)
  production <- FALSE
  result <- list()

  if (production) {
    sink(file=stderr(), type="output")
  }

  request <- Request$new(env)
  valid <- jsonlite::validate(request$POST()$solaJSON)
  if (!valid) {
    return(send(list(warning="The request is not valid json. Check for special characters.")))
  }

  everything <- jsonlite::fromJSON(request$POST()$solaJSON, flatten=TRUE)
  print("everything: ")
  print(everything)

  dataurl <- everything$zd3mdata
  if (is.null(dataurl)) {
    return(send(list(warning="No data url.")))
  }
  description <- everything$prob$description
  if (is.null(description)) {
      return(send(list(warning="No description.")))
  }

    task <- everything$prob$task
    if (is.null(task)) {
        return(send(list(warning="No defined task.")))
    }

    predictors <- everything$prob$predictors
    if (is.null(predictors)) {
        return(send(list(warning="No predictors.")))
    }

    target <- everything$prob$target
    if (is.null(target)) {
        return(send(list(warning="No target.")))
    }

    vars<-c(target,predictors)

    mydata <- read.csv(dataurl)


    if(task=="regression" || task=="classification") {
        tryCatch({
        modeldata <<- list()

        ## data
        d <- mydata[,vars]

        ## listwise deleting
        d <- na.omit(d)
        print(colnames(d))
        fit <- lm(formula(paste(target,"~",paste(predictors, collapse="+"))),data=d)
        stargazer_lm <- paste(stargazer(fit, type="html"),collapse="")
        jsonfit <- jsonlite::serializeJSON(fit)

        fittedvalues <- fit$fitted.values
        actualvalues <- d[,target]

        if (class(fit)=="lm") {
            return(send(list(data=d, description=description, dependent_variable=target, predictors=predictors,  task=task, stargazer= stargazer_lm, predictor_values=list(fittedvalues=fittedvalues, actualvalues=actualvalues))))
        } else {
            return(send(list(warning="No model estimated.")))
        }
        },
        error = function(err) {
        result <<- list(warning=paste("error: ", err))
        print("result ---- ")
        print(result)
        })
  }



  return(send(result))
}
