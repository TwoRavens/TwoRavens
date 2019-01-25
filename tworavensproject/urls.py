from django.conf.urls import url, include
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static

admin.site.site_header = 'TwoRavens Administration'
admin.site.index_title = ('TwoRavens Admin')
admin.site.site_title = ('TwoRavens Admin page')

urlpatterns = [
    url(r'^admin/', admin.site.urls),

    url(r'^auth/', include('tworaven_apps.raven_auth.urls')),

    url(r'^workspaces/', include('tworaven_apps.workspaces.urls')),

    url(r'^rook-custom/', include('tworaven_apps.rook_services.urls')),

    url(r'^config/', include('tworaven_apps.configurations.urls')),

    url(r'^eventdata/', include('tworaven_apps.eventdata_queries.urls')),

    url(r'^d3m-service/', include('tworaven_apps.ta2_interfaces.urls')),

    url(r'^ws-views/', include('tworaven_apps.websocket_views.urls')),

    url(r'^datamart/', include('tworaven_common_apps.datamart_endpoints.urls')),

    #url(r'^data/', include('tworaven_apps.test_data.urls')),

    #url(r'^ravens_volume/', include('tworaven_apps.test_data.urls')),

    url(r'^api/', include('tworaven_apps.api_docs.urls')),

    # social auth
    #
    url('oauth/', include('social_django.urls', namespace='social')),

    url(r'^', include('tworaven_apps.content_pages.urls')),

]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL,
                          #document_root=settings.STATIC_ROOT)
                          document_root=settings.TEST_DIRECT_STATIC)


"""
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
"""
