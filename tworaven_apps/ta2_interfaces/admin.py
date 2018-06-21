from django.contrib import admin

from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)

class StoredResponseAdminInline(admin.TabularInline):
    model = StoredResponse
    #fk_name = "orig_metadata"
    #exclude = ('response',)
    readonly_fields = ('status', 'is_success',
                       'sent_to_user', 'hash_id',
                       #'response',
                       'created', 'modified', )
    extra = 0
    can_delete = True
    show_change_link = True



class StoredRequestAdmin(admin.ModelAdmin):
    save_on_top = True
    inlines = (StoredResponseAdminInline,)
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
                       'hash_id',
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
                       'hash_id',
                       'modified',
                       'created')
admin.site.register(StoredResponse, StoredResponseAdmin)

"""
from tworaven_apps.ta2_interfaces.models import (StoredRequest, StoredResponse)
sr = StoredRequest.objects.get(pk=18)
sr.as_dict()
"""
