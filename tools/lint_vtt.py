#!/usr/bin/env python3
"""
Transcript quality / hallucination-loop detector.

Whisper on degraded audio fails in characteristic ways: it repeats one line
hundreds of times, gets stuck on an n-gram, or dies early and truncates. This
scores a .vtt against those failure modes and returns pass | flag | fail.

Usage:
    python3 lint_vtt.py transcript.vtt [--audio-duration SECONDS] [--json]

Exit code: 0 = pass, 1 = flag (retry with a better tier), 2 = fail (unusable).
With --json, prints one JSON object to stdout.
"""
from __future__ import annotations
import argparse, gzip, json, re, sys
from collections import Counter


def parse_vtt(path: str) -> list[dict]:
    cues, cur = [], None
    ts = re.compile(r"(\d+:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(\d+:)?\d{1,2}:\d{2}[.,]\d{1,3}")
    for raw in open(path, encoding="utf-8", errors="replace"):
        line = raw.strip()
        if not line or line == "WEBVTT":
            if cur:
                cues.append(cur)
                cur = None
            continue
        if "-->" in line and ts.search(line):
            a, b = line.split("-->")
            cur = {"start": _sec(a), "end": _sec(b), "text": ""}
        elif cur is not None:
            cur["text"] = (cur["text"] + " " + line).strip()
    if cur:
        cues.append(cur)
    return cues


def _sec(t: str) -> float:
    t = t.strip().replace(",", ".").split()[0]
    parts = [float(p) for p in t.split(":")]
    s = 0.0
    for p in parts:
        s = s * 60 + p
    return s


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().strip(" .,!?-—"))


# redact.ts's marker. It is the pipeline's own repair of a stretch it could not
# hear — the opposite of a defect — but "inaudible" is a content word, so left
# in the token stream it floods a window and word_burst() reads the repair as
# the loop it replaced. One corpus file (chapter-4-v13--26, 16 markers) failed
# for exactly that, and redact-pr.ts adds more on every batch. Stripped from
# the text before any rule sees it; the cue itself still counts for coverage.
_INAUDIBLE = re.compile(r"\[inaudible(?: ~\d+s)?\]", re.I)


def _despan(text: str) -> str:
    return _INAUDIBLE.sub(" ", text)


# Latin, accented Latin, Latin Extended Additional (ḥ ṣ ḇ ṭ …) and the two
# modifier letters the house transliteration uses for א and ע. Without the
# last two the marks counted as foreign script.
# One token = letters, accented letters, ʾ/ʿ and the apostrophe. `[a-z']+`
# split every marked word into fragments: `ʾEḥad` became `e` + `ad`, which
# inflated the word count and shifted the word-burst window enough to push an
# unrelated repetition over its threshold.
_TOKEN = r"[a-z'ʾʿà-ɏḀ-ỿ]+"

_LATIN = re.compile(r"[A-Za-zÀ-ɏḀ-ỿʾʿ]")
_HEBREW = re.compile(r"[֐-׿]")        # legit: quoted Hebrew terms

# common English function words — their share of tokens is a cheap language check
_EN_FUNC = frozenset(
    "the and of to a in that is it was for he with as on this but by not are "
    "from which or you have his they i be at we".split()
)


def foreign_script_ratio(text: str) -> float:
    """Fraction of alphabetic chars that are neither Latin nor Hebrew — i.e.
    Greek/Cyrillic/CJK bleed from a Whisper language mis-detect."""
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    foreign = sum(1 for c in letters if not _LATIN.match(c) and not _HEBREW.match(c))
    return foreign / len(letters)


def english_function_ratio(tokens: list[str]) -> float:
    if not tokens:
        return 1.0
    return sum(1 for t in tokens if t in _EN_FUNC) / len(tokens)


def longest_run(lines: list[str]) -> tuple[int, str]:
    best, best_txt, run, prev = 1, "", 1, None
    for ln in lines:
        if ln == prev and ln:
            run += 1
            if run > best:
                best, best_txt = run, ln
        else:
            run, prev = 1, ln
    return best, best_txt


# common function words + contractions — excluded so word_burst() measures
# CONTENT-word concentration, not "the"/"and"/"it's" dominating every transcript
_FUNC_WORDS = frozenset(
    "the and of to a in that is it was for he with as on this but by not are from "
    "which or you have his they at we be her its our your their them were im ive "
    "youre theyre don't doesn't didn't can't won't wouldn't couldn't shouldn't isn't "
    "aren't wasn't haven't hasn't hadn't it's what's that's there's here's where's "
    "how's who's let's he's she's i'll we'll you'll they'll i'm i've we've you've "
    "they've we'd you'd they'd i'd he'd she'd ain't ok okay yeah um uh".split()
)


def word_burst(
    stream: list[tuple[int, str]], win: int = 60, step: int = 30, min_chunk: int = 40
) -> tuple[float, str, int, int, int]:
    """Max share any single content word reaches in a sliding window. A real
    hallucination loop (a phrase repeated with minor wording swaps, e.g. 'the
    king says... eat dog... the rabbi said... eat dog...') dodges the exact-line
    and fixed-length n-gram checks because no two cues/n-grams match exactly,
    but the one stable word at its core still floods a local stretch — unlike a
    topically frequent word (e.g. 'God'), which spreads roughly evenly across
    the whole transcript instead of spiking in one window."""
    n = len(stream)
    if n < min_chunk:
        return 0.0, "", 0, -1, -1
    best, best_w, best_n, best_i = 0.0, "", 0, 0
    for i in range(0, n, step):
        chunk = stream[i : i + win]
        if len(chunk) < min_chunk:
            continue
        w, c = Counter(t for _, t in chunk).most_common(1)[0]
        share = c / len(chunk)
        if share > best:
            best, best_w, best_n, best_i = share, w, c, i
    if not best_n:
        return 0.0, "", 0, -1, -1
    # the cues the flood actually lives in — the whole point is that the damage
    # is local (measured: every failing lecture is >= 96% sound), so the verdict
    # has to come with somewhere to look. redact.ts takes it from here.
    hits = [ci for ci, t in stream[best_i : best_i + win] if t == best_w]
    return best, best_w, best_n, min(hits), max(hits)


def max_ngram_ratio(tokens: list[str], lo: int = 5, hi: int = 12) -> tuple[float, str]:
    best, best_span = 0.0, ""
    n_tokens = len(tokens)
    if n_tokens < lo * 2:
        return 0.0, ""
    for n in range(lo, hi + 1):
        if n_tokens < n * 2:
            break
        grams = Counter(
            tuple(tokens[i : i + n]) for i in range(n_tokens - n + 1)
        )
        gram, count = grams.most_common(1)[0]
        covered = count * n / n_tokens  # rough upper bound on loop coverage
        if covered > best:
            best, best_span = covered, " ".join(gram)
    return min(best, 1.0), best_span


def lint(path: str, audio_duration: float | None = None) -> dict:
    cues = parse_vtt(path)
    texts = [_despan(c["text"]) for c in cues]
    # a cue that normalises to nothing — "..." / "—" / a bare redaction marker —
    # is not a line. It used to join the tally, and in 14 corpus files the single
    # most repeated "line" was the empty string (berakhot-34b-ta-ne-hada: 12.9%,
    # against a 15% threshold), which would have scored +2 with the reason
    # 'one line is 15% of cues: ""'.
    lines = [n for n in (_norm(t) for t in texts) if n]
    full = " ".join(lines)
    tokens = re.findall(_TOKEN, full.lower())
    n_words = len(tokens)
    # (cue index, content token) so word_burst can name the cues it fired on
    stream: list[tuple[int, str]] = []
    for i, t in enumerate(texts):
        for tok in re.findall(_TOKEN, _norm(t)):
            if tok not in _FUNC_WORDS and len(tok) > 2:
                stream.append((i, tok))

    run_len, run_txt = longest_run(lines)
    top_line, top_line_n = ("", 0)
    if lines:
        top_line, top_line_n = Counter(lines).most_common(1)[0]
    top_line_ratio = top_line_n / len(lines) if lines else 0.0
    ngram_ratio, ngram_span = max_ngram_ratio(tokens)
    burst_ratio, burst_word, burst_n, burst_c0, burst_c1 = word_burst(stream)
    burst_from = cues[burst_c0]["start"] if burst_c0 >= 0 else None
    burst_to = cues[burst_c1]["end"] if burst_c1 >= 0 else None
    foreign_ratio = foreign_script_ratio(full)
    en_ratio = english_function_ratio(tokens)
    gz = len(full.encode()) / max(1, len(gzip.compress(full.encode())))
    last_end = cues[-1]["end"] if cues else 0.0
    coverage = (last_end / audio_duration) if audio_duration else None

    score, reasons = 0, []

    def hit(cond, pts, msg):
        nonlocal score
        if cond:
            score += pts
            reasons.append(f"{msg} (+{pts})")

    enough = len(lines) >= 25  # ratio-based checks are noise on very short transcripts

    hit(run_len >= 10, 3, f"hard loop: '{run_txt[:50]}' x{run_len}")
    hit(5 <= run_len < 10, 1, f"repetition: '{run_txt[:50]}' x{run_len}")
    hit(enough and top_line_ratio >= 0.15, 2, f"one line is {top_line_ratio:.0%} of cues: '{top_line[:50]}'")
    hit(enough and ngram_ratio >= 0.20, 2, f"n-gram loop {ngram_ratio:.0%}: '{ngram_span[:50]}'")
    # a sentence-level loop with minor word swaps between repeats (e.g. speaker
    # name alternating) evades both checks above; catch it via local word density
    where = f" at {int(burst_from) // 60}:{int(burst_from) % 60:02d}" if burst_from is not None else ""
    hit(burst_n >= 15 and burst_ratio >= 0.32, 3, f"word flood: '{burst_word}' is {burst_ratio:.0%} of a stretch ({burst_n}x){where}")
    hit(burst_n >= 12 and 0.22 <= burst_ratio < 0.32, 1, f"local repetition: '{burst_word}' is {burst_ratio:.0%} of a stretch ({burst_n}x){where}")
    # wrong-language / script bleed from a Whisper language mis-detect
    hit(foreign_ratio >= 0.01, 3, f"non-Latin script {foreign_ratio:.1%} (wrong-language hallucination)")
    hit(n_words >= 200 and en_ratio < 0.09, 3, f"not English: {en_ratio:.1%} function words")
    hit(n_words >= 200 and 0.09 <= en_ratio < 0.13, 1, f"low English function-word ratio {en_ratio:.1%}")
    hit(gz >= 3.6, 2, f"gzip ratio {gz:.2f} (very repetitive)")
    hit(n_words < 50, 3, f"near-empty transcript ({n_words} words)")
    hit(50 <= n_words < 200, 1, f"short transcript ({n_words} words)")
    if coverage is not None:
        hit(coverage < 0.75, 2, f"truncated: covers {coverage:.0%} of audio")
        hit(0.75 <= coverage < 0.9, 1, f"covers only {coverage:.0%} of audio")
        hit(coverage > 1.15, 2, f"runs {coverage:.0%} past the audio (lost timing)")

    verdict = "fail" if score >= 3 else "flag" if score >= 1 else "pass"
    return {
        "path": path,
        "verdict": verdict,
        "score": score,
        "reasons": reasons,
        "metrics": {
            "cues": len(cues),
            "words": n_words,
            "longest_line_run": run_len,
            "top_line_ratio": round(top_line_ratio, 3),
            "ngram_ratio": round(ngram_ratio, 3),
            "word_burst": {
                "word": burst_word,
                "ratio": round(burst_ratio, 3),
                "n": burst_n,
                # the stretch to look at / hand to redact.ts, when there is one
                "cues": [burst_c0, burst_c1] if burst_c0 >= 0 else None,
                "from": round(burst_from, 1) if burst_from is not None else None,
                "to": round(burst_to, 1) if burst_to is not None else None,
            },
            "foreign_script_ratio": round(foreign_ratio, 3),
            "english_ratio": round(en_ratio, 3),
            "gzip_ratio": round(gz, 2),
            "coverage": round(coverage, 3) if coverage is not None else None,
            "inaudible_cues": sum(1 for c in cues if _INAUDIBLE.search(c["text"])),
            "last_cue_end": round(last_end, 1),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("vtt")
    ap.add_argument("--audio-duration", type=float, default=None)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    r = lint(a.vtt, a.audio_duration)
    if a.json:
        print(json.dumps(r))
    else:
        print(f"{r['verdict'].upper()}  score={r['score']}  {a.vtt}")
        for reason in r["reasons"]:
            print(f"  - {reason}")
        print(f"  metrics: {json.dumps(r['metrics'])}")
    return {"pass": 0, "flag": 1, "fail": 2}[r["verdict"]]


if __name__ == "__main__":
    sys.exit(main())
