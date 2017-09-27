from django.contrib import admin
from tworaven_apps.call_captures.models import ServiceCallEntry

class ServiceCallEntryAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('call_type',)
    list_display = ('service_type',
                    'call_type',
                    'success',
                    'modified',
                    'status_code',
                    'session_id')
    list_filter = ('service_type',
                   'success',
                   'status_code',
                   'session_id')
    readonly_fields = ('request_msg_json', 'response_msg_json', 'modified', 'created')
admin.site.register(ServiceCallEntry, ServiceCallEntryAdmin)
