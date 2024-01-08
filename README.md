<h1 align="center">bpmn-visualization add-ons</h1>
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


## 🔆 Presentation

`bv-experimental-add-ons` offers new functionalities to [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js) in the form of add-ons.

`bv-experimental-add-ons` is being actively developed.
Before the release of version `1.0.0`, there may be some breaking changes.

<!--
We avoid these as much as possible, and carefully document them in the release notes.
As far as possible, we maintain compatibility for some minor versions.
-->


## 🎨 Features and Usage

See the dedicated [README](packages/addons/README.md).

A live demo is available at ⏩ https://process-analytics.github.io/bv-experimental-add-ons/.
The sources of the demo are available in the [demo](./packages/demo) folder.


## ⚒️ Development Setup

Use the node version declared in [.nvmrc](.nvmrc). You can use a Node version manager like [nvm](https://github.com/nvm-sh/nvm): `nvm use`

This project uses [npm workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces).

Install dependencies: `npm install`

Develop the lib and live update the demo: run `npm run dev:demo`. The demo is accessible at http://localhost:5173/


## 📃 License

`bv-experimental-add-ons` is released under the [Apache 2.0](LICENSE) license.  
Copyright &copy; 2023-present, Bonitasoft S.A.


## 🚀 Release how-to

When all updates have been completed, you are ready to publish a new release.

Go to the [release workflow](https://github.com/process-analytics/bv-experimental-add-ons/actions/workflows/release.yml) in GitHub Actions and run it by choosing the type of release.

This workflow:
- Creates a Git tag
- Triggers the publishing of the npm package
- Creates a draft GitHub release

Manage Milestone:
- **Note:** we always put issues related to a version in a Milestone whose name matches the version.
- Ensure the name of the milestone used for the new release version matches the name of the tag/version that has just been pushed. Renamed it if needed.
- Clean this opened milestone if some issues are still opened (move them to a new one or discard milestone from them)
- Close the milestone

The release workflow has initiated a new draft GitHub release, which needs to be updated and published :
- For more details about GitHub release, follow the [GitHub help](https://help.github.com/en/github/administering-a-repository/managing-releases-in-a-repository#creating-a-release):
- The release notes has been [automatically generated](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes). Review and adjust it if necessary.
- Publish the GitHub release


## ⚡ Powered by

<img src="packages/demo/public/assets/github-logo.svg" alt="GitHub logo" title="GitHub Pages" width="110"/>

**[GitHub Pages](https://pages.github.com/)** (<kbd>demo</kbd> live environment)

<img src="https://surge.sh/images/logos/svg/surge-logo.svg" alt="surge.sh logo" title="surge.sh" width="110"/>

**[surge.sh](https://surge.sh)** (<kbd>demo</kbd> preview environment)
