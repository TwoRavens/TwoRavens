from django.shortcuts import render

def view_swagger_doc_v1(request):
  """Return a yaml doc for use in swagger UI"""

  info_dict = dict()

  return render(request,
                'swagger_v1.yaml',
                info_dict,
                content_type='text/yaml')
