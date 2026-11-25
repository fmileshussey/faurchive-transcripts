---
name: review-contribution
description: Maintainer — review a contributor's pull request against the corpus rules (checker, listening spot-checks, transliteration, glossary safety, scope) and draft a verdict. Never merges.
argument-hint: "<PR #>"
allowed-tools: Bash(gh pr *), Bash(gh issue view *), Bash(git *), Bash(bun run *), Bash(bun test*), Bash(grep *), Read, Grep, Glob
---

Review pull request `$ARGUMENTS` for the maintainer. **Do not merge, approve,
label or comment** unless the maintainer says so in this session — produce a
verdict and a draft review for them to post.

## 1. What is it

```sh
gh pr view <N> --json title,body,author,baseRefName,headRefName,labels,files,commits,statusCheckRollup
gh pr diff <N>
```

- Base must be **`staging`**. Anything targeting `main` → request a retarget.
- Classify: corrections / metadata / citation / glossary / new transcript /
  research / tooling / docs — or a mix, which should usually be split.
- Read the linked issue, if any.

## 2. Run the checker on it

```sh
git fetch origin staging pull/<N>/head:review/<N>
git switch review/<N>
bun install && bun run check --changed origin/staging && bun test
git switch -            # back where you were; delete review/<N> afterwards
```

Never run the PR's code with secrets in the environment. Note whether CI agrees.

## 3. Read what the checker can't

- **Corrections:** for a sample (all, if under ~15), open the lecture at that
  moment — `https://faurchive.com/lecture/<id>?at=<id>:<seconds>` — and list the
  spots the maintainer should listen to. Flag any edit that *rewrites* rather than
  *corrects*: smoothed grammar, inserted words he didn't say, a modernised
  spelling against the glossary.
- **Spelling:** every `style/translit` warning — is it the audio, or a habit?
- **Glossary:** every new `translit` variant — grep `transcripts/` for it and
  read the hits. Would the blind rewrite be right in *all* of them? Plurals,
  glosses, names, phrases belong in `en[]`. (docs/GLOSSARY.md)
- **Metadata:** is there evidence for a changed date, year or subject?
- **Citations:** is the reference real and does it match the quoted words?
- **New transcript:** ASR grade; coverage vs `durationSec`; spot-check three
  points (start, middle, end) against the audio.
- **Research:** README carries author, question, method, corpus version,
  inputs; no copies of the corpus; reasonable size.
- **Tooling:** a new rule has a test that fails without it, and CONTRIBUTING.md
  says what it checks.

## 4. Verdict

Report to the maintainer:

- **Verdict:** merge / merge after listening to N spots / changes requested / decline
- **Checker:** errors and warnings, and whether CI agrees
- **To listen to:** links with times
- **Concerns:** each with file:line
- **Labels needed:** `retime` / `maintainer` if the PR legitimately needs one
- **After merge:** cue numbering for new transcripts, a corpus-wide correction
  pass for glossary changes, then promote
- **Draft review comment:** courteous, specific, in the contributor's terms
