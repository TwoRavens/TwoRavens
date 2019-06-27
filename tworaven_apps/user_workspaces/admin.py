from django.contrib import admin
from tworaven_apps.user_workspaces.models import \
    (UserWorkspace,)


class UserWorkspaceAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('user__username', 'name',)
    list_display = ('user', 'name', 'is_current_workspace',
                    'is_public', 'is_active',
                    'd3m_config',
                    'modified', 'created')
    list_filter = ('is_active', 'is_public', 'user', 'd3m_config')
    readonly_fields = ('modified', 'created',)

admin.site.register(UserWorkspace, UserWorkspaceAdmin)
