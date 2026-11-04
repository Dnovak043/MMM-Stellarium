/* MagicMirror² Module: MMM-Stellarium
 *
 * An observer-only, real-time view of the sky rendered with the Stellarium
 * Web Engine (WebGL). Designed for position: "fullscreen_below".
 *
 * - Everything is set in config. Mouse, touch and wheel input are ignored.
 * - The view is defined by direction (azimuth) and the altitudes of the
 *   bottom (floor) and top (ceiling) edges of the screen.
 * - No atmosphere and no landscape.
 * - Never reloads the page or restarts MagicMirror.
 *
 * Engine: Stellarium Web Engine, (c) Stellarium Labs SRL, licensed AGPL-3.0.
 * See engine/LICENSE-AGPL-3.0.txt and engine/mmm-stellarium-engine.patch.
 */

/* global StelWebEngine */

Module.register("MMM-Stellarium", {
	defaults: {
		// ---- Where you are ----------------------------------------------
		latitude: 51.4779, // degrees, north positive
		longitude: -0.0015, // degrees, east positive
		elevation: 0, // meters above sea level

		// ---- The view -----------------------------------------------------
		azimuth: 180, // compass direction at screen center: 0 = N, 90 = E, 180 = S, 270 = W
		floor: 0, // altitude (degrees) at the bottom edge of the screen
		ceiling: 50, // altitude (degrees) at the top edge of the screen
		horizontalFov: null, // width of the view in degrees; only used when ceiling is null
		projection: "perspective", // "perspective" (flat, like looking through glass)
		// or "stereographic" (Stellarium's wide, curved view)
		nakedEye: true, // true = brightness and size as seen by eye at any field of view;
		// false = engine default: views narrower than 60° act like a telescope

		// ---- What to show -------------------------------------------------
		constellationLines: true,
		constellationLabels: true,
		constellationArt: false,
		constellationBoundaries: false,
		allConstellations: true, // false = only the constellation at screen center (engine default)
		objectLabels: true, // names of bright stars, planets, etc.
		cardinalPoints: true, // N / E / S / W markers on the horizon
		milkyWay: true,
		deepSky: true, // nebulae, galaxies, clusters
		planets: true, // Sun, Moon and planets
		asteroids: true,
		comets: true,
		satellites: true,
		azimuthalGrid: false,
		equatorialGrid: false,
		meridianLine: false,
		eclipticLine: false,

		// ---- Appearance ---------------------------------------------------
		lightPollution: 3, // Bortle 1 (pristine) to 9 (inner city): fewer faint stars as it rises
		skyCulture: "western", // "western" or "belarusian"
		labelFont: "roboto", // "roboto" (Stellarium Web's font) or "engine" (built-in Noto Sans)
		// Glow (soft halo) around each kind of object.
		// true = engine default, false = none (crisp points),
		// or a number for the halo's size relative to the object (engine default 7, minimum 1.25).
		starGlow: true,
		planetGlow: true, // Sun, Moon and planets
		cometGlow: true,
		asteroidGlow: true,
		satelliteGlow: true,
		sunGlow: true, // the large glare image around the Sun (separate from planetGlow)
		milkyWayBrightness: 1, // 1 = engine default; lower dims the band and its faint sky-wide haze

		// ---- Timing -------------------------------------------------------
		clockSyncInterval: 60 * 1000 // re-sync to the system clock and re-lock the view (ms)
	},

	getScripts () {
		return [this.file("engine/stellarium-web-engine.js")];
	},

	getStyles () {
		return ["MMM-Stellarium.css"];
	},

	start () {
		this.stel = null;
		this.engineStarted = false;
		this.syncTimer = null;
		this.lastViewLog = null;

		this.wrapper = document.createElement("div");
		this.wrapper.className = "mmm-stellarium";

		this.canvas = document.createElement("canvas");
		this.canvas.className = "mmm-stellarium-canvas";
		this.wrapper.appendChild(this.canvas);
	},

	getDom () {
		// Always the same element, so the WebGL canvas is never recreated.
		return this.wrapper;
	},

	notificationReceived (notification) {
		if (notification === "DOM_OBJECTS_CREATED") this.startEngine();
	},

	resume () {
		// Shown again after being hidden: snap back to real time and the fixed view.
		this.syncClock();
		this.applyView();
	},

	// The engine resolves relative URLs poorly, so always pass absolute ones.
	absUrl (path) {
		return new URL(path, window.location.href).href;
	},

	startEngine () {
		if (this.engineStarted) return;
		if (typeof StelWebEngine !== "function") {
			Log.error(`${this.name}: engine script failed to load`);
			return;
		}
		this.engineStarted = true;

		StelWebEngine({
			wasmFile: this.absUrl(this.file("engine/stellarium-web-engine.wasm")),
			canvas: this.canvas,
			onReady: (stel) => {
				this.stel = stel;
				this.loadData();
				this.loadFonts();
				this.applyLayers();
				this.applyView();

				// Real time at real speed. The engine starts with time stopped.
				stel.core.time_speed = 1;
				this.syncClock();

				// Recompute the view if the display size changes.
				window.addEventListener("resize", () => this.applyView());

				if (this.config.clockSyncInterval > 0) {
					this.syncTimer = setInterval(() => {
						this.syncClock();
						this.applyView();
					}, this.config.clockSyncInterval);
				}

				Log.info(`${this.name}: engine ready`);
			}
		});
	},

	loadData () {
		const c = this.config;
		const core = this.stel.core;
		const base = this.absUrl(this.file("skydata/"));

		core.stars.addDataSource({ url: `${base}stars` });
		core.skycultures.addDataSource({ url: `${base}skycultures/${c.skyCulture}`, key: c.skyCulture });
		if (c.deepSky) core.dsos.addDataSource({ url: `${base}dso` });
		if (c.milkyWay) core.milkyway.addDataSource({ url: `${base}surveys/milkyway` });
		if (c.planets) {
			core.planets.addDataSource({ url: `${base}surveys/sso/moon`, key: "moon" });
			core.planets.addDataSource({ url: `${base}surveys/sso/sun`, key: "sun" });
			core.planets.addDataSource({ url: `${base}surveys/sso/moon`, key: "default" });
		}
		if (c.asteroids) core.minor_planets.addDataSource({ url: `${base}mpcorb.dat`, key: "mpc_asteroids" });
		if (c.comets) core.comets.addDataSource({ url: `${base}CometEls.txt`, key: "mpc_comets" });
		if (c.satellites) core.satellites.addDataSource({ url: `${base}tle_satellite.jsonl.gz`, key: "jsonl/sat" });
	},

	loadFonts () {
		if (this.config.labelFont !== "roboto") return; // keep the engine's built-in font
		this.stel.setFont("regular", this.absUrl(this.file("fonts/Roboto-Regular.ttf"))).catch(() => {});
		this.stel.setFont("bold", this.absUrl(this.file("fonts/Roboto-Bold.ttf"))).catch(() => {});
	},

	applyLayers () {
		const c = this.config;
		const core = this.stel.core;
		const set = (obj, attr, value) => {
			try {
				if (obj) obj[attr] = value;
			} catch (e) {
				Log.warn(`${this.name}: could not set ${attr}`, e);
			}
		};

		set(core, "naked_eye", Boolean(c.nakedEye));
		// Halo size ratio: 7 = engine default, 1.25 = none (smallest that still draws round points).
		const halo = (v) => {
			if (v === true || v === undefined || v === null) return 7;
			if (v === false) return 1.25;
			const n = Number(v);
			return Number.isFinite(n) ? Math.min(20, Math.max(1.25, n)) : 7;
		};
		set(core, "halo_stars", halo(c.starGlow));
		set(core, "halo_planets", halo(c.planetGlow));
		set(core, "halo_comets", halo(c.cometGlow));
		set(core, "halo_asteroids", halo(c.asteroidGlow));
		set(core, "halo_satellites", halo(c.satelliteGlow));
		set(core, "sun_halo", Boolean(c.sunGlow));
		const mwb = Number(c.milkyWayBrightness);
		set(core.milkyway, "brightness", Number.isFinite(mwb) ? Math.max(0, mwb) : 1);

		// Always off: no atmosphere, no landscape.
		set(core.atmosphere, "visible", false);
		set(core.landscapes, "visible", false);
		set(core.landscapes, "fog_visible", false);

		set(core.constellations, "lines_visible", c.constellationLines);
		set(core.constellations, "labels_visible", c.constellationLabels);
		set(core.constellations, "images_visible", c.constellationArt);
		set(core.constellations, "bounds_visible", c.constellationBoundaries);
		set(core.constellations, "show_only_pointed", !c.allConstellations);

		set(core.cardinals, "visible", c.cardinalPoints);
		set(core.milkyway, "visible", c.milkyWay);
		set(core.dsos, "visible", c.deepSky);
		set(core.planets, "visible", c.planets);
		set(core.minor_planets, "visible", c.asteroids);
		set(core.comets, "visible", c.comets);
		set(core.satellites, "visible", c.satellites);

		for (const mod of ["stars", "planets", "dsos", "minor_planets", "comets", "satellites"]) {
			set(core[mod], "hints_visible", c.objectLabels);
		}

		set(core.lines.azimuthal, "visible", c.azimuthalGrid);
		set(core.lines.equatorial, "visible", c.equatorialGrid);
		set(core.lines.meridian, "visible", c.meridianLine);
		set(core.lines.ecliptic, "visible", c.eclipticLine);

		set(core, "bortle_index", Math.min(9, Math.max(1, Math.round(c.lightPollution))));
	},

	/*
	 * Work out the view from floor / ceiling (or floor / horizontalFov).
	 *
	 * The picture can't be stretched, so once the vertical range is chosen the
	 * horizontal range follows from the screen's shape (and the reverse).
	 * Perspective: tan(v/2) / tan(h/2) = height / width.
	 * Stereographic: tan(v/4) / tan(h/4) = height / width.
	 */
	computeView () {
		const c = this.config;
		const D2R = Math.PI / 180;
		const R2D = 180 / Math.PI;
		const stereo = c.projection === "stereographic";
		const k = stereo ? 4 : 2;
		const maxSpan = stereo ? 300 : 170; // keep clear of each projection's limit
		const w = this.canvas.clientWidth || window.innerWidth || 1;
		const h = this.canvas.clientHeight || window.innerHeight || 1;
		const floor = Number(c.floor) || 0;

		let vert, horiz;
		if (c.ceiling !== null && c.ceiling !== undefined) {
			vert = Number(c.ceiling) - floor;
			if (c.horizontalFov) Log.warn(`${this.name}: ceiling is set, so horizontalFov is ignored (width follows from the screen shape)`);
			if (!(vert > 0)) {
				Log.error(`${this.name}: ceiling must be higher than floor; using a 40° range`);
				vert = 40;
			}
			vert = Math.min(vert, maxSpan);
			horiz = k * Math.atan(Math.tan(vert * D2R / k) * (w / h)) * R2D;
		} else {
			horiz = Math.min(Number(c.horizontalFov) > 0 ? Number(c.horizontalFov) : 30, maxSpan);
			vert = k * Math.atan(Math.tan(horiz * D2R / k) * (h / w)) * R2D;
		}

		return {
			horiz,
			vert,
			floor,
			ceiling: floor + vert,
			center: floor + vert / 2,
			engineFov: w < h ? horiz : vert // the engine's fov is the narrower screen dimension
		};
	},

	applyView () {
		if (!this.stel) return;
		const c = this.config;
		const core = this.stel.core;
		const D2R = this.stel.D2R;
		const v = this.computeView();

		core.projection = c.projection === "stereographic" ? 2 : 1; // PROJ_STEREOGRAPHIC / PROJ_PERSPECTIVE
		core.observer.latitude = c.latitude * D2R;
		core.observer.longitude = c.longitude * D2R;
		core.observer.elevation = c.elevation;
		core.observer.yaw = c.azimuth * D2R; // engine yaw = compass azimuth (N through E)
		core.observer.pitch = v.center * D2R;
		core.fov = v.engineFov * D2R;

		const msg = `view: azimuth ${c.azimuth}°, floor ${v.floor.toFixed(1)}°, ceiling ${v.ceiling.toFixed(1)}°, `
			+ `width ${v.horiz.toFixed(1)}°, height ${v.vert.toFixed(1)}° (${c.projection})`;
		if (msg !== this.lastViewLog) {
			this.lastViewLog = msg;
			Log.info(`${this.name}: ${msg}`);
		}
	},

	syncClock () {
		if (!this.stel) return;
		this.stel.core.observer.utc = this.stel.date2MJD(Date.now());
	}
});
