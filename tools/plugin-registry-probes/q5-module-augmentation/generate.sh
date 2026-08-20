#!/usr/bin/env bash
# Copyright 2026 Bonitasoft S.A.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Regenerates the simulated published package used by the Q5 probes.
#
# It compiles pkgsrc/src to .d.ts and installs the result as a real `node_modules/my-pkg`
# inside each consumer project, so that module augmentation is exercised against emitted
# declarations resolved through node_modules, not against TypeScript sources or `paths`.
# The generated directories are gitignored: this script is the committed source of truth.
set -euo pipefail

Q5_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROBES_DIR="$(cd "$Q5_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PROBES_DIR/../.." && pwd)"
TSC="$REPO_ROOT/node_modules/typescript/bin/tsc"

if ! command -v node >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ] && . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" && nvm use >/dev/null 2>&1 || true
fi
command -v node >/dev/null 2>&1 || { echo "node not found; run 'nvm use' in the repo root first" >&2; exit 1; }
[ -f "$TSC" ] || { echo "TypeScript not found at $TSC; run 'npm install' in the repo root first" >&2; exit 1; }

# 1. emit the package declarations once
rm -rf "$Q5_DIR/pkgsrc/generated-lib"
node "$TSC" -p "$Q5_DIR/pkgsrc"

# 2. install them as node_modules/my-pkg in each consumer project
# app / app-none / app-subpath / app-sepfile use classic node resolution (main + types)
# app-bundler uses an "exports" map that only exposes "."
for app in app app-none app-subpath app-sepfile app-bundler; do
  target="$Q5_DIR/$app/node_modules/my-pkg"
  rm -rf "$target"
  mkdir -p "$target"
  cp -R "$Q5_DIR/pkgsrc/generated-lib" "$target/lib"
  if [ "$app" = "app-bundler" ]; then
    cp "$Q5_DIR/pkg-template/package.exports.json" "$target/package.json"
  else
    cp "$Q5_DIR/pkg-template/package.node.json" "$target/package.json"
  fi
done

rm -rf "$Q5_DIR/pkgsrc/generated-lib"
echo "Generated node_modules/my-pkg for: app app-none app-subpath app-sepfile app-bundler"
