"""
Render k8s templates from NIST format
"""
import sys
from os.path import abspath, dirname, join, normpath, isdir, isfile
from jinja2 import (Template,
                    Environment,
                    PackageLoader,
                    select_autoescape)

CURRENT_DIR = dirname(abspath(__file__))
# adding this path for the PackageLoader
sys.path.append(dirname(CURRENT_DIR))

#TEMPLATES_DIR = join(CURRENT_DIR, 'templates')
OUTPUT_DIR = join(CURRENT_DIR, 'output')

class TemplateRenderHelper(object):

    def __init__(self, template_dict, template_name, rendered_filename):
        """execute main method"""
        self.jinja_env = Environment(\
            loader=PackageLoader('kube_templates', 'templates'),
            autoescape=select_autoescape(['html', 'xml']))


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

        # write file out
        #
        rendered_filepath = join(OUTPUT_DIR, rendered_filename)
        open(rendered_filepath, 'w').write(content)
        print('-' * 40)
        print('template written: %s' % rendered_filepath)
        print('-' * 40)


if __name__ == '__main__':

    tmpl_info = dict(eval_id='ravens',
                     #path_to_dataroot='{{ path_to_dataroot }}',
                     #path_to_outputs='{{ path_to_outputs }}',
                     path_to_dataroot='path_to_dataroot',
                     path_to_outputs='path_to_outputs',
                     command='ta3_search',
                     command_args='command_args')

    #template_name = 'nist-orig-template.yml'
    #template_name = 'ravens-template-02.yml'

    #template_name = 'ravens-ta2test-01.yml'
    #output_file = 'tworavens_ta3ta2_test_pod.yml'

    template_name = 'ravens-nist-02.yml'
    output_file = 'tworavens_ta3_pod.yml'

    trh = TemplateRenderHelper(tmpl_info,
                               template_name,
                               output_file)
