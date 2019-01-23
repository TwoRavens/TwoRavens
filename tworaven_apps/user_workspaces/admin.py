from django.contrib import admin

from django.contrib import admin
from tworaven_apps.user_workspaces.models import \
    (UserWorkspace, PreprocessInfo)


class UserWorkspaceAdmin(admin.ModelAdmin):
    save_on_top = True
    search_fields = ('user__username', 'problem')
    list_display = ('user', 'is_active', 'problem', 'modified', 'created',)
    list_filter= ('is_active',)
    readonly_fields = ('modified', 'created',)

admin.site.register(UserWorkspace, UserWorkspaceAdmin)


class PreprocessInfoAdmin(admin.ModelAdmin):
    save_on_top = True
    #search_fields = ('workspace', 'is_sucess', 'note')
    list_display = ('workspace', 'is_success', 'note',)
    list_filter= ('is_success',)
    readonly_fields = ('modified', 'created',)

admin.site.register(PreprocessInfo, PreprocessInfoAdmin)
