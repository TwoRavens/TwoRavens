from django.contrib import admin

from django.contrib import admin
from tworaven_apps.workspaces.models import DataSourceType,\
    SavedWorkspace


class DataSourceTypeAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('name', 'description')
    list_display = ('name', 'is_active', 'description', 'source_link', 'modified', 'created',)
    list_filter= ('is_active',)
    readonly_fields = ('modified', 'created',
                       'source_link',)

admin.site.register(DataSourceType, DataSourceTypeAdmin)


class SavedWorkspaceAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('name', 'user')
    list_display = ('name', 'user', 'modified', 'created',)
    list_filter= ('data_source_type', 'is_anonymous', 'user',)
    readonly_fields = ('is_anonymous',
                       'modified', 'created',
                       'data_origin_json', 'workspace_json')

admin.site.register(SavedWorkspace, SavedWorkspaceAdmin)
