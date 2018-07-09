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
                    'dataverse_url',
                    'dataset',
                    'dataset_type')

    save_on_top = True
    readonly_fields = ('modified', 'created')
    list_filter = ('saved_to_dataverse',)


admin.site.register(EventDataSavedQuery, EventDataSavedQueryAdmin)


class ArchiveQueryJobAdmin(admin.ModelAdmin):
    list_display = ('datafile_id',
                    'saved_query',
                    'status',
                    'is_finished',
                    'is_success',
                    'message',
                    'created',
                    'modified',
                    'dataverse_response',
                    'archive_url')

    save_on_top = True
    readonly_fields = ('saved_query', 'modified', 'created')
    list_filter = ('is_finished', 'is_success')


admin.site.register(ArchiveQueryJob, ArchiveQueryJobAdmin)

