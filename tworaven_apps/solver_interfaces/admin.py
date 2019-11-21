from django.contrib import admin
from tworaven_apps.solver_interfaces.models import StatisticalModel


class StatisticalModelAdmin(admin.ModelAdmin):
    list_display = ('model_id',
                    'created_on',
                    'user')

    save_on_top = True


admin.site.register(StatisticalModel, StatisticalModelAdmin)
