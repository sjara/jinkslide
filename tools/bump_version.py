#!/usr/bin/env python3
"""Set the jinkslide version in jinkslide.js and stamp the version label
(the element marked with jinkslide:role="version") in every SVG in the project
root that has one, so that the correct version is visible even in editors
that do not run scripts.

Usage:
    tools/bump_version.py VERSION [--date YYYY-MM-DD]

VERSION is either a semantic version (e.g. 0.2.0) or one of
"major", "minor", "patch" to increment the current version.
The date defaults to today.
"""

import argparse
import datetime
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS_PATH = ROOT / "jinkslide.js"

VERSION_RE = re.compile(r'(var JINKSLIDE_VERSION = ")([^"]*)(";)')
DATE_RE = re.compile(r'(var JINKSLIDE_DATE = ")([^"]*)(";)')
LABEL_RE = re.compile(r'(role="version">)[^<]*(</tspan>)')
SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")


def bumpVersion(current, kind):
    major, minor, patch = (int(part) for part in current.split("."))
    if kind == "major":
        return f"{major + 1}.0.0"
    if kind == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("version", help="X.Y.Z, or major/minor/patch")
    parser.add_argument("--date", default=datetime.date.today().isoformat())
    args = parser.parse_args()

    jsText = JS_PATH.read_text()
    if not (VERSION_RE.search(jsText) and DATE_RE.search(jsText)):
        sys.exit("Could not find version fields in jinkslide.js")
    svgTexts = {svgPath: svgPath.read_text() for svgPath in sorted(ROOT.glob("*.svg"))}
    svgTexts = {svgPath: svgText for svgPath, svgText in svgTexts.items()
                if LABEL_RE.search(svgText)}

    current = VERSION_RE.search(jsText).group(2)
    if args.version in ("major", "minor", "patch"):
        newVersion = bumpVersion(current, args.version)
    elif SEMVER_RE.match(args.version):
        newVersion = args.version
    else:
        sys.exit(f"Invalid version: {args.version}")

    jsText = VERSION_RE.sub(lambda match: match.group(1) + newVersion + match.group(3), jsText)
    jsText = DATE_RE.sub(lambda match: match.group(1) + args.date + match.group(3), jsText)
    label = f"v{newVersion} ({args.date})"

    JS_PATH.write_text(jsText)
    for svgPath, svgText in svgTexts.items():
        svgPath.write_text(LABEL_RE.sub(lambda match: match.group(1) + label + match.group(2), svgText))
    print(f"{current} -> {newVersion} ({args.date})")
    if svgTexts:
        print("Stamped: " + ", ".join(svgPath.name for svgPath in svgTexts))
    else:
        print("warning: no SVG with a version label found in the project root", file=sys.stderr)
    print(f"Next: git commit -am 'Release v{newVersion}' && git tag v{newVersion}")


if __name__ == "__main__":
    main()
