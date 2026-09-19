#!/usr/bin/env python3
"""Set the jinkslide version in jinkslide.js and stamp the version label
in jinkslide.svg (the element marked with ns1:role="version") so that
the correct version is visible even in editors that do not run scripts.

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
SVG_PATH = ROOT / "jinkslide.svg"

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
    svgText = SVG_PATH.read_text()
    if not (VERSION_RE.search(jsText) and DATE_RE.search(jsText) and LABEL_RE.search(svgText)):
        sys.exit("Could not find version fields in jinkslide.js / jinkslide.svg")

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
    svgText = LABEL_RE.sub(lambda match: match.group(1) + label + match.group(2), svgText)

    JS_PATH.write_text(jsText)
    SVG_PATH.write_text(svgText)
    print(f"{current} -> {newVersion} ({args.date})")
    print(f"Next: git commit -am 'Release v{newVersion}' && git tag v{newVersion}")


if __name__ == "__main__":
    main()
