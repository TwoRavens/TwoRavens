from collections import OrderedDict

from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """New user class to hold extra attributes in the future"""

    def as_json(self):
        """return python dict for use as JSON"""
        od = OrderedDict()

        params = ['id', 'username',
                  'email'
                  'first_name', 'last_name',
                  'is_active', 'is_staff', 'is_superuser'
                  'last_login', 'date_joined']
        for param in params:
            od[param] = self.__dict__.get(param)

        return od
