#!/bin/sh
# Run in a NEW directory with original.mmd and actions.json downloaded here.
# Requires Beautiflow 1.0.1.
set -eu
cp original.mmd source.mmd
beautiflow agent plan source.mmd --operation transform --actions actions.json --receipt receipt.json --json
beautiflow agent commit --receipt receipt.json --json
beautiflow agent verify --receipt receipt.json --json
beautiflow agent rollback --receipt receipt.json --json
