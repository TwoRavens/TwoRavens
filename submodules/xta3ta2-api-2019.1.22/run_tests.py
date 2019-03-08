#!/usr/bin/env python3

import os.path
import sys
import unittest

TEST_PRIMITIVES_DIR = os.path.join(os.path.dirname(__file__), 'tests', 'data', 'primitives')

sys.path.insert(0, TEST_PRIMITIVES_DIR)

runner = unittest.TextTestRunner(verbosity=1)

tests = unittest.TestLoader().discover('tests')

if not runner.run(tests).wasSuccessful():
    sys.exit(1)
