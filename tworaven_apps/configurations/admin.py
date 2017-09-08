from django.contrib import admin
from tworaven_apps.configurations.models import AppConfiguration

class AppConfigurationAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('name',)
    list_editable = ('is_active',)
    list_display = ('name',
                    'is_active',
                    'production',
                    'd3m_mode',
                    'privacy_mode',
                    'rook_app_url',
                    'dataverse_url')
    readonly_fields = ('modified', 'created')
admin.site.register(AppConfiguration, AppConfigurationAdmin)
