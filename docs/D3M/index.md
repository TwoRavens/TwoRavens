TwoRavens D3M Interface
=======================

Generally, our TwoRavens D3M Interface consists of two main components: Front-end and Back-end. Each contains several web applications.
This documentation provides a simple yet complete tutorial for the user and a detailed API introduction for the programmer.
Our TwoRavens D3M interface is built upon Django and we assume the user know the basic of Django, please refer to [Django](https://www.djangoproject.com/) for more information about this framework.

# Table of Contents
* Tutorial and User Guide
    * [External Link](http://2ra.vn/papers/tworavens-d3mguide.pdf)
* API Documentation (Web Application)
    * [Overview](api_docs/overview.md)
    * [Content_pages](api_docs/content_pages/index.md)
    * [D3M Configuration](api_docs/configuration/index.md)
    * [TA2 Interface](api_docs/ta2/index.md)
    * [Datamart](api_docs/datamart/index.md)

# Additional Resource

Please noted that this is a TA3 interface. Please refer to this [Gitlab](https://gitlab.com/datadrivendiscovery/ta3ta2-api) for more information about the API of TA2 and the json schema we used for communication.

Component Architecture
=======================

![alt text](imgs/components.png "Component architecture")

Above is the architecture of our D3M Interface. The function of each component is listed below:

* **Front-end**
    * **Content Pages** : Render the web page presented to user;
    * **User Workspace** : Render the user workspace in each web page;
* **Back-end**
    * **D3M Configuration** : (*Core Component*) Contains all the information of a D3M task;
    * **TA2 Interface** : (*Core Component*) Handle the communication with remote TA2 Server;
    * **Datamart** : (*Core Component*) Handle the communication with remote data repo and provide dataset filtering;
    * **Auth** : Handles the user login/logout procedure;
    * **Admin**: Default application provided by Django framework, provides an user-friendly control panel for the webpage;
