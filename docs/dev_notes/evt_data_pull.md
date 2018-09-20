
- ref: http://jasonrudolph.com/blog/2009/02/25/git-tip-how-to-merge-specific-files-from-another-branch

```
X - fabfile.py
X - startup_script/event_data_start.sh

X - setup/nginx/Dockerfile-eventdata
X - setup/nginx/nginx-eventdata-k8s.conf

X - tworavensproject/settings/base.py
X - tworavensproject/settings/event_data_gce.py
X - tworavensproject/settings/local_settings.py

X - tworavensproject/urls.py
X - tworaven_apps/raven_auth/urls.py
```

git checkout develop
git branch
git checkout EventData_generalization (file 1) (file 2), etc
git status
