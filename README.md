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

See the dedicated [README](packages/addons/README.md).


## ⚒️ Development Setup

Use the node version declared in [.nvmrc](.nvmrc). You can use a Node version manager like [nvm](https://github.com/nvm-sh/nvm): `nvm use`

This project uses [npm workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces).

Install dependencies: `npm install`

Build (from the root folder): `npm run build -w packages/addons`


## 📃 License

`bv-experimental-add-ons` is released under the [Apache 2.0](LICENSE) license.  
Copyright &copy; 2023-present, Bonitasoft S.A.


## 🚀 Release how-to

When all updates have been completed, you are ready to publish a new release.

Go to the [release workflow](https://github.com/process-analytics/bv-experimental-add-ons/actions/workflows/release.yml) in GitHub Actions and run it by choosing the type of release.

This workflow will create a Git tag and trigger the publishing of the npm package.

Create a new GitHub release by following the [GitHub help](https://help.github.com/en/github/administering-a-repository/managing-releases-in-a-repository#creating-a-release)
- `Tag version`: use a value of the tag that has just been created.
- `Target`: keep the `main` branch
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
