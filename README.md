# bpmn-visualization experimental add-ons

Experimental add-ons for `bpmn-visualization`.


## 🔆 Project Status

`bv-experimental-add-ons` is at an early stage of development.

It provides new experimental features for `bpmn-visualization`.

Before the release of version `1.0.0`, there may be some breaking changes.
<!--
We avoid these as much as possible, and carefully document them in the release notes.
As far as possible, we maintain compatibility for some minor versions.
-->


## 🎨 Features and Usage

See the dedicated [README](packages/lib/README.md).


## ⚒️ Development Setup

Use the node version declared in [.nvmrc](.nvmrc). You can use a Node version manager like [nvm](https://github.com/nvm-sh/nvm): `nvm use`

This project uses [npm workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces).

Install dependencies: `npm install`

Build (from the root folder): `npm run build -w @process-analytics/bv-experimental-add-ons`


## 📃 License

`bv-experimental-add-ons` is released under the [Apache 2.0](LICENSE) license.  
Copyright &copy; 2023-present, Bonitasoft S.A.


## 🚀 Release how-to

When all updates have been completed, you are ready to publish a new release.

Create a new GitHub release by following the [GitHub help](https://help.github.com/en/github/administering-a-repository/managing-releases-in-a-repository#creating-a-release)
- for `Tag version`, use a value following the **vX.Y.Z** scheme using the [Semantic Versioning](https://semver.org/).
- for `Target`
    - usually, keep the `main` branch except if new commits that you don't want to integrate for the release are already
      available in the branch
    - in that case, choose a dedicated commit
- Description
    - briefly explain the contents of the new version
    - make GitHub generates the [release notes automatically](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)


<!--

## ⚡ Powered by

[![statically.io logo](https://statically.io/icons/icon-96x96.png "statically.io")](https://statically.io)

**[statically.io](https://statically.io)** (<kbd>demo</kbd> and <kbd>examples</kbd> live environments)

<img src="https://surge.sh/images/logos/svg/surge-logo.svg" alt="surge.sh logo" title="surge.sh" width="110"/>

**[surge.sh](https://surge.sh)** (<kbd>demo</kbd> and <kbd>documentation</kbd> preview environments)

-->
