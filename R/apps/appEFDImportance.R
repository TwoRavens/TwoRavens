
efdimportance.app <- function(everything) {
    print('entering efdImportance app')
    print(everything)
    efdData <- everything$efdData
    task <- everything$task

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
		print(length(y))
		print(bonus(y))
		#print(penalty(y))
		im <- bonus(y)
		if(length(y)>5){
			im <- im - lambda*penalty(y)
		}
		return(im)
	}

    print("GOT HERE 1")

    allvars <- names(efdData)
    allcols <- names(efdData[[allvars[1]]][[1]])
    scores  <- list() #vector("list", length = length(allvars))
    #names(scores) <- allvars

    for(i in 1:length(allvars)){ 
	    hope <- as.data.frame(matrix(unlist(efdData[[i]]), nrow=length(efdData[[allvars[i]]]), byrow=TRUE))
	    names(hope) <- allcols
	    #print(hope[1:3,])
	    fv <- as.vector(hope[,1])
	    im <- importanceMetric(fv)
	    scores[[i]] <- list(importanceMetric(fv))
	    names(scores[[i]]) <- allvars[[i]]
    }

    print(jsonlite::toJSON(okResult(list(scores=scores))))

    # return predictors in same order
    return(jsonlite::toJSON(okResult(list(scores=scores))))
}