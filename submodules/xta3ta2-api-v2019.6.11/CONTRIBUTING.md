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

Feedback from users of the API on ideas and code is very valuable. 
Voting on issues and merge requests is the simplest form of feedback, and quite useful. 
A vote for an issue is interpretted to mean support for the proposed direction or change.  
A vote for a merge request is interpretted to mean a sign off on the code implementation as ready and appropriate for merging.

## Core vs. extensions

There are two classes of API defined in the system - *core*, defined in `core.proto`, and *extensions*, with names such as `myaddition_ext.proto`, which are stored in separate files.  

Things that do not have broad anticipated use, or are presently very experimental and likely will have numerous breaking changes, should be set up and developed as extensions whenever possible.

All TA2 systems must implement the core API, while extensions are considered optional.  
However, the core API generally enables more functionality than is required of performers.  
Statements describing *baseline functionality* can be found in the code comments for each call in each API version release.  
These describe which portions of core are required to be supported by all performers; functionality beyond this is available to performers to explore, develop against, and experiment with in pairings, but might not be implemented by any specific system.
Baseline functionality generally grows with each version release, as discussed by performers in this repository and the TA2TA3 API working group.

## Core philosophy

_The underlying goal of the core should be to allow everyone to pursue their own research trajectories, without imposing undue burdens on others._

The balance between freedom to add desired features to the core, and imposing burden on other systems can be a difficult compromise and typically includes considerations such as:
* how much work is required to support a feature,
* how much the feature forces or constrains internal design on the API or other TA systems,
* the ease with which performers can opt out (e.g. not support a value type), so as to support gradual implementation and accomodate different performer priorities,
* how many systems presently could foresee using such a feature,
* the existence or lack of alternative approaches to achieve the same desired functionality,
* work balance between TA2 and TA3 systems for adoption,
* as well as whether a feature is judged feasible.

Due to the nature of research, these opinions can change over time, so feel free to revisit proposed functionality changes over time if an unmet need persists.

## Style

1. All changes to the `.proto` files should follow Google's [Protobuf Style Guide](https://developers.google.com/protocol-buffers/docs/style).
1. Indentation should be 4 spaces.
1. Proto file names should use `snake_case`, with extensions ending in `_ext`.  Example: `dataflow_ext.proto` 
