
packageList.report.app <- c('rmarkdown', 'ggplot2', 'knitr', 'reshape2', 'grid', 'gridExtra', 'xtable')
packageList.caret.app <- c('caret', 'R.utils', "rpart", "ranger", "naivebayes", "doParallel", "nloptr")

# no known apps use these packages
packageList.none <- c('Amelia', "Rcpp","VGAM", "dplyr", "devtools", "nloptr", "XML")

# all known apps use these packages
packageList.any <- c('jsonlite', 'rjson', 'DescTools')

installPackages <- function(packageList) {
    print(paste("load packages...", sep=""))

    # Find an available repository on CRAN
    availableRepos <- getCRANmirrors()
    flag <- availableRepos$Country=="USA" & grepl("https",availableRepos$URL,)
    useRepos <- sample(availableRepos$URL[flag],1)

    ## install missing packages, and update if newer version available
    for(i in 1:length(packageList)){
        if (!require(packageList[i],character.only = TRUE)){
            install.packages(packageList[i], repos=useRepos)
        }
    }
    update.packages(ask = FALSE, dependencies = c('Suggests'), oldPkgs=packageList, repos=useRepos)
}

requirePackages <- function(packageList) lapply(packageList, require, character.only = TRUE)

# install(c(packageList.any, packageList.solver.app, packageList.report.app))
