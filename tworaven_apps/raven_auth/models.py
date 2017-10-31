from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """New user class to hold extra attributes in the future"""
    pass
