#!/usr/bin/env python3
"""
Build the seeded role corpus for Onramp.

Joins two openly-licensed sources into one file the app reads at runtime:

  * O*NET 31.0 (US Dept of Labor, CC BY 4.0) - occupation -> tasks, skills,
    technologies. Supplies the *content* of a role: what the work actually is.
  * JSA Internet Vacancy Index, July 2026 (Australian Government) - ANZSCO
    occupation -> monthly job-ad counts by state. Supplies the *Australian
    demand signal*: how many ads, where, and which way the trend is moving.

Output: src/data/roles.json

Run: python3 scripts/etl/build_roles.py
"""

import json
import pathlib
from collections import defaultdict

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[2]
ONET = ROOT / "data" / "sources" / "onet"
JSA = ROOT / "data" / "sources" / "jsa"
OUT = ROOT / "src" / "data" / "roles.json"

# The demo's coverage envelope. open-questions.md #3 argues for narrow and deep
# over broad and shallow: five roles, all real, all traceable to both sources.
#
# The ANZSCO column is an imperfect join and we say so rather than hiding it.
# ANZSCO's 4-digit structure predates most modern data roles, so "Data Scientist"
# has no native code and lands under Actuaries/Mathematicians/Statisticians.
# The mapping is recorded here, surfaced in the UI, and written up as a known
# limitation in docs/technical/data-sources.md.
ROLES = [
    {
        "id": "software-developer",
        "title": "Software Developer",
        "onet": "15-1252.00",
        "anzsco": "2613",
        "mappingConfidence": "high",
        "mappingNote": "ANZSCO 2613 Software and Applications Programmers is a direct match.",
    },
    {
        "id": "data-analyst",
        "title": "Data Analyst",
        "onet": "15-2051.01",
        "anzsco": "2611",
        "mappingConfidence": "medium",
        "mappingNote": "Mapped to ICT Business and Systems Analysts. ANZSCO groups business analysis and data analysis together.",
    },
    {
        "id": "data-engineer",
        "title": "Data Engineer",
        "onet": "15-1243.00",
        "anzsco": "2621",
        "mappingConfidence": "medium",
        "mappingNote": "Mapped to Database and Systems Administrators. ANZSCO has no distinct data-engineering code.",
    },
    {
        "id": "cyber-security-analyst",
        "title": "Cyber Security Analyst",
        "onet": "15-1212.00",
        "anzsco": "2621",
        "mappingConfidence": "medium",
        "mappingNote": "ANZSCO 2621 bundles ICT Security Specialists with database and systems administrators.",
    },
    {
        "id": "web-developer",
        "title": "Web Developer",
        "onet": "15-1254.00",
        "anzsco": "2612",
        "mappingConfidence": "high",
        "mappingNote": "ANZSCO 2612 Multimedia Specialists and Web Developers is a direct match.",
    },
]

STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]


def sheet_rows(path, sheet=None):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet] if sheet else wb.active
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    return header, rows


def load_occupations():
    _, rows = sheet_rows(ONET / "Occupation_Data.xlsx")
    return {r[0]: {"title": r[1], "description": r[2]} for r in rows if r[0]}


def load_tasks(codes):
    """Core task statements - the plainest description of what the job involves."""
    _, rows = sheet_rows(ONET / "Task_Statements.xlsx")
    out = defaultdict(list)
    for r in rows:
        code, _title, _tid, task, ttype = r[0], r[1], r[2], r[3], r[4]
        if code in codes and ttype == "Core" and task:
            out[code].append(task)
    return out


def load_technologies(codes):
    """
    Concrete tools. O*NET lists hundreds per occupation, most of them long-tail
    (every compiler ever written). We keep only entries flagged Hot Technology
    or In Demand, which is O*NET's own signal for what employers currently ask
    for - and is exactly the filter a roadmap needs to avoid recommending Ada.
    """
    header, rows = sheet_rows(ONET / "Software_Skills.xlsx")
    idx = {name: i for i, name in enumerate(header)}
    i_hot = idx.get("Hot Technology")
    i_dem = idx.get("In Demand")
    out = defaultdict(list)
    for r in rows:
        code, example, category = r[0], r[2], r[4]
        if code not in codes or not example:
            continue
        hot = i_hot is not None and r[i_hot] == "Y"
        demand = i_dem is not None and r[i_dem] == "Y"
        if not (hot or demand):
            continue
        out[code].append(
            {"name": example, "category": category, "hot": hot, "inDemand": demand}
        )
    for code in out:
        out[code].sort(key=lambda t: (not t["hot"], not t["inDemand"], t["name"]))
    return out


def load_essential_skills(codes, top_n=12):
    """O*NET generic skills, ranked by employer-rated Importance."""
    header, rows = sheet_rows(ONET / "Essential_Skills.xlsx")
    idx = {name: i for i, name in enumerate(header)}
    i_scale, i_val = idx["Scale ID"], idx["Data Value"]
    out = defaultdict(list)
    for r in rows:
        code, element, scale = r[0], r[3], r[i_scale]
        if code in codes and scale == "IM" and element:
            out[code].append({"name": element, "importance": round(float(r[i_val]), 2)})
    for code in out:
        out[code].sort(key=lambda s: -s["importance"])
        out[code] = out[code][:top_n]
    return out


def load_demand(anzsco_codes):
    """
    Australian job-ad counts from the Internet Vacancy Index.
    Columns after the first three are one per month, 2006-03 .. 2026-07.
    """
    header, rows = sheet_rows(
        JSA / "ivi_anzsco4_states_jul2026.xlsx", "4 digit 3 month average"
    )
    months = [h for h in header[3:] if h]
    latest_label = months[-1].strftime("%B %Y") if hasattr(months[-1], "strftime") else str(months[-1])

    by_code = defaultdict(dict)
    for r in rows:
        code, _title, state = str(r[0]), r[1], r[2]
        if code not in anzsco_codes:
            continue
        series = [None if v in (None, ".") else float(v) for v in r[3 : 3 + len(months)]]
        by_code[code][state] = {"title": r[1], "series": series}

    out = {}
    for code, states in by_code.items():
        nat = states.get("AUST")
        if not nat:
            continue
        series = nat["series"]
        clean = [v for v in series if v is not None]
        latest = series[-1]
        peak = max(clean) if clean else None
        # 12-month change, the figure a student actually cares about.
        year_ago = series[-13] if len(series) >= 13 and series[-13] else None
        out[code] = {
            "anzscoTitle": nat["title"],
            "latestMonth": latest_label,
            "latestAds": round(latest) if latest else None,
            "peakAds": round(peak) if peak else None,
            "peakIsHistoric": bool(peak and latest and latest < peak * 0.8),
            "yearOnYearPct": (
                round((latest - year_ago) / year_ago * 100, 1)
                if latest and year_ago
                else None
            ),
            "byState": {
                s: round(states[s]["series"][-1])
                for s in STATES
                if s in states and states[s]["series"][-1] is not None
            },
            # Last 5 years, for a sparkline. Monthly would be 240 points of noise.
            "trend": [round(v) for v in series[-60:] if v is not None],
        }
    return out


def main():
    onet_codes = {r["onet"] for r in ROLES}
    anzsco_codes = {r["anzsco"] for r in ROLES}

    occupations = load_occupations()
    tasks = load_tasks(onet_codes)
    technologies = load_technologies(onet_codes)
    skills = load_essential_skills(onet_codes)
    demand = load_demand(anzsco_codes)

    roles = []
    for spec in ROLES:
        occ = occupations.get(spec["onet"], {})
        roles.append(
            {
                "id": spec["id"],
                "title": spec["title"],
                "onetCode": spec["onet"],
                "onetTitle": occ.get("title"),
                "description": occ.get("description"),
                "anzscoCode": spec["anzsco"],
                "mappingConfidence": spec["mappingConfidence"],
                "mappingNote": spec["mappingNote"],
                "coreTasks": tasks.get(spec["onet"], []),
                "technologies": technologies.get(spec["onet"], []),
                "essentialSkills": skills.get(spec["onet"], []),
                "demand": demand.get(spec["anzsco"]),
            }
        )

    payload = {
        "generatedFrom": {
            "onet": {
                "version": "O*NET 31.0 Database",
                "publisher": "U.S. Department of Labor, Employment and Training Administration",
                "licence": "CC BY 4.0",
                "url": "https://www.onetcenter.org/database.html",
            },
            "ivi": {
                "version": "Internet Vacancy Index, July 2026",
                "publisher": "Jobs and Skills Australia",
                "licence": "CC BY 4.0",
                "url": "https://www.jobsandskills.gov.au/data/internet-vacancy-index",
            },
        },
        "roles": roles,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    print(f"wrote {OUT.relative_to(ROOT)}")
    for r in roles:
        d = r["demand"]
        ads = f"{d['latestAds']:,} ads ({d['latestMonth']})" if d else "no demand data"
        print(
            f"  {r['title']:<24} {len(r['coreTasks']):>2} tasks  "
            f"{len(r['technologies']):>3} tech  {len(r['essentialSkills']):>2} skills  {ads}"
        )


if __name__ == "__main__":
    main()
