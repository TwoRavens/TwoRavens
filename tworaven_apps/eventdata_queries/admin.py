from django.contrib import admin
from tworaven_apps.eventdata_queries.models import \
    (EventDataSavedQuery,
     ArchiveQueryJob,
     UserNotification, MongoDataset)


class EventDataSavedQueryAdmin(admin.ModelAdmin):
    list_display = ('id',
                    'name',
                    'user',
                    'description',
                    'result_count',
                    'collection_type',
                    'collection_name',
                    'save_to_dataverse',
                    'created',
                    'modified',)

    list_filter = ('collection_type',
                   'collection_name',
                   'user')
    save_on_top = True
    readonly_fields = ('collection_type', 'modified', 'created')


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

class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient',
                    'unread',
                    'message',
                    'archived_query',
                    'created',
                    'modified')

    save_on_top = True
    readonly_fields = ('created', 'modified')


admin.site.register(UserNotification, UserNotificationAdmin)


class MongoDatasetAdmin(admin.ModelAdmin):
    list_display = ('created',
                    'name',
                    'loading')

    save_on_top = True


admin.site.register(MongoDataset, MongoDatasetAdmin)