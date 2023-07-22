# bpmn-visualization-demo-template

A template repository to quickly initiate a [bpmn-visualization](https://github.com/process-analytics/bpmn-visualization-js) demo
- powered by [Vite](https://vitejs.dev/)
- written in [TypeScript](https://www.typescriptlang.org/)


## Using the template

- Create your repository based on this repository template: see https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template

- Update the repository settings
  - GitHub pages: enable _Build and deployment_ with _Source_ [GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)
  - Dependabot: a configuration is provided by the template, see the [configuration documentation](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuring-dependabot-version-updates) for more details.
  - GH actions: enable and manage secrets (it may require to manage them at GitHub organization level)
  - Other settings: apply guidelines described in the [.github](https://github.com/process-analytics/.github/) repository


## 🎮 Live demo

<!--
TODO: this is the url of the template repository. Change the url to match the URL of the actual repository.
-->
The live demo is available at ⏩ https://process-analytics.github.io/bpmn-visualization-demo-template/


## ⚒️ Development Setup

Use the node version declared in [.nvmrc](.nvmrc). You can use a Node version manager like [nvm](https://github.com/nvm-sh/nvm): `nvm use`

Install dependencies: `npm install`

Start the dev server: `npm run dev`

The demo is accessible at http://localhost:5173/

### Code linter

The code should be linted with [xo](https://github.com/xojs/xo). To have support in your favorite IDE, see the [how-to used in IDE](https://github.com/xojs/xo#editor-plugins) documentation. 

To lint the code, run `npm run lint`.


## 📃 License

The code of this demo is released under the [Apache 2.0](LICENSE) license.


## Release how-to

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


## ⚡ Powered by

<img src="public/github-logo.svg" alt="GitHub logo" title="GitHub Pages" width="110"/>

**[GitHub Pages](https://pages.github.com/)** (<kbd>demo</kbd> live environment)

<img src="https://surge.sh/images/logos/svg/surge-logo.svg" alt="surge.sh logo" title="surge.sh" width="110"/>

**[surge.sh](https://surge.sh)** (<kbd>demo</kbd> preview environment)
