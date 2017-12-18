"""Django admin spec for the MessageListener"""
from django.contrib import admin
from tworaven_apps.ta3_search.models import MessageListener

class MessageListenerAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('name',)
    list_filter = ('is_active',)
    list_display = ('name',
                    'web_url',
                    'is_active',
                    'modified',
                    'created')
    readonly_fields = ('modified', 'created',)
admin.site.register(MessageListener, MessageListenerAdmin)
