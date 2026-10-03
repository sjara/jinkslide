#!/usr/bin/env python3
"""Split a combined jinkslide SVG into a dev SVG plus external .js files.

Each <script> element in the SVG is expected to carry an
ns1:scriptname="some_name.js" attribute identifying which file its
contents belong to. This tool writes that content out to <js-dir>/<scriptname>
(unescaping the XML entities required inside an SVG document) and rewrites
each <script> element in the output SVG to load that file externally via
xlink:href, instead of embedding the code inline.

The resulting "dev" SVG can be opened directly in a browser and re-opened
after editing the .js files, with no build step. Use update_svg.py to
inline everything back together for distribution.

Usage:
    tools/split_svg.py SOURCE_SVG [--dev-svg DEV_SVG] [--js-dir JS_DIR]
"""

import argparse
import html
import re
import sys
from pathlib import Path

SCRIPT_TAG_RE = re.compile(r"<script\b([^>]*)>(.*?)</script>", re.DOTALL)
# The jinkslide namespace prefix varies between files (ns1:, jinkslide:, ...).
SCRIPTNAME_RE = re.compile(r'[\w-]+:scriptname="([^"]+)"')
SVG_OPEN_TAG_RE = re.compile(r"<svg\b[^>]*>", re.DOTALL)


def unescape_js(escapedText):
    # Only <, >, &, " are escaped in the source SVG (curly braces are left alone).
    return html.unescape(escapedText)


def ensure_xlink_namespace(svgText):
    openTagMatch = SVG_OPEN_TAG_RE.search(svgText)
    openTag = openTagMatch.group(0)
    if "xmlns:xlink=" in openTag:
        return svgText
    patchedOpenTag = openTag[:-1].rstrip() + '\n   xmlns:xlink="http://www.w3.org/1999/xlink">'
    return svgText[:openTagMatch.start()] + patchedOpenTag + svgText[openTagMatch.end():]


def split_svg(sourcePath, devSvgPath, jsDir, jsRelDir):
    svgText = sourcePath.read_text(encoding="utf-8")
    svgText = ensure_xlink_namespace(svgText)

    jsDir.mkdir(parents=True, exist_ok=True)

    scriptNamesFound = []

    def replace_script(match):
        attrs, rawContent = match.group(1), match.group(2)
        nameMatch = SCRIPTNAME_RE.search(attrs)
        if not nameMatch:
            raise ValueError(f"<script> tag without a scriptname attribute: {match.group(0)[:80]!r}")
        scriptName = nameMatch.group(1)

        jsPath = jsDir / scriptName
        jsPath.write_text(unescape_js(rawContent), encoding="utf-8")
        scriptNamesFound.append(scriptName)

        hrefPath = scriptName if jsRelDir in ("", ".") else f"{jsRelDir}/{scriptName}"
        hrefAttr = f' xlink:href="{hrefPath}"'
        return f"<script{attrs}{hrefAttr}></script>"

    devSvgText = SCRIPT_TAG_RE.sub(replace_script, svgText)
    devSvgPath.write_text(devSvgText, encoding="utf-8")

    return scriptNamesFound


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="Combined SVG to split")
    parser.add_argument("--dev-svg", default=None,
                         help="Output dev SVG path with external script refs (default: overwrite SOURCE_SVG)")
    parser.add_argument("--js-dir", default=".",
                         help="Directory to write extracted .js files into (default: project root)")
    args = parser.parse_args()

    sourcePath = Path(args.source)
    devSvgPath = Path(args.dev_svg) if args.dev_svg else sourcePath
    jsDir = Path(args.js_dir)

    if not sourcePath.exists():
        print(f"error: {sourcePath} not found", file=sys.stderr)
        sys.exit(1)

    if sourcePath.resolve() == devSvgPath.resolve():
        sourceText = sourcePath.read_text(encoding="utf-8")
        tmpSourcePath = sourcePath.with_suffix(".pre-split.svg")
        tmpSourcePath.write_text(sourceText, encoding="utf-8")
        sourcePath = tmpSourcePath

    scriptNames = split_svg(sourcePath, devSvgPath, jsDir, jsDir.as_posix())

    print(f"Extracted {len(scriptNames)} script(s) from {sourcePath}:")
    for scriptName in scriptNames:
        print(f"  - {jsDir / scriptName}")
    print(f"Wrote dev SVG (loads scripts via xlink:href): {devSvgPath}")


if __name__ == "__main__":
    main()
