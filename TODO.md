# TODO

Potential improvements for jinkslide.

## Ideas

- [ ] Fix video positioning: we currently read the absolute `x`/`y` of the rectangle item, but moving it in Inkscape adds a `transform` attribute, which our tool ignores. Apply the rectangle's transform (and any parent group transforms) when computing the video position.
- [ ] Make it easier to change the number of an "appear" element. Currently we have to select the text (which is inside a group) and replace it with a new number. That is fine for special cases, but there should be an easier default, such as a shortcut that increments/decrements the value. The challenge is that this has to be done from within Inkscape (e.g., an extension or a keyboard-triggered action).

## To verify

- [ ] Open in a browser a merged presentation made with `tools/update_svg.py` (from `template.svg`, and from `example.svg` with its video and sound).
- [ ] Test in a browser the case where `tools/update_svg.py` adds a `<script>` element to an SVG that has none (so far only checked to be well-formed XML).
- [ ] Check in Inkscape and a browser how the appear/disappear widgets look now that the old `2.0.0-alpha-1` label is gone.
- [ ] Review the "Building slides" section and the credit sentence in `README.md`; they were written from reading the code, not from use.

## Housekeeping

- [ ] Update the scripts that build presentations from this project (e.g., `create_slides.py` in talk folders): they still expect a `jinkslide.svg` template with `jinkslide.js` next to the presentation, and their widget templates still carry the `2.0.0-alpha-1` label.
- [ ] Decide what to do with the `clicker` branch (pull request #1) and the `video` branch on GitHub.

## Done

- [x] v1.0.0 release: version constants, `tools/bump_version.py`, documented workflow
- [x] v1.1.0 release: `template.svg` and `example.svg` replace `jinkslide.svg`, `tools/update_svg.py` replaces `build_svg.py`, `jinkslide:` namespace prefix, merged into the original repository
