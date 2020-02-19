from django.conf.urls import url
from tworaven_apps.image_utils import views

urlpatterns = (

    # Create new log entry
    #
    url(r'^markup-image$',
        views.view_markup_image,
        name='view_markup_image'),
)
