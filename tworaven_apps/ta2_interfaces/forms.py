from django import forms


PROBLEM_REQ_FILENAME = 'filename'
PROBLEM_REQ_DATA = 'data'

class SaveProblemForm(forms.Form):
    """Test gRPC requests, as originating from the UI"""

    filename = forms.CharField(help_text='do NOT include the directory name')

    data = forms.CharField(widget=forms.Textarea,
                           initial='',
                           help_text="Enter data to save")
