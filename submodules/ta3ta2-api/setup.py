import os
import sys
from setuptools import setup, find_packages

PACKAGE_NAME = 'ta3ta2_api'
MINIMUM_PYTHON_VERSION = 3, 6


def check_python_version():
    """Exit when the Python version is too low."""
    if sys.version_info < MINIMUM_PYTHON_VERSION:
        sys.exit("Python {}.{}+ is required.".format(*MINIMUM_PYTHON_VERSION))


def read_package_variable(key):
    """Read the value of a variable from the package without importing."""
    module_path = os.path.join(PACKAGE_NAME, '__init__.py')
    with open(module_path) as module:
        for line in module:
            parts = line.strip().split(' ')
            if parts and parts[0] == key:
                return parts[-1].strip("'")
    raise KeyError("'{0}' not found in '{1}'".format(key, module_path))


check_python_version()
version = read_package_variable('__version__')

setup(
    name=PACKAGE_NAME,
    version=version,
    description='GRPC protocol for the TA3-TA2 communication API.',
    author='DARPA D3M Program',
    packages=find_packages(exclude=['contrib', 'docs', 'tests*']),
    install_requires=[
        'd3m==2019.2.18',
        'grpcio',
        'grpcio-tools',
    ],
    url='https://gitlab.com/datadrivendiscovery/ta3ta2-api',
    dependency_links=[
        'git+https://gitlab.com/datadrivendiscovery/d3m.git@devel#egg=d3m-devel',
    ],
)
