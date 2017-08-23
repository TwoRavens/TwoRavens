from django.contrib import admin
from tworaven_apps.rook_services.models import TestCallCapture

class TestCallCaptureAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('app_name',)
    list_display = ('app_name',  'success', 'modified', 'status_code',)
    list_filter= ('success', 'status_code',)
    readonly_fields = ('request_json', 'response_json', 'modified', 'created')
admin.site.register(TestCallCapture, TestCallCaptureAdmin)
