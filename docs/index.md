![teaser](/static/teaser.png)

**TwoRavens** is a Web application for statistical modeling. Given a dataset, it automatically identifies interesting relationships and builds models to predict outcomes. Researchers impart substantive knowledge to define new problems and build better models to help solve their research question.

# Applications

The project has 3 core applications:
* D3M
* [Event Data](/EventData/index.md) provides access to openly available event datasets.
* [Metadata Service](/Metadata/index.md)

# Live Demos
Demo [TwoRavens D3M](http://2ravens.org) \\
Demo [TwoRavens for Event Data](http://eventdata.2ravens.org) \\
Demo [Metadata Service](http://metadata.2ravens.org)

# Metadata Service Samples/Benchmarks

| Dataverse | Size | # Rows | # Columns | Time | First 100 Rows* | Result |
| --- | --- | --- | --- | --- | --- | --- | 
| [ajps_replication_raw_wide.tab](https://dataverse.harvard.edu/file.xhtml?persistentId=doi:10.7910/DVN/CQXHTH/UGSMIP&version=1.0) | 86.5 kB  | 360 | 66 | 0.24 s | [.tab](https://github.com/TwoRavens/raven-metadata-service/blob/develop/test_data/CQXHTH_ajps_lebanon_raw_wide.tab) | [.json](https://github.com/TwoRavens/raven-metadata-service/blob/develop/test_data/CQXHTH_ajps_lebanon_raw_wide.json) |
| [sectoral_value_added.csv](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/FE0UYM&version=1.0) | 44.2 kB  | 900 | 26 | 0.25 s | [.csv](https://github.com/TwoRavens/raven-metadata-service/blob/develop/test_data/sectoral_value_added.csv) | [.json](https://github.com/TwoRavens/raven-metadata-service/blob/develop/test_data/sectoral_value_added.json) |
* please see the Dataverse link for the full file 

# Related Publications
Gil, Yolanda, James Honaker, Shikhar Gupta, Yibo Ma, Vito D'Orazio, Daniel Garijo, Shruti Gadewar, Qifan Yang, and Neda Jahanshad. "Towards human-guided machine learning." In Proceedings of the 24th International Conference on Intelligent User Interfaces, pp. 614-624. ACM, 2019.

D'Orazio, Vito, Marcus Deng, and Michael Shoemate. "TwoRavens for Event Data." In 2018 IEEE International Conference on Information Reuse and Integration (IRI), pp. 394-401. IEEE, 2018.

Honaker, James, and Vito D'Orazio. "Statistical Modeling by Gesture: A Graphical, Browser-based Statistical Interface for Data Repositories," in Extended Proceedings of ACM Hypertext, 2014.

# Team
TwoRavens is led by [James Honaker](http://hona.kr/), [Vito D'Orazio](http://vitodorazio.com), and [Raman Prasad](https://github.com/raprasad).

This project would not be possible without the excellent contributions of our research assistants: Kripanshu Bhargava, Rohit Bhattacharjee,  Marcus Deng, Sruti Jain, Aaron Lebo, Mital Modha, and Michael Shoemate.


