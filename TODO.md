# TODO

Potential improvements for jinkslide.

## Ideas

- [ ] Fix video positioning: we currently read the absolute `x`/`y` of the rectangle item, but moving it in Inkscape adds a `transform` attribute, which our tool ignores. Apply the rectangle's transform (and any parent group transforms) when computing the video position.
- [ ] Make it easier to change the number of an "appear" element. Currently we have to select the text (which is inside a group) and replace it with a new number. That is fine for special cases, but there should be an easier default, such as a shortcut that increments/decrements the value. The challenge is that this has to be done from within Inkscape (e.g., an extension or a keyboard-triggered action).

## Done

- [x] v1.0.0 release: version constants, `tools/bump_version.py`, documented workflow
