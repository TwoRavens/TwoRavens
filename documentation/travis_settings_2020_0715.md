# Variables set on Travis for Builds

- site: https://travis-ci.com/github/TwoRavens/TwoRavens/settings

## Variables

- name: DJANGO_SETTINGS_MODULE
  - value: tworavensproject.settings.local_settings
- name: DOCKER_PASSWORD
  - value: (hidden)
- name: DOCKER_USERNAME
  - value: (hidden)
- name: IS_TRAVIS_BUILD
  - value: True
- name: RAVENS_VOLUME_DIR
  - value: ./ravens_volume
