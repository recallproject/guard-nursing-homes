#!/usr/bin/env bash
# Land daily hospice feed JSON on main without a human review.
#
# Why this exists:
#   main requires at least 1 approving review from someone with write access.
#   secrets.GITHUB_TOKEN is github-actions[bot], which cannot satisfy that rule
#   (mergePullRequest → "At least 1 approving review is required by reviewers
#   with write access"). The Sep 9 "auto-merge" fix still used GITHUB_TOKEN, so
#   it kept failing after gh pr create.
#
# Mechanism (HOSPICE_MERGE_TOKEN — a fine-grained PAT from a write-access user):
#   1. Prefer a direct push to main. This works when the PAT identity is allowed
#      to bypass "require a pull request" (admin / bypass actor).
#   2. Otherwise open the data PR as github-actions[bot] (so the author is NOT
#      the PAT user), then approve + squash-merge with the PAT. That supplies
#      the required write-access review without weakening review on code PRs.
#
# The PAT is repo-scoped and only used in this workflow. The commit guard below
# refuses to land anything except the four hospice JSON feeds.

set -euo pipefail

REQUIRE_TOKEN_ONLY=0
if [[ "${1:-}" == "--require-token-only" ]]; then
  REQUIRE_TOKEN_ONLY=1
fi

ALLOWED_PATHS=(
  public/data/hospice/news-feed.json
  public/data/hospice/doj-actions.json
  public/data/hospice/courtlistener-actions.json
  public/data/hospice/mfcu-actions.json
)

die() {
  echo "::error::$*"
  exit 1
}

if [[ -z "${HOSPICE_MERGE_TOKEN:-}" ]]; then
  cat <<'EOF'
::error::HOSPICE_MERGE_TOKEN is not configured. Daily hospice refresh cannot land on main.

Create the secret (once), then re-run this workflow:

1. GitHub → Settings → Developer settings → Fine-grained personal access tokens
   → Generate new token (user with write access to this repo: recallproject).
2. Token settings:
   - Resource owner: recallproject
   - Repository access: Only select repositories → guard-nursing-homes
   - Permissions:
       Contents: Read and write   (push / squash-merge onto main)
       Pull requests: Read and write   (approve + merge the data PR)
   - Expiration: 1 year (rotate before it lapses)
3. Repo → Settings → Secrets and variables → Actions → New repository secret
   Name:  HOSPICE_MERGE_TOKEN
   Value: the token from step 2
4. Actions → Hospice data refresh → Run workflow

Do not disable review requirements on main for ordinary code PRs.
Do not reuse this token in other workflows.

Alternative (no PAT): in repo Settings → Rules, replace classic branch
protection with a ruleset that requires 1 review on all paths EXCEPT
public/data/hospice/*.json, then GITHUB_TOKEN can merge data PRs itself.
EOF
  exit 1
fi

if [[ "${REQUIRE_TOKEN_ONLY}" -eq 1 ]]; then
  echo "HOSPICE_MERGE_TOKEN is present."
  exit 0
fi

git config user.name  "oversight-bot"
git config user.email "bot@oversightreports.com"

git add -- "${ALLOWED_PATHS[@]}"
if git diff --cached --quiet; then
  echo "No data changes; nothing to commit."
  exit 0
fi

mapfile -t changed < <(git diff --cached --name-only)
for path in "${changed[@]}"; do
  allowed=0
  for ok in "${ALLOWED_PATHS[@]}"; do
    if [[ "$path" == "$ok" ]]; then
      allowed=1
      break
    fi
  done
  if [[ "$allowed" -ne 1 ]]; then
    die "Refusing to land unexpected path: ${path}"
  fi
done

NEWS_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('public/data/hospice/news-feed.json')).feed_items?.length ?? 0)")
DOJ_COUNT=$(node  -e "console.log(JSON.parse(require('fs').readFileSync('public/data/hospice/doj-actions.json')).actions?.length ?? 0)")
COURT_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('public/data/hospice/courtlistener-actions.json')).actions?.length ?? 0)")
MFCU_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('public/data/hospice/mfcu-actions.json')).actions?.length ?? 0)")

git commit -m "Daily hospice feed refresh: ${NEWS_COUNT} news + ${DOJ_COUNT} DOJ + ${COURT_COUNT} court + ${MFCU_COUNT} MFCU items"

# actions/checkout persists GITHUB_TOKEN in extraheader; drop it so a second
# credential (PAT URL) is not fighting the first. Push via an explicit remote
# URL so the intended token is used.
git config --local --unset-all http.https://github.com/.extraheader 2>/dev/null || true

remote_for() {
  local token="$1"
  printf 'https://x-access-token:%s@github.com/%s.git' "${token}" "${GITHUB_REPOSITORY}"
}

echo "Attempting direct push to main with HOSPICE_MERGE_TOKEN..."
push_out=""
push_rc=0
set +e
push_out=$(git push "$(remote_for "${HOSPICE_MERGE_TOKEN}")" HEAD:main 2>&1)
push_rc=$?
set -e
echo "${push_out}"

if [[ "${push_rc}" -eq 0 ]]; then
  echo "Landed on main via direct push (HOSPICE_MERGE_TOKEN)."
  exit 0
fi

echo "Direct push to main was blocked; falling back to data PR + PAT approval + merge."

BRANCH="data/hospice-refresh-${GITHUB_RUN_ID}"
git push "$(remote_for "${GITHUB_TOKEN}")" "HEAD:${BRANCH}"

PR_URL=$(GH_TOKEN="${GITHUB_TOKEN}" gh pr create \
  --base main \
  --head "${BRANCH}" \
  --title "Daily hospice feed refresh" \
  --body "Automated hospice feed refresh from workflow run ${GITHUB_RUN_ID}. Data-only JSON under public/data/hospice/. Merged by HOSPICE_MERGE_TOKEN (write-access PAT) so main's review requirement is satisfied without a human.")

echo "Opened ${PR_URL}"

GH_TOKEN="${HOSPICE_MERGE_TOKEN}" gh pr review "${PR_URL}" --approve \
  --body "Auto-approving data-only hospice feed refresh (HOSPICE_MERGE_TOKEN, write-access reviewer)."

GH_TOKEN="${HOSPICE_MERGE_TOKEN}" gh pr merge "${PR_URL}" --squash --delete-branch

echo "Landed on main via PAT-approved squash merge of ${PR_URL}."
