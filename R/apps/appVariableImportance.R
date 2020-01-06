
variableImportance.app <- function(everything) {
    print('entering variableImportance app')
    print(everything)
    efdData <- everything$efdData
    task <- everything$task
    categoricals <- everything$categoricals
    targets <- everything$targets
    predictors <- names(efdData)

	dy <- function(y){
		n<-length(y)
		if(n>2){
			dy <- y[2:n] - y[1:(n-1)] 
		}else{
			print("Error: attempting to differentiate vector of length 1")
		}
		return(dy)
	}


	penalty <- function(y){
		return(mean(abs(dy(dy(y)))))
	}

	bonus <- function(y, alpha=0.05){
		n <- length(y)
		sorty <- sort(y)
		change <- abs(sorty[max(1,round(alpha*n))] - sorty[round((1-alpha)*n)])
		return(change)
	}

	importanceMetric <- function(y, lambda=1){
		#print(length(y))
		#print(bonus(y))
		#print(penalty(y))
		im <- bonus(y)
		if(length(y)>5){
			im <- im - lambda*penalty(y)
		}
		return(im)
	}

    scores  <- list() #vector("list", length = length(allvars))
    for (target in targets) {
      scores[[target]] <- list()
    }

    for(predictor in predictors) {
	    hope <- as.data.frame(matrix(unlist(efdData[[predictor]]), nrow=length(efdData[[predictor]]), byrow=TRUE))
	    names(hope) <- names(efdData[[predictor]][[1]])
	    #print(hope[1:3,])

        for (target in targets) {
          fittedValues <- as.vector(hope[[paste0('fitted ', target)]])
          importanceValue <- importanceMetric(fittedValues)
          if (length(importanceValue) == 0) next
          scores[[target]][[predictor]] <- jsonlite::unbox(importanceValue)
        }
    }

    # alternative identical implementation
    # scores <- sapply(names(efdData), function(variable) {
    #   fittedValues <- sapply(efdData[[variable]], function(datum) datum[['fitted class']])
    #   jsonlite::unbox(importanceMetric(fittedValues))
    # }, simplify=FALSE, USE.NAMES=TRUE)

    return(jsonlite::toJSON(okResult(list(scores=scores))))
}