# Cinderwatch

A self-playing 3D isometric tower defense in a single HTML file.

On a dark mountain pass, a handful of firelit towers hold the great beacon of a ruined keep against endless columns of monsters. An AI commander plays from the moment the page loads, and you can take over at any time.

**[Play it in your browser](https://kevintngo.github.io/cinderwatch/)** · [Watch 20 seconds of gameplay](https://kevintngo.github.io/cinderwatch/media/gameplay-20s.mp4)

![A bone giant falls apart between the towers](media/screenshot.jpg)

## What is in it

- **Four towers, three levels each**, raised piece by piece inside scaffolding: archer tower, bombard, storm spire and guard post.
- **Six kinds of monster**: skeletons, giant rats, slimes that split, shield-bearing knights, bats, and a boss on every fifth wave.
- **Battlefields that rebuild themselves.** After each boss the slab crumbles away and a new one, with a different road, assembles out of the dark.
- **Light as the main character.** A flickering beacon, a brazier on every tower, flaming arrows, cannon flashes and chain lightning, with moving shadows.
- **A miniature look.** The scene is drawn at about half resolution, then given an ordered dither, a depth-aware tilt-shift blur, a vignette and film grain.
- **No asset files.** Every model, texture and sound is generated in code.

![The battlefield breaking apart](media/crumble.jpg)

## Controls

The game needs no input. After a few seconds without any, the AI commander takes over again.

| Input | Action |
| --- | --- |
| Hover a pad or tower | Highlight it and show its range |
| Click or tap an empty pad | Open the build menu |
| Click or tap a tower | Upgrade or sell |
| `1` to `4` | Pick a tower kind |
| `U` | Upgrade the hovered or selected tower |
| `X` | Sell the selected tower |
| `Space` | Call the next wave early |
| `M` | Mute |
| `Esc` | Close the menu |
| Gamepad | Stick or D-pad selects a pad, A opens and confirms, B closes, X upgrades, Y calls the next wave |

Browsers keep audio off until a gesture, so the first click or key press turns the sound on.

Gamepad and touch input are implemented but have not been tested on real hardware.

## Run it

Open `index.html`. It works from `file://` with no server, no build step and no network.

## Build it

```bash
python3 tools/build.py
```

This joins `src/*.js` into `index.html` and inlines three.js from `vendor/`.

## Layout

| Path | Contents |
| --- | --- |
| `index.html` | The built game |
| `src/00-util.js` | Math, random numbers, noise |
| `src/10-gfx.js` | Procedural textures, the lit material, the geometry builder |
| `src/20-post.js` | Renderer and post-processing |
| `src/30-layout.js`, `31-terrain.js`, `32-props.js` | Road, stream and pad layout, terrain, scenery |
| `src/40-fx.js` | Lights, particles, lightning, decals |
| `src/50-rig.js` | Characters built from instanced parts, debris |
| `src/60-towers.js`, `61-monsters.js`, `62-game.js` | Towers, monsters and the crowd, waves and the AI commander |
| `src/70-pixelfont.js`, `72-ui.js` | Pixel font, HUD, menus, input |
| `src/80-audio.js` | Synthesized sound |
| `src/90-main.js` | Camera and main loop |
| `tools/` | Build script and test tools |

## Development tools

Both tools drive headless Chrome and need Node 22 or newer. Set `CHROME` if Chrome is not in the default macOS location, and `FFMPEG` if `ffmpeg` is not on your path.

```bash
node tools/cdp.js "seed=4&ff=30" wait:2000 shot:battle eval:"__cw.G.lives"
```

`cdp.js` runs the game in real time and accepts `wait`, `shot`, `eval`, `click`, `move` and `key` steps. Screenshots go to `tools/shots/`.

```bash
node tools/record.js scan 4 200
node tools/record.js capture 4 5130-5490,9870-10230 out.mp4
```

`record.js` steps the game at a fixed 1/60 s, so a seed always replays the same way. `scan` logs what happens when, `stills` saves frames, and `capture` writes a video of the given frame ranges with the game's own audio.

URL flags, for example `index.html#seed=4&fps=1`:

| Flag | Effect |
| --- | --- |
| `seed=N` | Fix the battlefield and the run |
| `level=N`, `k=N` | Start at a later battlefield or wave |
| `ff=S` | Fast-forward S seconds before the first frame |
| `fps=1` | Show frame rate and draw calls |
| `nodof=1` | Turn off the tilt-shift blur |
| `noscale=1` | Turn off automatic resolution scaling |
| `manual=1` | Do not start the loop (used by `record.js`) |

## License

[MIT](LICENSE). The build includes [three.js](https://threejs.org) r170, also MIT ([notice](vendor/LICENSE-three.txt)).
