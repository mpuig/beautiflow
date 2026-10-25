#!/bin/sh
# Run in a NEW directory with original.mmd and actions.json downloaded here.
# Requires Beautiflow 1.0.1.
set -eu
cp original.mmd source.mmd
beautiflow agent plan source.mmd --operation transform --actions actions.json --receipt receipt.json --json
printf '%s\n' '%% Collaborator: review tenant policy before release.' >> source.mmd
# Expected rejection: exit 2.
set +e
beautiflow agent commit --receipt receipt.json --json
status=$?
set -e
[ "$status" -eq 2 ] || exit 1
