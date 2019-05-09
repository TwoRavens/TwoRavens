from django.contrib import admin
from tworaven_apps.user_workspaces.models import \
    (UserWorkspace,)


class UserWorkspaceAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('user__username', 'orig_dataset_id')
    list_display = ('user', 'is_current_workspace', 'is_active', 'd3m_config',
                    'orig_dataset_id', 'modified', 'created')
    list_filter = ('is_active', 'user', 'd3m_config')
    readonly_fields = ('modified', 'created',)

admin.site.register(UserWorkspace, UserWorkspaceAdmin)
