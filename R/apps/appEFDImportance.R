
efdimportance.app <- function(everything) {
    print('entering efdImportance app')
    print(everything)
    efdData <- everything$efdData
    # return predictors in same order
    return(jsonlite::toJSON(okResult(names(efdData))))
}