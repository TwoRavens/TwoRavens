from django.shortcuts import render
from django.conf import settings
from django.views.decorators.cache import cache_page

@cache_page(settings.PAGE_CACHE_TIME)
def view_swagger_doc_v1(request):
  """Return a yaml doc for use in swagger UI"""

  info_dict = dict(SWAGGER_HOST=settings.SWAGGER_HOST)

  return render(request,
                'swagger/swagger_v1.yaml',
                info_dict,
                content_type='text/yaml')
