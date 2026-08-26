#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="mpuig/beautiflow"
INSTALL_DIR="${BEAUTIFLOW_INSTALL_DIR:-$HOME/.local/bin}"
RELEASE_BASE="https://github.com/${REPOSITORY}/releases/latest/download"

fail() {
  printf 'Beautiflow install failed: %s\n' "$1" >&2
  exit 1
}

command -v curl >/dev/null 2>&1 || fail "curl is required"

os="$(uname -s)"
arch="$(uname -m)"
case "${os}/${arch}" in
  Darwin/arm64) asset="beautiflow-darwin-arm64" ;;
  Linux/x86_64|Linux/amd64) asset="beautiflow-linux-x86_64" ;;
  *) fail "unsupported platform ${os}/${arch}; build from source instead" ;;
esac

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

printf 'Downloading Beautiflow for %s/%s...\n' "$os" "$arch"
curl -fL --retry 3 --output "$tmp_dir/$asset" "$RELEASE_BASE/$asset"
curl -fL --retry 3 --output "$tmp_dir/SHA256SUMS" "$RELEASE_BASE/SHA256SUMS"

expected="$(awk -v name="$asset" '$2 == name { print $1 }' "$tmp_dir/SHA256SUMS")"
[ -n "$expected" ] || fail "release checksum is missing for $asset"

if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "$tmp_dir/$asset" | awk '{ print $1 }')"
elif command -v shasum >/dev/null 2>&1; then
  actual="$(shasum -a 256 "$tmp_dir/$asset" | awk '{ print $1 }')"
else
  fail "sha256sum or shasum is required to verify the download"
fi

[ "$actual" = "$expected" ] || fail "download checksum does not match the signed release manifest"

mkdir -p "$INSTALL_DIR"
chmod +x "$tmp_dir/$asset"
mv "$tmp_dir/$asset" "$INSTALL_DIR/beautiflow"

printf 'Installed Beautiflow to %s/beautiflow\n' "$INSTALL_DIR"
case ":$PATH:" in
  *":$INSTALL_DIR:"*) beautiflow version ;;
  *) printf 'Add %s to your PATH, then run: beautiflow version\n' "$INSTALL_DIR" ;;
esac
