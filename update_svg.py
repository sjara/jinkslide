#!/usr/bin/env python3
"""Make a jinkslide SVG self-contained and up to date: put the current
jinkslide code inside it, whatever state the SVG starts in.

- A <script> element that loads code via xlink:href="jinkslide.js" (a dev
  SVG) has that file inlined and the xlink:href attribute dropped. The
  file is read from next to the SVG, or else from <js-dir>, so a
  presentation need not sit beside the code.
- A <script> element with the code already inlined, identified by its
  jinkslide:scriptname="some_name.js" attribute, has its content replaced with
  the current <js-dir>/some_name.js.
- If the SVG has no jinkslide <script> element at all, one is added.

The characters that must be escaped inside SVG (<, >, &, ") are escaped
in the inlined code, and the version label stored in the SVG (the element
marked with jinkslide:role="version") is stamped with the version of that code.

The result is written to --output, leaving the SVG untouched, or with
--in-place over the SVG itself. Before an SVG is overwritten in place, the
original is saved next to it as <name>.svg.bak (replacing any earlier
backup).

Usage:
    update_svg.py SVG --output OUTPUT_SVG [--js-dir JS_DIR]
    update_svg.py SVG --in-place [--js-dir JS_DIR]
"""

import argparse
import re
import sys
from pathlib import Path

# Matches both <script ...>...</script> and the self-closing <script ... />
# form that Inkscape writes for scripts with no inline content.
SCRIPT_TAG_RE = re.compile(r"<script\b([^>]*?)(?:/>|>(.*?)</script>)", re.DOTALL)
HREF_RE = re.compile(r'\s*xlink:href="([^"]+)"')
# Older files bind the jinkslide namespace to another prefix (e.g., ns1:).
SCRIPTNAME_RE = re.compile(r'[\w-]+:scriptname="([^"]+)"')
SVG_OPEN_TAG_RE = re.compile(r"<svg\b[^>]*>", re.DOTALL)
NAMESPACE_URI = "https://github.com/sjara/jinkslide"
NAMESPACE_RE = re.compile(r'xmlns:([\w-]+)="' + re.escape(NAMESPACE_URI) + '"')
ROOT = Path(__file__).resolve().parent
MAIN_SCRIPT = "jinkslide.js"
# Version fields in jinkslide.js, and the version label stored in an SVG.
VERSION_RE = re.compile(r'(var JINKSLIDE_VERSION = ")([^"]*)(";)')
DATE_RE = re.compile(r'(var JINKSLIDE_DATE = ")([^"]*)(";)')
LABEL_RE = re.compile(r'(role="version">)[^<]*(</tspan>)')


def escape_js(jsText):
    # Mirrors the escaping already used for scripts inlined in an SVG: only
    # <, >, &, " need escaping; curly braces are left alone.
    return (
        jsText
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def stamp_label(svgText, label):
    """Set the version label stored in the SVG (the element marked with
    jinkslide:role="version"), if it has one."""
    return LABEL_RE.sub(lambda match: match.group(1) + label + match.group(2), svgText)


def add_script(svgText, jsText):
    """Append a jinkslide <script> element to an SVG that has none,
    declaring the jinkslide namespace if needed."""
    openTagMatch = SVG_OPEN_TAG_RE.search(svgText)
    closeIndex = svgText.rfind("</svg>")
    if not openTagMatch or closeIndex < 0:
        raise ValueError("not an SVG document with <svg>...</svg>")
    prefixMatch = NAMESPACE_RE.search(openTagMatch.group(0))
    prefix = prefixMatch.group(1) if prefixMatch else "jinkslide"

    scriptElement = (f'  <script\n     id="jinkslide-script"\n'
                     f'     {prefix}:scriptname="{MAIN_SCRIPT}">{escape_js(jsText)}</script>\n')
    svgText = svgText[:closeIndex] + scriptElement + svgText[closeIndex:]
    if not prefixMatch:
        openTag = openTagMatch.group(0)
        patchedOpenTag = openTag[:-1].rstrip() + f'\n   xmlns:{prefix}="{NAMESPACE_URI}">'
        svgText = svgText[:openTagMatch.start()] + patchedOpenTag + svgText[openTagMatch.end():]
    return svgText


def update_svg(svgPath, outputPath, jsDir=ROOT):
    """Put the current jinkslide code inside the SVG. If outputPath is the
    SVG itself and it changes, the original is first saved as a .bak file.
    Returns the names of the scripts added, updated and already up to date,
    the new version label (None if the stored label did not change), and
    the backup path (None if no backup was made)."""
    svgText = svgPath.read_text(encoding="utf-8")
    baseDir = svgPath.parent

    namesAdded = []
    namesUpdated = []
    namesUnchanged = []
    jsTexts = []

    def read_js(jsPath, reason):
        if not jsPath.exists():
            raise FileNotFoundError(f"missing {jsPath} {reason} {svgPath}")
        jsTexts.append(jsPath.read_text(encoding="utf-8"))
        return jsTexts[-1]

    def replace_script(match):
        attrs, existingContent = match.group(1).rstrip(), match.group(2)
        hrefMatch = HREF_RE.search(attrs)
        nameMatch = SCRIPTNAME_RE.search(attrs)

        if hrefMatch:
            jsPath = baseDir / hrefMatch.group(1)
            if not jsPath.exists() and (jsDir / jsPath.name).exists():
                jsPath = jsDir / jsPath.name
            scriptName = hrefMatch.group(1)
            jsText = read_js(jsPath, "referenced by")
        elif nameMatch:
            scriptName = nameMatch.group(1)
            jsText = read_js(jsDir / scriptName, "named by jinkslide:scriptname in")
        else:
            # Not a jinkslide script; leave as-is.
            return match.group(0)

        newContent = escape_js(jsText)
        if not hrefMatch and newContent == existingContent:
            namesUnchanged.append(scriptName)
            return match.group(0)

        if hrefMatch or not (existingContent or "").strip():
            namesAdded.append(scriptName)
        else:
            namesUpdated.append(scriptName)
        return f"<script{HREF_RE.sub('', attrs)}>{newContent}</script>"

    outputText = SCRIPT_TAG_RE.sub(replace_script, svgText)

    if not jsTexts:
        jsText = read_js(jsDir / MAIN_SCRIPT, "needed by")
        outputText = add_script(outputText, jsText)
        namesAdded.append(MAIN_SCRIPT)

    # Stamp the stored version label with the version of the inlined code,
    # so that it is right even in editors that do not run scripts.
    newLabel = None
    for jsText in jsTexts:
        versionMatch, dateMatch = VERSION_RE.search(jsText), DATE_RE.search(jsText)
        if versionMatch and dateMatch:
            label = f"v{versionMatch.group(2)} ({dateMatch.group(2)})"
            stampedText = stamp_label(outputText, label)
            if stampedText != outputText:
                outputText, newLabel = stampedText, label
            break

    backupPath = None
    if outputPath.resolve() != svgPath.resolve():
        outputPath.write_text(outputText, encoding="utf-8")
    elif outputText != svgText:
        backupPath = svgPath.with_name(svgPath.name + ".bak")
        backupPath.write_text(svgText, encoding="utf-8")
        outputPath.write_text(outputText, encoding="utf-8")

    return namesAdded, namesUpdated, namesUnchanged, newLabel, backupPath


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("svg", help="jinkslide SVG to update")
    destination = parser.add_mutually_exclusive_group(required=True)
    destination.add_argument("--output", default=None,
                             help="Output SVG path; the input SVG is left untouched")
    destination.add_argument("--in-place", action="store_true",
                             help="Overwrite the input SVG, saving the original as <name>.svg.bak")
    parser.add_argument("--js-dir", default=ROOT,
                         help="Directory holding the current .js files (default: project root)")
    args = parser.parse_args()

    svgPath = Path(args.svg)
    outputPath = svgPath if args.in_place else Path(args.output)

    if not svgPath.exists():
        print(f"error: {svgPath} not found", file=sys.stderr)
        sys.exit(1)

    if not args.in_place and outputPath.resolve() == svgPath.resolve():
        print("error: --output is the input SVG; use --in-place to overwrite it", file=sys.stderr)
        sys.exit(1)

    try:
        namesAdded, namesUpdated, namesUnchanged, newLabel, backupPath = update_svg(
            svgPath, outputPath, Path(args.js_dir))
    except (FileNotFoundError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        sys.exit(1)

    for scriptName in namesAdded:
        print(f"Added {scriptName} to {outputPath}")
    for scriptName in namesUpdated:
        print(f"Updated {scriptName} in {outputPath}")
    for scriptName in namesUnchanged:
        print(f"{scriptName} already up to date in {outputPath}")
    if newLabel:
        print(f"Stamped version label: {newLabel}")
    if backupPath:
        print(f"Original saved as {backupPath}")


if __name__ == "__main__":
    main()
