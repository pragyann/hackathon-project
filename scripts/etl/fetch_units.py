#!/usr/bin/env python3
"""
Fetch real unit data from the public University of Melbourne Handbook.

Why UniMelb: `prd.md` §5.2 uses "COMP20003 Algorithms and Data Structures" as its
worked example of the semantic-matching problem, and that is a real UniMelb code.
Seeding the degree the PRD already reasons about keeps the demo and the document
describing it in agreement.

Each subject page carries an aims paragraph, a topics list and intended learning
outcomes. That text is the grounding for unit -> competency matching: the model is
asked to map *this stated content* onto role requirements, never to recall what it
thinks a unit code means.

Politeness: one request at a time, with a delay. Pages are cached to
data/sources/handbook/ so re-running the parse costs no requests, and so the exact
snapshot behind any demo stays auditable.

Run: python3 scripts/etl/fetch_units.py
"""

import json
import os
import pathlib
import re
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "sources" / "handbook"
OUT = ROOT / "src" / "data" / "degrees.json"

YEAR = "2026"
BASE = f"https://handbook.unimelb.edu.au/{YEAR}/subjects/"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# Two real pathways through the Bachelor of Science, chosen because they map onto
# the PRD's personas: Arjun (first-year, computing) and Priya (late-stage, data).
# `yearLevel` is the year a full-time student normally takes the subject, and is
# what lets the roadmap reason about what a student has left rather than only what
# they have done.
DEGREES = [
    {
        "id": "unimelb-bsci-cis",
        "institution": "University of Melbourne",
        "name": "Bachelor of Science (Computing and Software Systems)",
        "durationYears": 3,
        "units": [
            ("COMP10001", 1, "core"),
            ("COMP10002", 1, "core"),
            ("MAST10007", 1, "core"),
            ("COMP20003", 2, "core"),
            ("COMP20005", 2, "elective"),
            ("SWEN20003", 2, "core"),
            ("INFO20003", 2, "core"),
            ("COMP30022", 3, "core"),
            ("COMP30023", 3, "core"),
            ("SWEN30006", 3, "elective"),
            ("COMP30024", 3, "elective"),
        ],
    },
    {
        "id": "unimelb-bsci-datascience",
        "institution": "University of Melbourne",
        "name": "Bachelor of Science (Data Science)",
        "durationYears": 3,
        "units": [
            ("COMP10001", 1, "core"),
            ("COMP10002", 1, "core"),
            ("MAST10007", 1, "core"),
            ("COMP20008", 2, "core"),
            ("INFO20003", 2, "core"),
            ("MAST20005", 2, "core"),
            ("COMP30027", 3, "core"),
            ("MAST30027", 3, "elective"),
            ("COMP30022", 3, "elective"),
        ],
    },
]


class RateLimited(Exception):
    """The handbook served its bot interstitial instead of the subject page."""


# The handbook sits behind bot protection that trips on request velocity. The
# correct response is to slow down, not to work around it: we fetch one subject
# at a time with a long pause, and abort the run entirely if we are still being
# interrupted after a backoff. Nothing here tries to look like a different client.
DELAY_SECONDS = 15
BACKOFF_SECONDS = 90


def fetch(code, _retried=False):
    path = CACHE / f"{code.lower()}.html"
    if path.exists():
        return path.read_text(encoding="utf-8", errors="ignore")

    if os.environ.get("ONLY_CACHED"):
        raise RateLimited("not cached, and ONLY_CACHED is set")

    req = urllib.request.Request(BASE + code.lower(), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    if "Pardon Our Interruption" in html or "<title>Access Denied" in html:
        if _retried:
            raise RateLimited(
                "still rate limited after backoff - stop and seed the remaining "
                "units by hand rather than pushing harder at the handbook"
            )
        print(f"  .. rate limited on {code}, backing off {BACKOFF_SECONDS}s")
        time.sleep(BACKOFF_SECONDS)
        return fetch(code, _retried=True)

    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    print(f"  fetched {code}")
    time.sleep(DELAY_SECONDS)
    return html


def text_of(html):
    t = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", html)
    t = re.sub(r"(?s)<[^>]*>", " ", t)
    t = t.replace("&amp;", "&").replace("&nbsp;", " ").replace("&#39;", "'")
    t = t.replace("&quot;", '"').replace("&lt;", "<").replace("&gt;", ">")
    return re.sub(r"[ \t]+", " ", t)


def between(text, start, ends):
    i = text.find(start)
    if i < 0:
        return ""
    i += len(start)
    j = len(text)
    for e in ends:
        k = text.find(e, i)
        if 0 <= k < j:
            j = k
    return " ".join(text[i:j].split())


def parse(code, html):
    t = text_of(html)
    title = ""
    m = re.search(rf"([A-Z][^(\n]{{3,80}}?)\s*\({code}\)", t)
    if m:
        title = m.group(1).strip()

    level = ""
    m = re.search(r"(Undergraduate|Graduate|Research)\s+level\s+(\d)", t, re.I)
    if m:
        level = f"{m.group(1).title()} level {m.group(2)}"

    points = None
    m = re.search(r"Points:\s*([\d.]+)", t)
    if m:
        points = float(m.group(1))

    aims = between(t, "AIMS", ["Intended learning outcomes", "Generic skills", "Last updated"])
    ilos = between(t, "Intended learning outcomes", ["Generic skills", "Last updated", "Eligibility"])
    ilos = re.sub(r"^On completion of this subject the student is expected to:?", "", ilos).strip()

    # The aims block ends up carrying the topics list too; that is the richest
    # single description of content, which is what the matcher wants.
    return {
        "code": code,
        "title": title,
        "level": level,
        "points": points,
        "description": aims[:2200],
        "learningOutcomes": ilos[:1200],
        "source": BASE + code.lower(),
    }


def main():
    codes = sorted({c for d in DEGREES for c, _, _ in d["units"]})
    print(f"fetching {len(codes)} subjects from the {YEAR} handbook")
    units = {}
    for code in codes:
        try:
            units[code] = parse(code, fetch(code))
        except Exception as exc:  # noqa: BLE001
            print(f"  !! {code}: {exc}")

    degrees = []
    for d in DEGREES:
        resolved = []
        for code, year, kind in d["units"]:
            u = units.get(code)
            if not u or not u["title"]:
                print(f"  !! dropping {code} from {d['id']} (no data)")
                continue
            resolved.append({**u, "yearLevel": year, "kind": kind})
        degrees.append({**d, "units": resolved})

    payload = {
        "source": {
            "publisher": "The University of Melbourne",
            "product": f"University Handbook {YEAR}",
            "url": f"https://handbook.unimelb.edu.au/{YEAR}",
            "note": "Public course information, retrieved 6 September 2026. Unit content is quoted for matching only.",
        },
        "degrees": degrees,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    print(f"\nwrote {OUT.relative_to(ROOT)}")
    for d in degrees:
        print(f"  {d['name']}: {len(d['units'])} units")
        for u in d["units"]:
            desc = len(u["description"])
            print(f"     y{u['yearLevel']} {u['code']:<10} {u['title'][:44]:<44} {desc:>5} chars")


if __name__ == "__main__":
    main()
