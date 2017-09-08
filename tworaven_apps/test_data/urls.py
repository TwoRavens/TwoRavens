from django.conf.urls import url
from tworaven_apps.test_data import views

urlpatterns = (

    # json/xml/csv/tsv
    url(r'^(?P<input_file_name>(\w|\-){5,75}\.(json|xml|csv|tsv))$',
        views.view_test_data,
        name='view_test_data'),

    url(r'^',
        views.view_test_data,
        name='view_test_data2'),

    url(r'^(?P<input_file_name>preprocessSubset(\w|\-){5,65}\.(txt))$',
        views.view_test_data,
        name='view_preprocess_data'),

)
