# Contributing to the TA3-TA2 API

## Change proposals

Suggested changes to the API can be made in one of two ways:

1.  By logging issues against the repository.
2.  Through merge requests.

Discussion of high level changes can be raised with the group and commented on using GitLab's issue tracking system.
Concrete changes can be proposed by modifying code and submitting a merge request for review.
Merge requests should be marked `WIP` in their title if they are being actively updated, with the tag being removed when the code is ready for final review.
All merge requests have to be against a `devel` branch.
Merge requests should include also an entry to `HISTORY.md` with a summary of a change.

## Core vs. extensions

There are two classes of API defined in the system - *core*, defined in `core.proto`, and *extensions*, such as `data_ext.proto`, which are stored in separate files.  All TA2 systems must implement the core API, while extensions are considered optional.

## Style

1. All changes to the `.proto` files should follow Google's [Protobuf Style Guide](https://developers.google.com/protocol-buffers/docs/style).
1. Indentation should be 4 spaces.
1. Proto file names should use `snake_case`, with extensions ending in `_ext`.  Example: `dataflow_ext.proto` 
