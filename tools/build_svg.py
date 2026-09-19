#!/usr/bin/env python3
"""Consolidate a jinkslide dev SVG (whose <script> tags load code via
xlink:href) plus external .js files into a single, self-contained SVG for
distribution.

Each <script> element in the dev SVG is expected to carry
xlink:href="jinkslide.js". This tool reads that file, escapes the
characters that must be escaped inside SVG (<, >, &, "), inlines the
result as the element's content, and drops the xlink:href attribute so
the output file has no external dependencies.

Usage:
    tools/build_svg.py [DEV_SVG] [--output OUTPUT_SVG]
"""

import argparse
import re
import sys
from pathlib import Path

SCRIPT_TAG_RE = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.DOTALL)
HREF_RE = re.compile(r'\s*xlink:href="([^"]+)"')


def escape_js(jsText):
    # Mirrors the escaping already used throughout jinkslide.svg: only
    # <, >, &, " need escaping; curly braces are left alone.
    return (
        jsText
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_svg(devSvgPath, outputPath):
    svgText = devSvgPath.read_text(encoding="utf-8")
    baseDir = devSvgPath.parent

    scriptNamesUsed = []

    def replace_script(match):
        attrs, existingContent = match.group(1), match.group(2)
        hrefMatch = HREF_RE.search(attrs)
        if not hrefMatch:
            # Already-inlined script (or one with no external ref); leave as-is.
            return match.group(0)
        jsRelPath = hrefMatch.group(1)

        jsPath = baseDir / jsRelPath
        if not jsPath.exists():
            raise FileNotFoundError(f"missing {jsPath} referenced by {devSvgPath}")
        jsText = jsPath.read_text(encoding="utf-8")

        cleanedAttrs = HREF_RE.sub("", attrs)
        scriptNamesUsed.append(jsRelPath)
        return f"<script{cleanedAttrs}>{escape_js(jsText)}</script>"

    outputText = SCRIPT_TAG_RE.sub(replace_script, svgText)
    outputPath.write_text(outputText, encoding="utf-8")

    return scriptNamesUsed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dev_svg", nargs="?", default="jinkslide.svg",
                         help="Dev SVG with xlink:href scripts (default: jinkslide.svg)")
    parser.add_argument("--output", default="jinkslide_dist.svg",
                         help="Output consolidated SVG path (default: jinkslide_dist.svg)")
    args = parser.parse_args()

    devSvgPath = Path(args.dev_svg)
    outputPath = Path(args.output)

    if not devSvgPath.exists():
        print(f"error: {devSvgPath} not found", file=sys.stderr)
        sys.exit(1)

    if devSvgPath.resolve() == outputPath.resolve():
        print("error: --output must not be the same file as the dev SVG", file=sys.stderr)
        sys.exit(1)

    scriptNames = build_svg(devSvgPath, outputPath)

    if not scriptNames:
        print(f"warning: no xlink:href scripts found/inlined in {devSvgPath}", file=sys.stderr)

    print(f"Inlined {len(scriptNames)} script(s) into {outputPath}:")
    for scriptName in scriptNames:
        print(f"  - {scriptName}")


if __name__ == "__main__":
    main()
