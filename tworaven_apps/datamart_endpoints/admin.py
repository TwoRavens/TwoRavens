from django.contrib import admin
from tworaven_apps.datamart_endpoints.models import DatamartInfo

class DatamartInfoAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('name', 'display_name')
    list_editable = ('is_active',)
    list_display = ('name',
                    'is_active',
                    'display_name',
                    'url',
                    'modified',)
    readonly_fields = ('modified', 'created',)
admin.site.register(DatamartInfo, DatamartInfoAdmin)
