<h1 align="center">bpmn-visualization experimental add-ons</h1>
<div align="center">
    <p align="center"> 
        <a href="https://npmjs.org/package/@process-analytics/bv-experimental-add-ons">
          <img alt="npm package" src="https://img.shields.io/npm/v/@process-analytics/bv-experimental-add-ons.svg?color=orange"> 
        </a> 
        <a href="https://github.com/process-analytics/bv-experimental-add-ons/releases">
          <img alt="GitHub release (latest by date including pre-releases)" src="https://img.shields.io/github/v/release/process-analytics/bv-experimental-add-ons?label=changelog&include_prereleases"> 
        </a> 
        <a href="https://process-analytics.github.io/bv-experimental-add-ons/">
          <img alt="Live Demo" src="https://img.shields.io/badge/demo-online-blueviolet.svg"> 
        </a> 
        <a href="https://github.com/process-analytics/bv-experimental-add-ons/actions">
          <img alt="Build" src="https://github.com/process-analytics/bv-experimental-add-ons/workflows/Build/badge.svg"> 
        </a>
        <a href="https://sonarcloud.io/project/overview?id=process-analytics_bv-experimental-add-ons">
          <img alt="Coverage" src="https://sonarcloud.io/api/project_badges/measure?project=process-analytics_bv-experimental-add-ons&metric=code_smells">
        </a>
        <br>
        <a href=https://github.com/process-analytics/.github/blob/main/CODE_OF_CONDUCT.md">
          <img alt="Contributor Covenant" src="https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg"> 
        </a> 
        <a href="LICENSE">
          <img alt="License" src="https://img.shields.io/github/license/process-analytics/bv-experimental-add-ons?color=blue"> 
        </a>
    </p>
</div>  
<br>

Experimental add-ons for [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js).


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

A live demo is available at ⏩ https://process-analytics.github.io/bv-experimental-add-ons/


## ⚒️ Development Setup

Use the node version declared in [.nvmrc](.nvmrc). You can use a Node version manager like [nvm](https://github.com/nvm-sh/nvm): `nvm use`

This project uses [npm workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces).

Install dependencies: `npm install`

Develop the lib and live update the demo: run `npm start`. The demo is accessible at http://localhost:5173/


## 📃 License

`bv-experimental-add-ons` is released under the [Apache 2.0](LICENSE) license.  
Copyright &copy; 2023-present, Bonitasoft S.A.


## 🚀 Release how-to

When all updates have been completed, you are ready to publish a new release.

Go to the [release workflow](https://github.com/process-analytics/bv-experimental-add-ons/actions/workflows/release.yml) in GitHub Actions and run it by choosing the type of release.

This workflow will create a Git tag and trigger the publishing of the npm package.

Manage Milestone:
- **Note:** we always put issues related to a version in a Milestone whose name matches the version.
- Ensure the name of the milestone used for the new release version matches the name of the tag/version that has just been pushed. Renamed it if needed.
- Clean this opened milestone if some issues are still opened (move them to a new one or discard milestone from them)
- Close the milestone

Create a new GitHub release by following the [GitHub help](https://help.github.com/en/github/administering-a-repository/managing-releases-in-a-repository#creating-a-release):
- Create a new [Draft release](https://github.com/process-analytics/bv-experimental-add-ons/releases/new)
- `Tag version`: use a value of the tag that has just been created
- `Name`: same value as the tag, without the `v` prefix i.e. if the tag is `v0.2.0`, the name is `0.2.0`
- Description
    - _Note_: use [release 0.2.0](https://github.com/process-analytics/bv-experimental-add-ons/releases/tag/v0.2.0) as an example
    - briefly explain the contents of the new version
    - if releavant, create a **Highlight** paragraph and add screenshots, animations or videos to make the changes more user-friendly
    - reference the GitHub milestone
    - make GitHub generates the [release notes automatically](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)
- Publish the GitHub release


## ⚡ Powered by

<img src="packages/demo/public/assets/github-logo.svg" alt="GitHub logo" title="GitHub Pages" width="110"/>

**[GitHub Pages](https://pages.github.com/)** (<kbd>demo</kbd> live environment)

<img src="https://surge.sh/images/logos/svg/surge-logo.svg" alt="surge.sh logo" title="surge.sh" width="110"/>

**[surge.sh](https://surge.sh)** (<kbd>demo</kbd> preview environment)
