#! /usr/bin/env bash
set -euo pipefail

# inspired by https://github.com/textbook/fauxauth/blob/v8.1.5/bin/version.sh

if [ $# -ne 2 ]; then
  echo "usage: ./bin/version.bash <package> <version>"
  echo "This will update the version for the give package"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo 'Git working directory not clean.'
  exit 1
fi

packageName=$1
npmVersion=$2

echo "Bumping package ${packageName} to ${npmVersion}"
npm version ${npmVersion} --no-git-tag-version -w packages/${packageName}

VERSION=`node -p "require('./packages/${packageName}/package.json').version"`
echo "New package version: ${VERSION}"

echo "Committing and tagging..."
git commit -a --message "chore(release): ${VERSION}"
git tag "v${VERSION}"
echo "Commit and tag done"
