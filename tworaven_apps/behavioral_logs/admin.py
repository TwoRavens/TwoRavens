from django.contrib import admin

from tworaven_apps.behavioral_logs.models import BehavioralLogEntry


class BehavioralLogEntryAdmin(admin.ModelAdmin):
    save_on_top = True
    # search_fields = ('',)
    list_display = ('user',
                    'session_key',
                    'other',
                    'is_optional',
                    'feature_id',
                    'type',
                    'activity_l1',
                    'activity_l2',
                    'created',
                    )

    list_filter = ('is_optional',
                   'type',
                   'activity_l1',
                   'activity_l2')

    readonly_fields = ('modified', 'created')

admin.site.register(BehavioralLogEntry, BehavioralLogEntryAdmin)
