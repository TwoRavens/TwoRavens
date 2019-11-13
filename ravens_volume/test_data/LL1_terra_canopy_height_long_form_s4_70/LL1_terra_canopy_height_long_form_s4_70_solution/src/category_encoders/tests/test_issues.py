import unittest
import pandas as pd
import category_encoders as ce
import numpy as np

__author__ = 'willmcginnis'


class TestIssues(unittest.TestCase):
    """
    """

    def test_dist(self):
        data = np.array([
            ['apple', None],
            ['peach', 'lemon']
        ])
        encoder = ce.OrdinalEncoder(impute_missing=True)
        encoder.fit(data)
        a = encoder.transform(data)
        print(a)
        self.assertEqual(a.values[0, 1], 0)
        self.assertEqual(a.values[1, 1], 1)

        encoder = ce.OrdinalEncoder(impute_missing=False)
        encoder.fit(data)
        a = encoder.transform(data)
        self.assertTrue(np.isnan(a.values[0, 1]))
        self.assertEqual(a.values[1, 1], 1)

    def test_bin(self):
        data = np.array(['a', 'ba', 'ba'])
        out = ce.BinaryEncoder().fit_transform(data)

        print(out)