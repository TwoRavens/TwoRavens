from django.contrib import admin
from tworaven_apps.configurations.models import AppConfiguration
from tworaven_apps.configurations.models_d3m import D3MConfiguration

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
                    'd3m_url',
                    'dataverse_url')
    readonly_fields = ('modified', 'created')
admin.site.register(AppConfiguration, AppConfigurationAdmin)


class D3MConfigurationAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('name',)
    list_editable = ('is_default',)
    list_display = ('name',
                    'is_default',
                    'dataset_schema',
                    'problem_schema',
                    'training_data_root',
                    'modified',
                    'created',)
    readonly_fields = ('slug', 'modified', 'created')
admin.site.register(D3MConfiguration, D3MConfigurationAdmin)
