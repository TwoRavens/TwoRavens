from django.contrib import admin

from tworaven_apps.ta2_interfaces.models import \
    (StoredRequest, StoredResponse)

class StoredResponseAdminInline(admin.TabularInline):
    model = StoredResponse
    #fk_name = "orig_metadata"
    #exclude = ('response',)
    search_fields = ['hash_id']

    readonly_fields = ('status', 'is_success',
                       'sent_to_user', 'hash_id',
                       'response',
                       'response_as_json',
                       'created', 'modified', )
    fields = ('status',
              'sent_to_user',
              'response_as_json')
    extra = 0
    can_delete = True
    show_change_link = True



class StoredRequestAdmin(admin.ModelAdmin):
    save_on_top = True
    inlines = (StoredResponseAdminInline,)
    search_fields = ['hash_id']

    list_display = ('name',
                    'request_type',
                    'is_finished',
                    'status',
                    'user',
                    'workspace',
                    'created',
                    'modified')

    list_filter = ('is_finished',
                   'status',
                   'request_type')
    readonly_fields = ('request',
                       'request_as_json',
                       'request_type',
                       'hash_id',
                       'modified',
                       'created')
    fields = ('name',
              'request_type',
              'is_finished',
              'status',
              'user',
              'hash_id',
              'workspace',
              'request',
              'request_as_json',
              'user_message',
              ('created', 'modified'),)

admin.site.register(StoredRequest, StoredRequestAdmin)


class StoredResponseAdmin(admin.ModelAdmin):
    save_on_top = True
    list_display = ('stored_request',
                    'status',
                    'is_success',
                    'sent_to_user',
                    'created',
                    'modified')
    list_filter = ('is_success',
                   'sent_to_user',
                   'status',
                   'stored_request__request_type')
    readonly_fields = ('response',
                       'response_as_json',
                       'stored_request',
                       'hash_id',
                       'link_to_request',
                       'modified',
                       'created')
    fields = ('stored_request',
              'link_to_request',
              'status',
              ('is_success', 'sent_to_user'),
              'response',
              'response_as_json',
              'hash_id',
              ('modified', 'created'))
admin.site.register(StoredResponse, StoredResponseAdmin)

"""
from tworaven_apps.ta2_interfaces.models import (StoredRequest, StoredResponse)
sr = StoredRequest.objects.get(pk=18)
sr.as_dict()
"""
