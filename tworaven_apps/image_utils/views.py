from django.shortcuts import render

# Create your views here.

def view_markup_image(request):
    """Process POST request to markup an image
    return: url to the new image that may b
    """
    if not request.POST:
        raise Http404('')
