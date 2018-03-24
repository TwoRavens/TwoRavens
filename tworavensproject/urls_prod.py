from django.conf.urls import url, include
from django.contrib import admin

admin.site.site_header = 'TwoRavens Administration'
admin.site.index_title = ('TwoRavens Admin')
admin.site.site_title = ('TwoRavens Admin page')

urlpatterns = [
    url(r'^admin/', admin.site.urls),

    url(r'^auth/', include('tworaven_apps.raven_auth.urls')),

    url(r'^workspaces/', include('tworaven_apps.workspaces.urls')),

    url(r'^rook-custom/', include('tworaven_apps.rook_services.urls')),

    url(r'^config/', include('tworaven_apps.configurations.urls')),

    url(r'^d3m-service/', include('tworaven_apps.ta2_interfaces.urls')),

    url(r'^api/', include('tworaven_apps.api_docs.urls')),

    url(r'^ta3-search/', include('tworaven_apps.ta3_search.urls')),

    # for testing
    #url(r'^data/', include('tworaven_apps.test_data.urls')),

    url(r'^', include('tworaven_apps.content_pages.urls')),
]
