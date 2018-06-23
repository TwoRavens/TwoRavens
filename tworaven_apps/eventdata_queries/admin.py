from django.contrib import admin
from tworaven_apps.eventdata_queries.models import (EventDataSavedQuery, ArchiveQueryJob)
# Register your models here.

class EventDataSavedQueryAdmin(admin.ModelAdmin):
    list_display = ('id',
                    'name',
                    'description',
                    'username',
                    'query',
                    'result_count',
                    'created',
                    'modified',
                    'saved_to_dataverse',
                    'dataverse_url')




admin.site.register(EventDataSavedQuery, EventDataSavedQueryAdmin)


class ArchiveQueryJobAdmin(admin.ModelAdmin):
    list_display = ('what',
                    'saved_query',
                    'status',
                    'is_finished',
                    'is_success',
                    'message',
                    'created',
                    'modified')




admin.site.register(ArchiveQueryJob, ArchiveQueryJobAdmin)