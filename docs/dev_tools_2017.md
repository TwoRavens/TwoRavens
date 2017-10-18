# Tools for TwoRavens Development

At the TwoRavens project grows in regard to functionality, complexity, number of developers, and the broad range of deliverables (both grant related and strategic), developer workflow becomes more important.

As demonstrated in previous TwoRavens development, code management is a critical component of this workflow.  This document seeks to identify components as well as describing several options to accomplish a workflow with these components.

The overall goal is to track development in a way that allows the TwoRavens project to meet its grant obligations as well as the larger goal of becoming a widely-used teach tool for students.


### Components of a Development Workflow:

1. **Code management/version control**
    - TwoRavens uses both Github and more recently Gitlab
1. **Issue/Task tracking**
    - Ability to track development
1. **Issue Board**
    - Manage the development lifecycle including coding, code review, and testing.
    - Give an "at a glance" view of the status of different functional pieces.
    - This is meant to be minimally bureaucratic and to help coordination when adding features, especially under tighter deadlines when many pieces may be changing simultaneously.
    - The boards show groups of issues related to a particular release or function
    - In addition, multiple boards may be used. For example, a separate board could be used for the Data Explore "mode/configuration" of TwoRavens
1. **Continuous Integration (CI)**
    - When code is checked into a repository, CI is a process where the system can be automatically tested and built.
    - An example in the TwoRavens workflow could be to run tests, and if those tests pass, to build new Docker images for deployment
    - CI can also be used to deploy TwoRavens.  (Where and how to deploy merits a separate discussion given multiple partners such as Dataverse and requirements such as D3M.)
1. **Docker Image Registry**
    - Docker images are kept in a registry (or registries) where they may be retrieved (pulled) for deployment and testing
    - For example, the current D3M gitlab includes a private Docker registry.
    - For TwoRavens, a reliable public registry is needed--especially  for other work--e.g. Dataverse deployment.

The use of the workflow component/tools listed above are now standard practice for software teams.  Their usage varies and including adjustments based on team size/culture.  Overall the goal is to find a balance where the tools assist development without impeding it through unnecessary steps.

The recent usage of [gitlab.com](https://about.gitlab.com/gitlab-com/) for D3M used several of these components including code management, issue tracking, CI (for building docker images), and a Docker image registry.

Below are notes on two possible options for TwoRavens development. (There are many more than 2 options, including variations of the tools below.  However, these seem goods ones to start with.)

**1. Gitlab.com**
**2. Github.com + waffle.io + TravisCI + Docker Hub**

---

## 1. Gitlab.com

- Includes all of the components above.  Similar to github, but a separate company.

### Cost

- reference: https://about.gitlab.com/gitlab-com/
- Gitlab.com hosting has several levels. For TwoRavens, the following versions meet current needs:
    - Free Plan (minimal)
    - Bronze Plan ($4 per user/month)
        - improvement: issue boards with milestones

### Pros

- Everything in one place.  No need to manage many sets of credentials.
- Relatively inexpensive
- Strong and growing company.  Heavily funded, including $20 million this month.

### Cons

- Code repository seems slower than github.com
- No direct integration with Docker Hub for Docker image storage.  (Is this important?)
    - However, CI scripts can be modified to push images to Dockerhub in addition to having images in the gitlab registry.
- The ecosystem may seem constraining if the development of 1 part or more parts starts to lag.


## 2. Github.com + waffle.io + TravisCI + Docker Hub

In this scenario, 4 services are used to cover the 5 workflow components.  It is notable
that all except Docker Hub use the same github credentials for login.  In addition,
Docker Hub can be synced (one time action) without a user or group's github credentials.

- **Code management/version control**: [github.com](https://github.com/)
- **Issue/Task tracking**: [github.com](https://github.com/)
- **Issue Board**: [waffle.io](waffle.io)
- **Continuous Integration**: [TravisCI](https://travis-ci.org/)
- **Docker image registry**: [Docker Hub](https://hub.docker.com/)

### Cost

- **Github**: $9 per user/month
  - organizational account full price--but discounted for academic/non-profits
     - need to contact github for the pricing
- **waffle.io**: free for open source projects;
  - teams (non open source): $49/month
  - reference: https://waffle.io/pricing
- **TravisCI**: free for open source
  - teams (non open source): $129/month
  - reference: https://travis-ci.com/plans
- **Docker Hub**: free for public repositories

### Pros

- Focused products with many users.  Github, Docker Hub, and TravisCI are well documented, heavily used.
- Relatively inexpensive
- Well known integration paths with deployment

### Cons

- Managing services from 4 different organizations.
- Github.com is a stable company but smaller organizations (e.g. waffle.io) may go out of business
