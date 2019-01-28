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
                    'app_domain',
                    'privacy_mode',
                    'rook_svc_url',
                    'd3m_svc_url',
                    'dataverse_url')
    readonly_fields = ('modified', 'created',)
admin.site.register(AppConfiguration, AppConfigurationAdmin)


class D3MConfigurationAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('name',)
    list_editable = ('is_default',)
    list_display = ('name',
                    'is_default',
                    'dataset_schema',
                    'problem_schema',
                    'd3m_input_dir',
                    'training_data_root',
                    'modified',
                    'created',)
    readonly_fields = ('slug', 'modified', 'created',
                       'are_paths_valid',
                       'get_bad_paths_for_admin')
admin.site.register(D3MConfiguration, D3MConfigurationAdmin)
