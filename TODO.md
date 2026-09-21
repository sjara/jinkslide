# TODO

Potential improvements for jinkslide.

## Ideas

- [ ] Fix video positioning: we currently read the absolute `x`/`y` of the rectangle item, but moving it in Inkscape adds a `transform` attribute, which our tool ignores. Apply the rectangle's transform (and any parent group transforms) when computing the video position.

## Done

- [x] v1.0.0 release: version constants, `tools/bump_version.py`, documented workflow
