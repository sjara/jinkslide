# Understanding jinkslide

**jinkslide** is a sophisticated SVG-based slide presentation system that combines SVG markup with embedded JavaScript to create an interactive presentation that can be opened directly in a web browser. Here's how it works:

## Core Architecture

1. **SVG Structure**: The presentation is built as an SVG document with multiple layers (`<g>` elements with `inkscape:groupmode="layer"`), where each layer represents a slide.

2. **JavaScript Engine**: The system is powered by `jinkslide.js`, a modified version of [JessyInk](https://launchpad.net/jessyink), with the main `JinkSlide` class handling:
   - Slide navigation and management
   - Effect processing and animations
   - Keyboard and mouse event handling
   - Background and visual management

## Key Components

### Slide Management
- **Slides**: Each slide is a layer (`<g>` element) that gets cloned into a presentation layer
- **Presentation Layer**: A special layer (`jinkSlidePresentationLayer`) where slide content is displayed
- **ID Removal**: When slides are cloned to the presentation layer, all IDs are stripped to avoid conflicts, which is why the system uses namespaces for element tracking

### Navigation System
- **Keyboard Controls**: 
  - Arrow keys, Page Up/Down, Space for slide navigation
  - `i` key toggles slide index mode
  - `+`/`-` keys adjust column count in index mode
  - Escape stops all sounds
- **Two Modes**: 
  - `core_slide`: Normal presentation mode
  - `slide_index`: Overview mode showing multiple slides in a grid

### Effects System
- **Appear/Disappear Effects**: Elements can appear or disappear in sequence using the `JinkSlideEffectAppear` class
- **Order-based**: Effects are triggered based on order numbers specified in namespace attributes
- **State Management**: Slides can be in START, END, or intermediate states

### Enhanced Features

1. **Background Setter**: Groups marked with `ns1:background-setter="true"` can change the presentation background color based on rectangles within them

2. **Sound Support**: 
   - `playSound()` function plays audio files
   - `stopAllSounds()` stops all playing audio
   - Automatic sound stopping when changing slides

3. **Video Support**: 
   - Groups with `ns1:video-src` attributes get converted to HTML5 video elements
   - Maintains aspect ratio within defined rectangles
   - Supports controls, autoplay, loop, and muted attributes
   - Uses `foreignObject` to embed HTML video in SVG

4. **Interactive Elements**: 
   - Click handlers for interactive elements, e.g., to trigger playSound().

## Development Workflow: Split vs. Merged SVG

The JavaScript can live in two forms, and the tools in `tools/` convert between them:

- **Dev SVG (split)**: the SVG (e.g., `template.svg`) loads the engine with `<script xlink:href="jinkslide.js">`. The JS is a normal file that can be edited with any editor, diffed cleanly in git, and tested by reloading the SVG in a browser. No build step is needed. This is the working form and what is kept in the repository.
- **Distribution SVG (merged)**: a single self-contained SVG with the JS inlined (and escaped) inside the `<script>` element, with no external dependencies apart from media files such as videos and sounds. This is the form to send to others, and the form to start a new presentation from: `tools/update_svg.py template.svg --output mytalk.svg`. Running `tools/update_svg.py mytalk.svg --in-place` later upgrades it to the current JS.

| Tool | Purpose |
|------|---------|
| `tools/update_svg.py SVG (--output OUT \| --in-place) [--js-dir DIR]` | Merge or upgrade: put the current `jinkslide.js` inside the SVG, written to `OUT` or, with `--in-place`, over the SVG itself (the original is kept as `<name>.svg.bak`). Inlines a linked script, replaces an already-inlined one, or adds one if the SVG has none, and stamps the version label to match. The JS is read from next to the SVG or else from `DIR` (default: the project root) |
| `tools/split_svg.py SOURCE_SVG [--dev-svg DEV] [--js-dir DIR]` | Split: extract inline scripts (identified by `ns1:scriptname`) to `.js` files and link them via `xlink:href` |
| `tools/bump_version.py VERSION [--date D]` | Set the version and stamp the label in every SVG in the project root that has one |

Note that Inkscape does not run scripts, so it shows only the text stored in the SVG file. Keep this in mind for anything the JS generates at load time.

## Versioning

The version is defined once, near the top of `jinkslide.js`:

```js
var JINKSLIDE_VERSION = "1.0.0";
var JINKSLIDE_DATE = "2026-09-19";
```

- **In the browser**: on load, `updateVersionLabel()` writes `vX.Y.Z (date)` into the title-slide label, i.e., the `tspan` marked with `ns1:role="version"`. The label therefore always reflects the JS that is actually running.
- **In Inkscape**: the same text is stored in the SVG as a baseline, so the version is visible even without running scripts.
- **Releasing**: run `tools/bump_version.py patch|minor|major` (or an explicit `X.Y.Z`). It updates both the JS constants and the SVG label, so they cannot drift apart. Then commit and tag: `git commit -am "Release vX.Y.Z" && git tag vX.Y.Z`. Use semantic versioning (minor for new features, patch for fixes).
- **Copied decks**: a presentation made by copying the SVG keeps the stored label from when it was made until it is opened in a browser, where it shows the running JS version.

## Technical Details

### Namespace Usage
The system uses the `jinkslide` namespace (`https://github.com/sjara/jinkslide`, bound to the `ns1` prefix in the SVG files) extensively for:
- `ns1:background-setter`: Marks background color setters
- `ns1:video-src`: Specifies video source files
- `ns1:color-rect`: Marks interactive color-changing rectangles
- `ns1:core_effect_appear`: Defines appear effect order

### Escaping special characters
Because the Javascript code is inside an SVG file, characters like <, >, &, " in the javascript inside the SVG file need to be escaped using &lt;, &gt;, &amp;, &quot;. Curly braces do not need to be escaped.

### Presentation Flow
1. **Initialization**: `window.onload` triggers the main initialization
2. **Setup**: Creates presentation layer, hides original content, processes slides
3. **Runtime**: Handles user input, manages effects, updates display
4. **Navigation**: Processes slide changes, applies backgrounds, creates videos

### Index Mode Feature
The slide index mode (triggered by `i`) shows a grid overview of all slides with:
- Scalable thumbnails of each slide
- Red border highlighting the active slide
- Navigation with arrow keys
- Adjustable column count

## Summary

This is a very well-designed system that elegantly combines SVG's scalability with JavaScript's interactivity to create a fully functional presentation system that runs entirely in a web browser without requiring external dependencies.


