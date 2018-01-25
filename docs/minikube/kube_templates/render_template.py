"""
Render k8s templates from NIST format
"""
import sys
from os.path import abspath, dirname, join, normpath, isdir, isfile
from jinja2 import (Template,
                    Environment,
                    BaseLoader,
                    PackageLoader,
                    select_autoescape)

CURRENT_DIR = dirname(abspath(__file__))
# adding this path for the PackageLoader
sys.path.append(dirname(CURRENT_DIR))

#TEMPLATES_DIR = join(CURRENT_DIR, 'templates')
OUTPUT_DIR = join(CURRENT_DIR, 'output')

class TemplateRenderHelper(object):

    def __init__(self, template_dict, template_name, rendered_filename, **kwargs):
        """execute main method"""
        self.jinja_env = Environment(\
            loader=PackageLoader('kube_templates', 'templates'),
            autoescape=select_autoescape(['html', 'xml']))

        self.for_minikube = kwargs.get('for_minikube', False)

        self.render_template(template_dict,
                             template_name,
                             rendered_filename)


    def render_template(self, template_dict, template_name, rendered_filename):
        """Make a simple template and write it to the otuput directory"""
        assert template_dict, 'template_dict cannot be None'

        template = self.jinja_env.get_template(template_name)

        # create content
        #
        content = template.render(template_dict)

        if self.for_minikube:
            content = self.format_for_dev(content)

        # write file out
        #
        rendered_filepath = join(OUTPUT_DIR, rendered_filename)
        open(rendered_filepath, 'w').write(content)
        print('-' * 40)
        print('template written: %s' % rendered_filepath)
        print('-' * 40)


    def format_for_dev(self, content):
        """format for dev"""

        replace_strings = \
            {'registry.datadrivendiscovery.org/j18_ta3eval/tworavens/': '',
             'persistentVolumeClaim': 'hostPath',
             'claimName: pvc-datasets': 'path: /tmp',
             'claimName: pvc-rw': 'path: /tmp',
             'imagePullPolicy: Always': 'imagePullPolicy: Never'}

        for old_str, new_str in replace_strings.items():
            content = content.replace(old_str, new_str)

        dev_template = Environment(loader=BaseLoader()).from_string(content)

        dev_dict = dict(path_to_outputs='tmp',
                        path_to_dataroot='tmp',
                        eval_id='ravens',
                        command='',
                        command_args='')

        updated_content = dev_template.render(dev_dict)

        return updated_content

if __name__ == '__main__':

    tmpl_info_nist = dict(\
         eval_id='{{ eval_id }}',
         registry_prefix='registry.datadrivendiscovery.org/j18_ta3eval/tworavens/',
         path_to_dataroot='{{ path_to_dataroot }}',
         path_to_outputs='{{ path_to_outputs }}',
         command='{{ command }}',
         command_args='{{ command_args }}')


    #template_name = 'nist-orig-template.yml'
    #template_name = 'ravens-template-02.yml'

    #template_name = 'ravens-ta2test-01.yml'
    #output_file = 'tworavens_ta3ta2_test_pod.yml'

    template_name = 'ravens-nist-02.yml'
    output_file = 'tworavens_ta3_pod.yml'

    trh = TemplateRenderHelper(tmpl_info_nist,
                               template_name,
                               output_file,
                               for_minikube=False)
