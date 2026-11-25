@AGENTS.md

## Claude Code

Skills in `.claude/skills/` cover the recurring jobs — use them rather than
improvising the procedure:

| Skill | For |
| --- | --- |
| `/apply-correction <issue #…>` | apply reader suggestions filed as `correction` issues (line, metadata, reference) |
| `/add-transcript <catalog id>` | place a new transcript, flip its catalog row, check it |
| `/add-citation <lecture id> <time or cue>` | record a quotation in `citations.json` |
| `/review-contribution <PR #>` | maintainer: review a pull request against the corpus rules |

`gh` is the way to GitHub; run it from inside this repository so it resolves
the repo from the remote, rather than naming the repo.
