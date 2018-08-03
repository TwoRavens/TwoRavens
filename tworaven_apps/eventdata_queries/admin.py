from django.contrib import admin
from tworaven_apps.eventdata_queries.models import (EventDataSavedQuery, ArchiveQueryJob, UserNotificationModel)
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
                    'collection_type',
                    'collection_name',
                    'save_to_dataverse')

    save_on_top = True
    readonly_fields = ('modified', 'created')


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


class UserNotificationModelAdmin(admin.ModelAdmin):
        list_display = ('user',
                        'message',
                        'archived_query',
                        'created',
                        'modified',
                        'read'
                        )

        save_on_top = True
        readonly_fields = ('created','modified')


admin.site.register(UserNotificationModel, UserNotificationModelAdmin)

