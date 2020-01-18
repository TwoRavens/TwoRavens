## Some commands for updating system dependencies:

1. Make sure to do this within the virtualenv:
    ```
    workon 2ravens
    ```
2. Various update commands:
```
pip install -r requirements/dev.txt
python manage.py migrate
npm install
git pull --recurse-submodules
```
