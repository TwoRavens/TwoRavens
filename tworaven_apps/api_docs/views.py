from django.shortcuts import render
from django.conf import settings


# Create your views here.
def view_swagger_spec(request):
    """View swagger spec"""

    info_dict = dict(SWAGGER_SCHEME=settings.SWAGGER_SCHEME,
                     SWAGGER_HOST=settings.SWAGGER_HOST)

    return render(request,
                  'swagger_spec.yaml',
                  info_dict)
