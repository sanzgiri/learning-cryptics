#!/usr/bin/env python3
"""
Grow drill/data.js with more real clues from cryptics.georgeho.org.

Append-only by design: existing entries in data.js are never reordered,
edited, or removed, only added to. That keeps old localStorage progress
(which stores shuffled index arrays into each type's clue list) valid
after a refresh — a saved index still points at the same clue it did
before, new clues just extend the tail.

Usage:
    python3 drill/build/fetch_clues.py [--target-per-type N] [--max-pages N]

Requires network access to https://cryptics.georgeho.org (Datasette JSON API,
ODbL-licensed dataset). See RESOURCES.md for provenance notes and known
limitations (double definition / cryptic definition / &lit are pulled via a
structural heuristic, not an explicit type tag — spot-check new additions).
"""
import argparse
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request

BASE = "https://cryptics.georgeho.org/data.json"
SOURCES = "('bigdave44','fifteensquared','natpostcryptic','thehinducrosswordcorner','times_xwd_times','cru_cryptics')"
PAGE = 1000
DATA_JS = os.path.join(os.path.dirname(__file__), "..", "data.js")

CROSSREF = re.compile(r"\b\d{1,2}\s?[ADad]\b")
ENUM_END = re.compile(r"\(\d+(?:[-,]\d+)*\)\s*\??\s*$")
VALID_ANSWER = re.compile(r"^[A-Za-z' -]{3,14}$")

TYPE_META = {
    "hidden": {"label": "Hidden word", "lesson": "0001-anatomy-of-a-cryptic-clue.html"},
    "anagram": {"label": "Anagram", "lesson": "0002-anagram-clues.html"},
    "doubledef": {"label": "Double definition", "lesson": "0003-double-definitions.html"},
    "charade": {"label": "Charade", "lesson": "0004-charades.html"},
    "container": {"label": "Container", "lesson": "0005-containers.html"},
    "reversal": {"label": "Reversal", "lesson": "0006-reversals.html"},
    "subtraction": {"label": "Subtraction", "lesson": "0007-subtraction.html"},
    "bitsandpieces": {"label": "Bits and Pieces", "lesson": "0008-bits-and-pieces.html"},
    "homophone": {"label": "Homophone", "lesson": "0009-homophones.html"},
    "crypticdef": {"label": "Cryptic definition", "lesson": "0010-cryptic-definitions.html"},
    "complex": {"label": "Complex clue", "lesson": "0011-complex-clues.html"},
    "andlit": {"label": "&Lit clue", "lesson": "0012-and-lit-clues.html"},
}

MECH_COLS = ["anagram", "hidden", "reversal", "container", "insertion", "deletion", "homophone", "alternation"]


def q_page(sql_template, offset, retries=5):
    sql = sql_template.format(limit=PAGE, offset=offset)
    url = BASE + "?" + urllib.parse.urlencode({"sql": sql})
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "curl/8.7.1"})
            with urllib.request.urlopen(req, timeout=45) as r:
                data = json.loads(r.read())
                if data.get("error"):
                    print("SQL ERROR (will retry):", data["error"][:200], file=sys.stderr)
                    time.sleep(3 * (attempt + 1))
                    continue
                cols = data["columns"]
                return [dict(zip(cols, row)) for row in data["rows"]]
        except Exception as e:
            print(f"retry {attempt}: {e}", file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    return None  # signal total failure, distinct from an empty-but-successful page


def fetch_all(sql_template, max_pages):
    rows = []
    for p in range(max_pages):
        batch = q_page(sql_template, p * PAGE)
        if batch is None:
            print(f"page offset={p * PAGE} failed after retries, skipping to next page", file=sys.stderr)
            continue
        rows.extend(batch)
        if len(batch) < PAGE:
            break
    return rows


def base_filters(clue, answer, definition, require_def=True, max_def_len=70):
    if not answer or not VALID_ANSWER.match(answer):
        return False
    if not clue or not ENUM_END.search(clue):
        return False
    if CROSSREF.search(clue):
        return False
    if require_def and (not definition or len(definition) > max_def_len):
        return False
    return True


def load_existing():
    if not os.path.exists(DATA_JS):
        return {"meta": TYPE_META, "clues": {k: [] for k in TYPE_META}}
    with open(DATA_JS) as f:
        txt = f.read()
    prefix = "const DRILL_DATA = "
    payload = json.loads(txt[len(prefix):].rstrip("\n;").rstrip(";"))
    for k in TYPE_META:
        payload["clues"].setdefault(k, [])
    return payload


def append_new(existing_list, candidates, target):
    """Append candidates not already present (by clue text or answer already
    used), up to target total. Never touches existing entries or their order."""
    seen_clues = set(item["c"] for item in existing_list)
    seen_answers = set(item["a"] for item in existing_list)
    added = 0
    for cand in candidates:
        if len(existing_list) >= target:
            break
        if cand["c"] in seen_clues or cand["a"] in seen_answers:
            continue
        existing_list.append(cand)
        seen_clues.add(cand["c"])
        seen_answers.add(cand["a"])
        added += 1
    return added


def fetch_type_simple(type_key, indicator_col, target, max_pages):
    sql = f"""
    select c.clue, c.answer, c.definition, i.{indicator_col} as indicator
    from clues c join indicators_by_clue i on i.clue_rowid=c.rowid
    where i.{indicator_col} != '' and length(c.answer) between 3 and 10
    and c.source in {SOURCES} and c.answer glob '[A-Z]*'
    order by c.rowid limit {{limit}} offset {{offset}}
    """
    raw = fetch_all(sql, max_pages)
    out = []
    for r in raw:
        ans = re.sub(r"[^A-Za-z]", "", r.get("answer", "")).upper()
        clue = (r.get("clue") or "").strip()
        defn = (r.get("definition") or "").strip()
        if not base_filters(clue, ans, defn):
            continue
        out.append({"c": clue, "a": ans, "d": defn, "x": r.get("indicator") or ""})
    random.shuffle(out)
    return out


def fetch_container(target, max_pages):
    sql = f"""
    select c.clue, c.answer, c.definition, i.container as ind_container, i.insertion as ind_insertion
    from clues c join indicators_by_clue i on i.clue_rowid=c.rowid
    where (i.container != '' or i.insertion != '') and length(c.answer) between 3 and 10
    and c.source in {SOURCES} and c.answer glob '[A-Z]*'
    order by c.rowid limit {{limit}} offset {{offset}}
    """
    raw = fetch_all(sql, max_pages)
    out = []
    for r in raw:
        ans = re.sub(r"[^A-Za-z]", "", r.get("answer", "")).upper()
        clue = (r.get("clue") or "").strip()
        defn = (r.get("definition") or "").strip()
        if not base_filters(clue, ans, defn):
            continue
        ind = r.get("ind_container") or r.get("ind_insertion") or ""
        out.append({"c": clue, "a": ans, "d": defn, "x": ind})
    random.shuffle(out)
    return out


def fetch_charade(target, max_pages):
    sql = f"""
    select c.clue, c.answer, c.definition, cb.charade as breakdown
    from clues c join charades_by_clue cb on cb.clue_rowid=c.rowid
    where length(c.answer) between 3 and 10
    and c.source in {SOURCES} and c.answer glob '[A-Z]*'
    order by c.rowid limit {{limit}} offset {{offset}}
    """
    raw = fetch_all(sql, max_pages)
    out = []
    for r in raw:
        ans = re.sub(r"[^A-Za-z]", "", r.get("answer", "")).upper()
        clue = (r.get("clue") or "").strip()
        defn = (r.get("definition") or "").strip()
        if not base_filters(clue, ans, defn):
            continue
        out.append({"c": clue, "a": ans, "d": defn, "x": r.get("breakdown") or ""})
    random.shuffle(out)
    return out


def fetch_complex(target, max_pages):
    cols = ", ".join(f"i.{c}" for c in MECH_COLS)
    sql = f"""
    select c.clue, c.answer, c.definition, {cols}
    from clues c join indicators_by_clue i on i.clue_rowid=c.rowid
    where (
      {" + ".join(f"case when i.{c}!='' then 1 else 0 end" for c in MECH_COLS)}
    ) >= 2 and length(c.answer) between 3 and 10
    and c.source in {SOURCES} and c.answer glob '[A-Z]*'
    order by c.rowid limit {{limit}} offset {{offset}}
    """
    raw = fetch_all(sql, max_pages)
    out = []
    for r in raw:
        ans = re.sub(r"[^A-Za-z]", "", r.get("answer", "")).upper()
        clue = (r.get("clue") or "").strip()
        defn = (r.get("definition") or "").strip()
        if not base_filters(clue, ans, defn):
            continue
        mechs = [c for c in MECH_COLS if r.get(c)]
        out.append({"c": clue, "a": ans, "d": defn, "x": "+".join(mechs)})
    random.shuffle(out)
    return out


def fetch_doubledef(target, max_pages):
    sql = f"""
    select c.clue, c.answer, c.definition
    from clues c
    left join indicators_by_clue i on i.clue_rowid = c.rowid
    where i.clue_rowid is null
    and c.rowid not in (select clue_rowid from charades_by_clue)
    and c.definition like '%/%'
    and length(c.answer) between 3 and 9
    and c.source in {SOURCES} and c.answer glob '[A-Z]*'
    order by c.rowid limit {{limit}} offset {{offset}}
    """
    raw = fetch_all(sql, max_pages)
    out = []
    for r in raw:
        ans = re.sub(r"[^A-Za-z]", "", r.get("answer", "")).upper()
        clue = (r.get("clue") or "").strip()
        defn = (r.get("definition") or "").strip()
        parts = [p.strip() for p in defn.split("/") if p.strip()]
        if len(parts) != 2 or len(defn) > 60:
            continue
        if not base_filters(clue, ans, defn):
            continue
        out.append({"c": clue, "a": ans, "d": defn})
    random.shuffle(out)
    return out


def fetch_crypticdef(target, max_pages):
    sql = f"""
    select c.clue, c.answer, c.definition
    from clues c
    left join indicators_by_clue i on i.clue_rowid = c.rowid
    where i.clue_rowid is null
    and c.rowid not in (select clue_rowid from charades_by_clue)
    and c.definition not like '%/%'
    and (c.clue like '%?%' or c.clue like '%!%')
    and length(c.answer) between 3 and 9
    and c.source in {SOURCES} and c.answer glob '[A-Z]*'
    order by c.rowid limit {{limit}} offset {{offset}}
    """
    raw = fetch_all(sql, max_pages)
    out = []
    for r in raw:
        ans = re.sub(r"[^A-Za-z]", "", r.get("answer", "")).upper()
        clue = (r.get("clue") or "").strip()
        defn = (r.get("definition") or "").strip()
        if not base_filters(clue, ans, defn, max_def_len=60):
            continue
        clue_body = re.sub(r"\(\d+(?:[-,]\d+)*\)\s*\??\s*$", "", clue).strip()
        if not clue_body or len(defn) / len(clue_body) < 0.55:
            continue
        out.append({"c": clue, "a": ans, "d": defn})
    random.shuffle(out)
    return out


def fetch_andlit(target, max_pages):
    cols = ", ".join(f"i.{c}" for c in MECH_COLS)
    sql = f"""
    select c.clue, c.answer, c.definition, {cols}
    from clues c join indicators_by_clue i on i.clue_rowid=c.rowid
    where length(c.answer) between 3 and 10
    and c.source in {SOURCES} and c.answer glob '[A-Z]*'
    and (c.clue like '%?%' or c.clue like '%!%')
    order by c.rowid limit {{limit}} offset {{offset}}
    """
    raw = fetch_all(sql, max_pages)
    out = []
    for r in raw:
        ans = re.sub(r"[^A-Za-z]", "", r.get("answer", "")).upper()
        clue = (r.get("clue") or "").strip()
        defn = (r.get("definition") or "").strip()
        if not base_filters(clue, ans, defn):
            continue
        clue_body = re.sub(r"\(\d+(?:[-,]\d+)*\)\s*\??\s*$", "", clue).strip()
        if not clue_body or len(defn) / len(clue_body) < 0.6:
            continue
        mechs = [c for c in MECH_COLS if r.get(c)]
        if not mechs:
            continue
        out.append({"c": clue, "a": ans, "d": defn, "x": "+".join(mechs)})
    random.shuffle(out)
    return out


FETCHERS = {
    "hidden": lambda t, mp: fetch_type_simple("hidden", "hidden", t, mp),
    "anagram": lambda t, mp: fetch_type_simple("anagram", "anagram", t, mp),
    "reversal": lambda t, mp: fetch_type_simple("reversal", "reversal", t, mp),
    "subtraction": lambda t, mp: fetch_type_simple("subtraction", "deletion", t, mp),
    "bitsandpieces": lambda t, mp: fetch_type_simple("bitsandpieces", "alternation", t, mp),
    "homophone": lambda t, mp: fetch_type_simple("homophone", "homophone", t, mp),
    "container": fetch_container,
    "charade": fetch_charade,
    "complex": fetch_complex,
    "doubledef": fetch_doubledef,
    "crypticdef": fetch_crypticdef,
    "andlit": fetch_andlit,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target-per-type", type=int, default=None,
                     help="Grow each type's pool to at least this many entries "
                          "(default: current count + 100, per type)")
    ap.add_argument("--max-pages", type=int, default=8,
                     help="Datasette pages (1000 rows each) to pull per type per run")
    ap.add_argument("--types", nargs="*", default=list(TYPE_META.keys()),
                     help="Only refresh these types (default: all 12)")
    args = ap.parse_args()

    payload = load_existing()
    total_added = 0
    for type_key in args.types:
        existing = payload["clues"][type_key]
        target = args.target_per_type or (len(existing) + 100)
        if len(existing) >= target:
            print(f"{type_key}: already at {len(existing)} (target {target}), skipping")
            continue
        candidates = FETCHERS[type_key](target, args.max_pages)
        added = append_new(existing, candidates, target)
        total_added += added
        print(f"{type_key}: {len(existing) - added} -> {len(existing)} (+{added})")

    with open(DATA_JS, "w") as f:
        f.write("const DRILL_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n")
    print(f"\nTotal new clues added: {total_added}")
    print(f"Wrote {DATA_JS}")


if __name__ == "__main__":
    main()
