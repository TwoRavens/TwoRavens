from collections import OrderedDict

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.serializers.json import json, DjangoJSONEncoder


class User(AbstractUser):
    """New user class to hold extra attributes in the future"""
    FIELDS_TO_SERIALIZE = ['id', 'username',
                           'email',
                           'first_name', 'last_name',
                           'is_active', 'is_staff', 'is_superuser'
                           'last_login', 'date_joined']

    def as_json(self, pretty=False):
        """Return as a JSON string"""
        if pretty:
            return self.as_dict(as_json_pretty=True)
        return self.as_dict(as_json=True)

    def as_dict(self, **kwargs):
        """Return as an OrderedDict"""
        as_json = kwargs.get('as_json', False)
        as_json_pretty = kwargs.get('as_json_pretty', False)

        od = OrderedDict()

        for param in self.FIELDS_TO_SERIALIZE:
            od[param] = self.__dict__.get(param)

        if as_json:
            return json.dumps(od, cls=DjangoJSONEncoder)
        elif as_json_pretty:
            return json.dumps(od, cls=DjangoJSONEncoder, indent=4)

        return od
