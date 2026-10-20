#!/usr/bin/env bash
# Commit all local changes and push to website_2026, automatically
# integrating any commits the binge-sync bot pushed in the meantime.
set -euo pipefail

BRANCH="website_2026"
MSG="${1:-Update files}"   # optional: ./commit.sh "my message"

# 1. Stage + commit. If nothing is staged, keep going (maybe we just
#    need to sync an earlier commit that failed to push).
git add ./
if ! git diff --cached --quiet; then
  git commit -m "$MSG"
else
  echo "No new changes to commit."
fi

# 2. Bring in remote work (e.g. the Letterboxd sync bot) and replay our
#    commit(s) on top, keeping history linear.
git fetch origin "$BRANCH"
if ! git rebase "origin/$BRANCH"; then
  echo
  echo "!! Rebase hit a conflict. Aborting so your tree stays clean."
  echo "   Resolve manually:  git rebase origin/$BRANCH"
  git rebase --abort
  exit 1
fi

# 3. Push.
git push origin "$BRANCH"
echo "Pushed $BRANCH successfully."
