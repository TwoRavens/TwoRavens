# Submodules

This directory is used for incorporating other git repositories.

These repos are incorporated in two ways:

1. **git submodules**: e.g. pointers to other github repositories.
  - ref: https://git-scm.com/book/en/v2/Git-Tools-Submodules
1. copying in the repository manually
  - This is in the case for a required repository that is behind a password--though not private in a licensing sense

## Submodule Log

**6/11/2018**

- Add repository [raven-metadata-service](https://github.com/TwoRavens/raven-metadata-service)
  - **version**: master
  - **method of inclusion**
    - `git submodule add https://github.com/TwoRavens/raven-metadata-service.git`
    - 
- Add repository: [ta3ta2-api](https://gitlab.com/datadrivendiscovery/ta3ta2-api)
  - **version**: v2018.6.2  
  - **method of inclusion**
    - downloaded version manually--it's in a private gitlab
    - adding it to the `sys.path` in `settings/base.py`
    - ran `fab compile_ta3ta2_api`
    - checked it in
