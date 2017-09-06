# Code to get a list of all R packages and their dependencies needed to be installed from CRAN for TwoRavens 
# Assumes all the packages in the base distribution of R are already installed.
# Using Zelig greatly lengthens this list, so the list is built with and without Zelig


base <- c("base", "compiler", "datasets", "graphics", "grDevices", "grid", "methods", "parallel", "splines", "stats", "stats4", "tcltk", "tools", "translations", "utils")

list <- c("Rook", "rjson", "jsonlite", "devtools", "DescTools")

listz <- c(list,"Zelig", "ZeligChoice")


## Get list without using Zelig

dep.list<- list
for(i in 1:length(list)){
	dep.list <- c(dep.list, tools::package_dependencies(list[i], recursive=TRUE)[[1]] )
}

dep.list <- sort(unique(dep.list))
flag.list <- dep.list %in% base
dep.list <- dep.list[!flag.list]
cat(dep.list)


## Get list when using Zelig

dep.listz<- listz
for(i in 1:length(listz)){
	dep.listz <- c(dep.listz, tools::package_dependencies(listz[i], recursive=TRUE)[[1]] )
}

dep.listz <- sort(unique(dep.listz))
flag.listz <- dep.listz %in% base
dep.listz <- dep.listz[!flag.listz]
cat(dep.listz)

