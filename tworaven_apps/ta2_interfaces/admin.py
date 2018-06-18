from django.contrib import admin

from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)

class StoredRequestAdmin(admin.ModelAdmin):
    save_on_top = True
    list_display = ('name',
                    'request_type',
                    'is_finished',
                    'status',
                    'user',
                    'workspace',
                    'created',
                    'modified')
    list_filter = ('is_finished', 'status')
    readonly_fields = ('request',
                       'hash',
                       'modified',
                       'created')
admin.site.register(StoredRequest, StoredRequestAdmin)


class StoredResponseAdmin(admin.ModelAdmin):
    save_on_top = True
    list_display = ('stored_request',
                    'status',
                    'is_success',
                    'sent_to_user',
                    'created',
                    'modified')
    list_filter = ('is_success', 'sent_to_user', 'status')
    readonly_fields = ('response',
                       'hash',
                       'modified',
                       'created')
admin.site.register(StoredResponse, StoredResponseAdmin)
