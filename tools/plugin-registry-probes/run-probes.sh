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
# Compiles every probe project in turn and prints the tsc output, labelled by question.
#
# IMPORTANT: tsc errors are the measurement, not a failure. Almost every probe is expected
# to report errors: the error text is what reveals the inferred type. This script therefore
# never aborts on a failing project, and always exits 0 unless the toolchain itself is broken.
# Compare the output against the table in README.md.
set -uo pipefail

PROBES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$PROBES_DIR/../.." && pwd)"
TSC="$REPO_ROOT/node_modules/typescript/bin/tsc"

if ! command -v node >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ] && . "${NVM_DIR:-$HOME/.nvm}/nvm.sh" && nvm use >/dev/null 2>&1 || true
fi
command -v node >/dev/null 2>&1 || { echo "node not found; run 'nvm use' in the repo root first" >&2; exit 1; }
[ -f "$TSC" ] || { echo "TypeScript not found at $TSC; run 'npm install' in the repo root first" >&2; exit 1; }

echo "TypeScript version: $(node "$TSC" --version)"
echo "Node version:       $(node --version)"
echo

# The Q5 probes need the simulated published package to exist.
"$PROBES_DIR/q5-module-augmentation/generate.sh" >/dev/null || {
  echo "!! generate.sh failed; the Q5 package-name probes will not be meaningful" >&2
}

run_probe() {
  local label="$1" project="$2"
  echo "================================================================"
  echo "== $label"
  echo "== project: ${project#"$PROBES_DIR/"}"
  echo "================================================================"
  node "$TSC" -p "$project" --pretty false 2>&1 || true
  echo
}

run_probe "Q1  static id field forms vs instance method"            "$PROBES_DIR/q1-static-id-forms"
run_probe "Q2  constructor-typed interface, static enforcement"     "$PROBES_DIR/q2-static-enforcement"
run_probe "Q3  literal preservation through an array"               "$PROBES_DIR/q3-literal-through-array"
run_probe "Q4  generic host exposing only loaded plugins"           "$PROBES_DIR/q4-generic-host-features"
run_probe "Q5a module augmentation, relative, BARREL target"        "$PROBES_DIR/q5-module-augmentation/rel-barrel"
run_probe "Q5b module augmentation, relative, DECLARING module"     "$PROBES_DIR/q5-module-augmentation/rel-direct"
run_probe "Q5c module augmentation, interface declared in index"    "$PROBES_DIR/q5-module-augmentation/rel-in-index"
run_probe "Q5d module augmentation, PACKAGE ROOT (node resolution)" "$PROBES_DIR/q5-module-augmentation/app"
run_probe "Q5e NEGATIVE CONTROL, no augmentation"                   "$PROBES_DIR/q5-module-augmentation/app-none"
run_probe "Q5f module augmentation, package SUBPATH"                "$PROBES_DIR/q5-module-augmentation/app-subpath"
run_probe "Q5g augmentation in a separate, never-imported file"     "$PROBES_DIR/q5-module-augmentation/app-sepfile"
run_probe "Q5h module augmentation, bundler resolution + exports"   "$PROBES_DIR/q5-module-augmentation/app-bundler"
run_probe "Q5i composition: generic host + augmented registry"      "$PROBES_DIR/q5-module-augmentation/combined"
run_probe "Q6  overload shadowing"                                  "$PROBES_DIR/q6-overload-shadowing"
run_probe "R1  literal preservation on the instance side"           "$PROBES_DIR/r1-instance-id-forms"
run_probe "R2  InstanceType extraction, generic host rebuilt"       "$PROBES_DIR/r2-instancetype-extraction"
run_probe "R3  implements enforcement at the class declaration"     "$PROBES_DIR/r3-implements-enforcement"
run_probe "R4  reading a static id from an instance method"         "$PROBES_DIR/r4-static-from-instance-method"
run_probe "R5  subclassing, static / instance / hybrid"             "$PROBES_DIR/r5-subclassing"

echo "================================================================"
echo "All probes ran. Non-zero tsc output above is EXPECTED: the errors are the result."
echo "Compare against the verdict table in README.md."
echo "================================================================"
