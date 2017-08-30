

## R command to list packages

```R
ip = as.data.frame(installed.packages()[,c(1,3:4)])
ip = ip[is.na(ip$Priority),1:2,drop=FALSE]
ip
```


## python parse

```python
# ro = R output from code above
l = [tuple(line.split()[1:]) for line in ro if len(line.split())==3]
for x in l: print('%s %s' % (x))

```
