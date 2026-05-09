#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh [patch|minor|major]
# Defaults to "patch" if no argument is given.

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Make sure we're on main and clean
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: must be on 'main' branch (currently on '$BRANCH')"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Read current version
CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

VERSION="$MAJOR.$MINOR.$PATCH"
TAG="v$VERSION"

echo "Bumping $CURRENT -> $VERSION ($BUMP)"

# Update version in package.json
if command -v jq &> /dev/null; then
  tmp=$(mktemp)
  jq --arg v "$VERSION" '.version = $v' package.json > "$tmp" && mv "$tmp" package.json
else
  sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$VERSION\"/" package.json
fi

# Commit, tag, push
git add package.json
git commit -m "release: $TAG"
git tag -a "$TAG" -m "Release $TAG"
git push origin main
git push origin "$TAG"

# Create GitHub release (if gh is installed)
if command -v gh &> /dev/null; then
  echo "Creating GitHub release..."
  gh release create "$TAG" --title "$TAG" --generate-notes
  echo "Release $TAG created: $(gh release view "$TAG" --json url -q .url)"
else
  echo "gh CLI not installed — skipping GitHub release creation."
  echo "Create it manually at: https://github.com/alexwohlbruck/coopoly-deal/releases/new?tag=$TAG"
fi

echo "Done! Released $TAG"
