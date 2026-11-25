#!/usr/bin/env bash
# One-time GitHub configuration for the repository — maintainer only, needs an
# admin `gh` login. Each step is its own subcommand so nothing happens by
# accident; run them in this order:
#
#   tools/setup-github.sh rename        faurchive-transcripts -> jose-faur-transcription-project
#   tools/setup-github.sh labels        create/update the labels the workflows and templates use
#   tools/setup-github.sh protect       branch protection on staging and main
#   tools/setup-github.sh discussions   turn on Discussions (research coordination)
#   tools/setup-github.sh publish       make the repository PUBLIC — last, after the pre-public review
#
# Every step is idempotent.
set -euo pipefail

OWNER=fmileshussey
OLD=faurchive-transcripts
NEW=jose-faur-transcription-project
REPO="$OWNER/$NEW"

step=${1:-}
case "$step" in
  rename)
    if gh repo view "$OWNER/$NEW" >/dev/null 2>&1; then
      echo "already renamed: $OWNER/$NEW"
    else
      gh repo rename "$NEW" -R "$OWNER/$OLD" --yes
    fi
    gh repo edit "$REPO" \
      --description "Transcripts of the lectures of Ḥakham José Faur — corrected, catalogued, open to contributions." \
      --homepage "https://faurchive.com"
    echo
    echo "Now update every place that names the old slug:"
    echo "  - git remote set-url origin git@github.com:$REPO.git   (in each worktree's repo — once)"
    echo "  - backend GITHUB_REPO=$REPO   (backend/.env, and the box's systemd unit env)"
    echo "  - merge the data/ branch that updates pipeline.ts and redact-pr.ts"
    ;;

  labels)
    # name|colour|description — `correction` already exists (the backend files it)
    while IFS='|' read -r name color desc; do
      [ -z "$name" ] && continue
      gh label create "$name" -R "$REPO" --color "$color" --description "$desc" --force
    done <<'EOF'
correction|d93f0b|Reader suggestion filed from faurchive.com
metadata|1d76db|catalog.json
citation|5319e7|citations.json
new-transcript|0e8a16|A new transcript, or a claim on one
glossary|fbca04|terms.json
research|c5def5|research/
tooling|bfd4f2|tools/, CI, docs
retime|b60205|Maintainer: this PR may change cue timings
maintainer|000000|Maintainer: contribution rules lifted for this PR
needs-audio-check|e99695|Someone must listen before this merges
EOF
    ;;

  protect)
    # `check` is the job in .github/workflows/check.yml; its name is the
    # status context. Admins are not enforced so `promote` (a fast-forward
    # push of main) and pipeline commits to staging still work.
    for branch in staging main; do
      gh api -X PUT "repos/$REPO/branches/$branch/protection" --input - <<EOF
{
  "required_status_checks": { "strict": false, "contexts": ["check"] },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_linear_history": $( [ "$branch" = main ] && echo true || echo false ),
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF
      echo "protected $branch"
    done
    gh repo edit "$REPO" --default-branch main --delete-branch-on-merge \
      --enable-squash-merge --enable-merge-commit --enable-rebase-merge=false
    ;;

  discussions)
    gh repo edit "$REPO" --enable-discussions
    ;;

  publish)
    echo "This makes $REPO PUBLIC: every branch, tag and commit (with author emails) becomes visible."
    echo "Do it only after the pre-public review (secrets scan, raw/ review, rights, licence)."
    read -r -p "Type the repository name to confirm: " answer
    [ "$answer" = "$NEW" ] || { echo "not confirmed"; exit 1; }
    gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
    ;;

  *)
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
