from django.contrib import admin

from tworaven_apps.ta2_interfaces.models import StoredResponseTest


class StoredResponseTestAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('name',)
    list_display = ('name', 'created', 'modified', 'resp')
    readonly_fields = ('modified', 'created',)
admin.site.register(StoredResponseTest, StoredResponseTestAdmin)

# Register your models here.
