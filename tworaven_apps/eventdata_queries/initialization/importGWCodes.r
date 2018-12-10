#~ it seems that some of the ISO codes in the states library are wrong

library("states")
library("rjson")

gwstates <- states::gwstates[1:3]

print(gwstates)

print(as.data.frame(gwstates))

write.table(gwstates, "../alignments/gwCodes.csv", quote=TRUE, sep=",", row.names=FALSE)
