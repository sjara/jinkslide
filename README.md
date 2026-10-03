# jinkslide

An SVG-based slide presentation system: you draw the slides
in [Inkscape](https://inkscape.org/) (one layer per slide) and present them
in any web browser. A presentation is a single SVG file that carries its own
JavaScript, so there is nothing to install on the computer you present from.

## Features

- One Inkscape layer per slide, shown full screen in the browser.
- Elements that appear or disappear step by step within a slide.
- Slide index: an overview grid of all slides to jump from.
- Per-slide background color.
- Videos and sounds played from files next to the presentation.

## Quick start

1. Create your presentation from the template:
   ```
   python3 update_svg.py template.svg --output mytalk.svg
   ```
   This copies `template.svg` and puts the jinkslide code inside the copy.
2. Open `mytalk.svg` in Inkscape. Add one layer per slide, in the order they
   should be shown, and save.
3. Open `mytalk.svg` in a web browser to present.

To see the features in use, open `example.svg` in a browser (it needs
`jinkslide.js` in the same folder) and in Inkscape.

## Presenting

| Key | Action |
|---|---|
| Right / Page Down | Next step (next effect, or next slide) |
| Left / Page Up | Previous step |
| Down / Up | Next / previous slide, skipping the effects |
| Home / End | First / last slide |
| `i` | Toggle the slide index |
| Arrows, Enter (in the index) | Move between slides, open the selected one |
| `+` / `-` (in the index) | Change the number of columns |
| Space | Play the videos on the current slide |
| Escape | Stop all sounds |

## Building slides

The first layer of the template holds a few widgets, placed outside the page
so they are not shown when presenting. Copy them to the slides where you
need them.

- **Appear / disappear**: group a copy of the "appear" (or "disappear") widget
  with the objects it should affect, and edit its order number. Objects show
  up (or go away) in that order as you step through the slide.
- **Background**: a slide containing a copy of the "background" widget uses
  the fill color of the widget's rectangle as the background.
- **Video**: a copy of the video placeholder is replaced, in the browser, by
  the video named in its `jinkslide:video-src` attribute, fitted inside the
  placeholder rectangle. The attributes `jinkslide:video-controls`,
  `-autoplay`, `-loop` and `-muted` take `true` or `false`. Edit them with
  Inkscape's XML editor.
- **Sound**: the sound button plays the file named in its `onclick`
  attribute, `playSound('./sound.wav')`.

Video and sound files are not stored inside the SVG. Keep them next to the
presentation, and copy them along with it.

## Updating a presentation

A presentation keeps the version of the code it was created with, shown on
the label of the first layer. To upgrade it to the code in this repository:

```
python3 update_svg.py mytalk.svg --in-place
```

The previous file is kept as `mytalk.svg.bak`.

## Development

The code lives in `jinkslide.js`. `template.svg` and `example.svg` load it
from that file, so changes can be tested by reloading the SVG in a browser.
See [ARCHITECTURE.md](ARCHITECTURE.md) for how the system works, the Python
scripts and the release procedure, and [TODO.md](TODO.md) for planned
improvements.

## Credits and license

jinkslide is largely based on
[JessyInk](https://launchpad.net/jessyink) 2.0.0 by Hannes Hochreiner. It
moves the code to a single external file and adds, among other things, the
slide index, per-slide backgrounds, video and sound.

Distributed under the GNU General Public License, version 3 or later. See
[LICENSE](LICENSE).

Santiago Jaramillo
