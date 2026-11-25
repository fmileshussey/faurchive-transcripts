# research/

Projects built on the corpus: indexes, concordances, topic maps, studies of how
a theme recurs across thirty years of lectures, datasets derived from the
transcripts. Each lives in its own folder:

```
research/<project-name>/
  README.md        required
  …                notes, data, scripts — whatever the project is
```

Open a "Research proposal" issue before starting, so the scope can be agreed.

## What the README must say

- **Author(s)** — and how you'd like to be credited.
- **Question** — what the project is trying to find out or make.
- **Method** — how, in enough detail that someone else could redo it.
- **Corpus version** — the commit or `live-…` tag you worked from. The
  transcripts keep improving; a result is only reproducible against the text it
  was computed on.
- **Inputs** — for any derived data, which files it came from.

## What belongs here and what doesn't

- **Yes:** anything whose subject is the content of these lectures.
- **No:** changes to the corpus itself — corrections, citations, glossary terms
  belong in their own files, by their own pull requests, where the checker can
  hold them to the corpus's rules. A project that *finds* errors should report
  them that way.
- **No:** large binaries or copies of the transcripts. Refer to the corpus; don't
  duplicate it. Keep a project under a few megabytes.

Nothing in `research/` is indexed by faurchive.com. It is reviewed for scope,
provenance and the README above, not line by line, and it is published under the
same content licence as the rest of the corpus unless the README says otherwise.
