from collections import OrderedDict
from unittest import skip
from django.test import TestCase

from tworaven_apps.utils.msg_helper import msgt
from tworaven_apps.utils.dict_helper import \
    (clear_dict,)

class DictHelperTest(TestCase):

    def test_010_clear_dict(self):
        """(10) Clear dict of empty values"""
        msgt(self.test_010_clear_dict.__doc__)

        d = dict(about=[],
                 keywords=['hello'],
                 juice=dict(h=1),
                 hello=dict(),
                 noray=[],
                 no_lists=[[[[]]]],
                 keep_list=[[[[]]], '2'],
                 mdict=dict(a=dict(b=dict(c=dict()))),
                 melon=dict(a=dict(b=4)))

        clear_dict(d)

        new_dict = {'keywords': ['hello'],
                    'juice': {'h': 1},
                    'keep_list': [[[[]]], '2'],
                    'melon': {'a': {'b': 4}}}

        self.assertEqual(d, new_dict)

        # Trigger assertion error
        #
        d2 = 'some string'
        try:
            clear_dict(d2)
            self.assertTrue(False)  # shouldn't reach this line
        except AssertionError as err_obj:
            pass

        # Try an empty dict
        #
        d3 = {}
        clear_dict(d3)
        self.assertEqual(d3, {})


        # Some other dict
        #
        d4 = {'dataset': OrderedDict([('about', ''), ('keywords', ['taxi']), ('name', [''])])}
        clear_dict(d4)
        #print('d4', d4)
        self.assertEqual(d4, {'dataset': OrderedDict([('keywords', ['taxi'])])})
