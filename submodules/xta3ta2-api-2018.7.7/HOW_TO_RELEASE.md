# How to release a new version

*A cheat sheet.*

* Make sure all issues and merge requests for a to-be-released version are closed
  or retriaged to a different milestone.
* On `devel` branch:
  * `git pull` to make sure everything is in sync with remote origin.
  * Change a version (`protocol_version`) in `core.proto` to a version without `_pre`.
  * Change `vNEXT` in `HISTORY.md` to the to-be-released version, with `v` prefix.
  * Commit with message `Bumping version for release.`
  * `git push`
  * Wait for CI to run tests successfully.
* On `master` branch:
  * `git pull` to make sure everything is in sync with remote origin.
  * Merge `devel` into `master` branch: `git merge devel`
  * `git push`
  * Wait for CI to run tests successfully.
  * Tag with version prefixed with `v`, e.g., for version `2017.9.20`: `git tag v2017.9.20`
  * `git push` & `git push --tags`
* On `devel` branch:
  * `git merge master` to make sure `devel` is always on top of `master`.
  * Change a version (`protocol_version`) in `core.proto` to the next day (or next known release date) and append `_pre`.
  * Add a new empty `vNEXT` version on top of `HISTORY.md`.
  * Commit with message `Version bump for development.`
  * `git push`
* Close a milestone for the just released version.
* Create a milestone for the next version (same as used in `core.proto`) if none
  yet exists.

If there is a need for a patch version to fix a released version on the same day,
use `_postX` prefix, like `2017.9.20_post0`. If more than a day has passed, just
use the new day's version.
