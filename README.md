# MMM-Stellarium

An observer-only, real-time sky for MagicMirror², rendered by the
[Stellarium Web Engine](https://github.com/Stellarium/stellarium-web-engine)
(the renderer behind stellarium-web.org).

- **Everything is set in config.** Mouse, touch and scroll input are ignored.
- **You define the view** by direction (`azimuth`) and the altitudes of the bottom
  (`floor`) and top (`ceiling`) edges of the screen.
- **Real time.** Synced to the system clock; stars, Moon and planets move as they really do.
- **No atmosphere, no landscape.**
- **Never reloads the page or restarts MagicMirror.**
- **Self-contained.** Prebuilt engine and ~5 MB of sky data. No npm install, no internet needed.

## Install

```bash
cd ~/MagicMirror/modules
git clone https://github.com/Dnovak043/MMM-Stellarium
```

To update later: `cd ~/MagicMirror/modules/MMM-Stellarium && git pull`, then restart MagicMirror.

## Config

```js
{
	module: "MMM-Stellarium",
	position: "fullscreen_below",
	config: {
		latitude: 51.4779,
		longitude: -0.0015,
		azimuth: 180,   // facing south
		floor: 0,       // bottom edge of the screen sits on the horizon
		ceiling: 50     // top edge of the screen is 50° up
	}
},
```

### How the view works

- `azimuth` is the compass direction at the center of the screen.
- `floor` and `ceiling` are the altitudes at the bottom and top edges, measured at the
  center of each edge. `ceiling - floor` is the vertical field of view.
- The picture can't be stretched without distorting the sky, so the **width follows
  from your screen's shape**. On a 1080×1920 portrait screen in perspective,
  floor 0 / ceiling 50 gives a view about 29° wide.
- Prefer to set the width? Set `ceiling: null` and `horizontalFov` instead; the
  ceiling then follows from the screen's shape.
- The final numbers are written to the MagicMirror log on start, e.g.
  `view: azimuth 180°, floor 0.0°, ceiling 50.0°, width 29.4°, height 50.0° (perspective)`.

With `floor: 0` the bottom edge is exactly the horizon, so nothing below the horizon
is shown. A negative floor shows sky below the horizon (there's no ground).

### All options

| Option | Default | Description |
|---|---|---|
| **Location** | | |
| `latitude` | `51.4779` | Degrees, north positive. |
| `longitude` | `-0.0015` | Degrees, east positive (the Americas are negative). |
| `elevation` | `0` | Meters above sea level. |
| **View** | | |
| `azimuth` | `180` | Compass direction at screen center: 0 = N, 90 = E, 180 = S, 270 = W. |
| `floor` | `0` | Altitude in degrees at the bottom edge. |
| `ceiling` | `50` | Altitude in degrees at the top edge. |
| `horizontalFov` | `null` | Width of the view in degrees. Only used when `ceiling` is `null`. |
| `projection` | `"perspective"` | `"perspective"`: flat, straight lines stay straight, like looking through glass. `"stereographic"`: Stellarium's wide, curved view. |
| `nakedEye` | `true` | `true`: stars and planets look as they do to the eye at any field of view. `false`: engine default, where views narrower than 60° act like a telescope (magnified, fainter stars appear). |
| **What to show** | | |
| `constellationLines` | `true` | Constellation stick figures. |
| `constellationLabels` | `true` | Constellation names. |
| `constellationArt` | `false` | Illustrated constellation figures. |
| `constellationBoundaries` | `false` | IAU constellation borders. |
| `allConstellations` | `true` | `false` = only the constellation at screen center (engine default). |
| `objectLabels` | `true` | Names of bright stars, planets, comets, etc. |
| `cardinalPoints` | `true` | N / E / S / W markers on the horizon. |
| `milkyWay` | `true` | The Milky Way. |
| `deepSky` | `true` | Nebulae, galaxies, clusters. |
| `planets` | `true` | Sun, Moon and planets. |
| `asteroids` | `true` | Minor planets. |
| `comets` | `true` | Comets. |
| `satellites` | `true` | Satellites (orbits go stale, see below). |
| `azimuthalGrid` | `false` | Alt/az grid (handy for checking floor and ceiling). |
| `equatorialGrid` | `false` | RA/Dec grid. |
| `meridianLine` | `false` | Local meridian. |
| `eclipticLine` | `false` | The Sun's path. |
| **Appearance** | | |
| `lightPollution` | `3` | Bortle 1–9. Higher hides faint stars. |
| `skyCulture` | `"western"` | `"western"` or `"belarusian"`. |
| `labelFont` | `"roboto"` | `"roboto"` (Stellarium Web's font) or `"engine"` (built-in Noto Sans). |
| **Glow** | | `true` = engine default, `false` = none (crisp points), or a number for the halo's size relative to the object (engine default `7`, minimum `1.25`). |
| `starGlow` | `true` | Halo around stars. |
| `planetGlow` | `true` | Halo around the Sun, Moon and planets. |
| `cometGlow` | `true` | Halo around comets. |
| `asteroidGlow` | `true` | Halo around asteroids. |
| `satelliteGlow` | `true` | Halo around satellites. |
| `sunGlow` | `true` | The large glare image around the Sun (separate from `planetGlow`). `false` = just the Sun's disk. |
| `milkyWayBrightness` | `1` | `1` = engine default. Lower values dim the Milky Way band and the faint haze it adds across the whole sky; `0` hides it (same as `milkyWay: false`). |
| **Timing** | | |
| `clockSyncInterval` | `60000` | How often (ms) to re-sync to the system clock and re-apply the view. |

## What differs from the stock engine

| Change | Stock engine | This module | Setting |
|---|---|---|---|
| Time | Stopped | Real time, re-synced to the system clock | `clockSyncInterval` |
| Location | Taipei | Your location | `latitude`, `longitude`, `elevation` |
| View | 50° stereographic | Fixed by direction, floor and ceiling | `azimuth`, `floor`, `ceiling`, `horizontalFov`, `projection` |
| Narrow views | Act like a telescope below 60° | Naked eye | `nakedEye` |
| Constellations | Only the one at screen center; lines and labels off | All shown; lines and labels on | `allConstellations`, `constellationLines`, `constellationLabels` |
| Label font | Noto Sans | Roboto | `labelFont` |
| Halo around stars, planets, comets, asteroids, satellites | Always size 7 | Size 7 by default, adjustable or off per type | `starGlow`, `planetGlow`, `cometGlow`, `asteroidGlow`, `satelliteGlow` |
| Sun glare | Always on | On, switchable | `sunGlow` |
| Milky Way brightness | Fixed | Adjustable | `milkyWayBrightness` |
| Atmosphere, landscape | On | Always off | (removed by design) |
| Mouse, touch, scroll | Pan and zoom | Ignored | (removed by design) |
| Portrait sizing | Squashed when the page is rotated with CSS | Correct | (bug fix, no setting) |

These changes are inside the engine itself, all in `engine/mmm-stellarium-engine.patch`:
the naked-eye setting, the per-type halo settings, the Sun glare setting, the Milky Way
brightness setting, a fix so objects with no halo stay round, and the portrait sizing fix.
With the default settings the engine draws exactly as stock.

### Where glow comes from

- **Halos** around each object: the `...Glow` settings.
- **Sun glare**: `sunGlow`.
- **The faint gray haze across the sky**: the Milky Way image. It covers the whole sky,
  not just the bright band. Lower `milkyWayBrightness`, or set `milkyWay: false` for a
  pure black background.
- **Nebula and galaxy images**: `deepSky: false`.
- **Lines and labels** are drawn with a slight soft edge; turn them off individually if needed.

## Notes

- **Accurate time** depends on the Pi's clock. A Pi 4 has no battery clock and sets
  the time from the network at boot. Check with `timedatectl` ("System clock
  synchronized: yes").
- **Satellite orbits** (`skydata/tle_satellite.jsonl.gz`) go stale within days to weeks.
  Comet and asteroid data (`CometEls.txt`, `mpcorb.dat`) stays usable for months.
  Set `satellites: false` if you won't refresh the file.
- **Config changes** take effect when MagicMirror loads its config (a reload of the mirror).
- **Portrait** works whether the display is rotated by the OS or by CSS in `custom.css`.
- **Performance.** WebGL must be hardware-accelerated: make sure your config's
  `electronSwitches` doesn't include `disable-gpu`. Use a heatsink or fan on the Pi.

## License

This module combines several works under different licenses.

| Part | Source | License |
|---|---|---|
| Module code (`MMM-Stellarium.js`, `MMM-Stellarium.css`) | This repository | MIT |
| Engine (`engine/stellarium-web-engine.js`, `.wasm`) | [Stellarium Web Engine](https://github.com/Stellarium/stellarium-web-engine), © Stellarium Labs SRL, **modified** | GNU AGPL v3 (`engine/LICENSE-AGPL-3.0.txt`) |
| Sky culture text and data (`skydata/skycultures/`) | Stellarium Web Engine | CC BY-SA |
| Constellation illustrations (`skydata/skycultures/*/illustrations/`) | Stellarium Web Engine | Free Art License |
| Moon texture (`skydata/surveys/sso/moon/`) | Oleg Pluton ("Helleformer"), from NASA public-domain data | CC BY 4.0 |
| Other sky data (stars, deep sky, Milky Way, Sun, comets, asteroids, satellites) | Stellarium Web Engine | See the upstream repository |
| Fonts (`fonts/`) | Roboto, Google | Apache 2.0 |

### Engine source and modifications

The engine is the upstream C/JavaScript source at the commit in
`engine/ENGINE_VERSION.txt`, with `engine/mmm-stellarium-engine.patch` applied,
compiled with Emscripten. Every change in the patch is marked in the source
with an `MMM-Stellarium` comment; they are listed in
[What differs from the stock engine](#what-differs-from-the-stock-engine).

### Sky data

`skydata/` is an unmodified copy of upstream's `apps/test-skydata/` at the
same commit. It is upstream's reduced development dataset (fewer stars and
deep-sky objects than stellarium-web.org), chosen here to keep the module
small enough for a Raspberry Pi.
