# Title     : rooktree
# Objective : decision tree json
# Created by: kripanshubhargava
# Created on: 11/8/17



# library(rpart)
# library(readr)
tree.app <- function(env)
{

    print("Tree app started")
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    warning<-FALSE
    #print("this is env")r
    #print(env$env)
    if(production){
        sink(file = stderr(), type = "output")
    }
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    valid <- jsonlite::validate(request$POST()$solaJSON)
    if(!warning)
    {
        everything <- jsonlite::fromJSON(request$POST()$solaJSON, flatten=TRUE )

        print("this is everything.........")
        print("***")
        print(everything$env)
        print("***")
    }
    print("***")
    print(valid)
    print("***")
  whichlevel<- function(i)
    {
        return(trunc(log(i)/log(2)))

    }
    print("hello treeapp")
    fearonLaitin <- read.csv("../data/fearonLaitin.csv",nrows=1000)
    #View(fearonLaitin)
    obj<-everything$env
    formula<- eval(parse(text=paste(obj,"~ .", sep = "")))
    print(formula)

    myTree <- rpart(formula,data=fearonLaitin,control=rpart.control(minsplit=2,cp=0))
   # myTree  <- prune(rpTree, cp = rpTree$cptable[which.min(rpTree$cptable[,"xerror"]),"CP"])
    myTree$frame
    print(myTree)
    #rpart.plot(myTree)
    rowvalue<<-c()
    #function to get rownamest
    tf<-myTree$frame
    ts<-myTree$splits
    length<-1
    for(i in 1:nrow(tf)) {
        rowvalue[i]<-as.numeric(rownames(tf[i,]))

    }
    #rint(length(rowvlaue))
    #rowvlaue[length(rowvlaue)]<-c(1)
    #print(rowvlaue)
    j<-1
    #check
    for(i in rowvalue) {
        if((j+1) > length(rowvalue)) {break}
        if(rowvalue[j]-rowvalue[j+1]>0)
        {
            myBrac<-whichlevel(rowvalue[j])-whichlevel(rowvalue[j+1])
            for(k in 1:myBrac) {
              #  print("}]")
            }

        }
        j<-j+1
    }


    #function to retrive the data from the tree$splits index

    name <-c()
    value<-c()
    extractIndex<-function(ts)
    { j<-1
        for(i in 1:nrow(ts)) {

            # ##print(ts[i,'index'])
            if(ts[i,'count'] %in% name || ts[i,'count']==0)
            {}
            else{
                #name<-vector()
                name<-0
                #print(name)
                name[j]<-ts[i,'count']

                value[j]<-ts[i,'index']

                j<-j+1
            }
        }
        # #print(name)
        ##print(value)

    }
    extractIndex(myTree$splits)


    #start from here
    split.i <- 1
    leaf.i <- 1
    myi<-1
    tf<-myTree$frame
    ts<-myTree$splits
    treeToJson <- function(tf,ts,mystr) {
        name <-c()
        value<-c()

        #extractIndex(myTree$splits)
        {
            j<-1
            for(i in 1:nrow(ts)) {

                # #print(ts[i,'index'])
                if(ts[i,'count'] %in% name || ts[i,'count']==0)
                {}
                else{
                    name<-0
                    name[j]<-ts[i,'count']

                    value[j]<-ts[i,'index']

                    j<-j+1
                }

            }


        }

        rowvlaue<-c()
        #function to get rownames
        tf<-myTree$frame
        ts<-myTree$splits
        for(i in 1:nrow(tf)) {
            #print(i)
            rowvlaue[i]<-as.numeric(rownames(tf[i,]))

        }
        rowvlaue[0]<-0
        j<-1
        z<-0
        mystr<-""
        ##print(name)
        # #print(value)
        for(i in 1:nrow(tf)) {

            row <- tf[i,]
            val<- ""
            if(row$var!="<leaf>")
            {
                if(is.na(value[j]))
                {
                    value[j]=00
                    print("NA")
                }
                mystr <- paste(mystr,"{","\"error \": ",row$dev,",\"samples\": ",row$n,",\"value\": [ ",row$yval," ],\"label\": ",paste("\"",row$var," <= ", value[j],"\""),",\"type\":\"split\",\"children\":[", sep='')



                #check

                z<-z+1
                j<-j+1

            }
            else if(row$var=="<leaf>"){
                #    #print(mystr)

                mystr <- paste(mystr,"{", sep='')
                mystr <- paste(mystr,"\"error\": ",row$dev,",\"samples\": ",row$n,",\"value\": [ ",row$yval," ],\"label\": \"Leaf - ",leaf.i,"\",\"type\":\"leaf\"},", sep='')

                z<-z+1

            }
            if((z+1) > length(rowvalue)) {
                myBrac<-whichlevel(rowvalue[z]-1)
                for(k in 1:myBrac) {
                    # print("here")
                    #Remove the comma
                    if(k==1) {mystr <- substr(mystr, 1, nchar(mystr)-1)}
                    mystr <- paste(mystr," ]}", sep='')

                }
                break
            }
            if(rowvalue[z]-rowvalue[z+1]>0)
            {
                myBrac<-whichlevel(rowvalue[z])-whichlevel(rowvalue[z+1])
                for(k in 1:myBrac) {
                    #  print("this is i")
                    #  print(i)
                    # print("this is value")
                   print(rowvlaue[z])
                    if(k==1){ mystr <- substr(mystr, 1, nchar(mystr)-1)
                        # print("removed")
                    } #Remove the comma
                    mystr <- paste(mystr,"]}", sep='')
                }
                mystr <- paste(mystr,",", sep='')


            }

            # #print(str)

        }
        #mystr <- substr(mystr, 1, nchar(mystr)-1) #Remove the comma
        #mystr <- paste(mystr,"]}", sep='')
        #mystr <-paste(mystr,"]",sep='')

        myi <<- myi+1
        #  treeToJson(tf=mynewtree,mystr=mystr)
        # #print(str)
        return(mystr)
    }
    if(production){
        sink()
    }

    #newstr <- treeToJson(myTree$frame,myTree$splits,mystr)
    write(treeToJson(myTree$frame,myTree$splits,mystr), "univariateTree.json")

   response$write(treeToJson(myTree$frame,myTree$splits,mystr))
    response$finish()


response$finish()
}