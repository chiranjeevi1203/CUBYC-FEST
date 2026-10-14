# CUBYC — FEST'2027 · Christ University

The site opens with a 6-second first-person space-travel sequence. A spiral galaxy assembles, the camera dives through it at warp, the sun grows out of the streaks, and the eight planets fade in. The same live solar system then keeps revolving behind the landing page.

Everything is procedural. The only external assets are the self-hosted **D-DIN** typeface (the SpaceX font, SIL Open Font License, in `public/fonts/d-din`) and the university logo.

## Setup

```bash
npm install
npm run dev       # http://localhost:5173
npm run build && npm run preview
```

From scratch:

```bash
npm install react react-dom three @react-three/fiber @react-three/drei gsap zustand
npm install -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite
```

## Logo

Drop the file at **`src/assets/christ-university-logo.png`**, then restart `npm run dev` so Vite's glob picks it up.

Until the file exists, or if it fails to load, `BrandLogo` renders a gold "CU" monogram. The build never breaks either way. The logo appears top-left in the loader, in the navbar, in the hero lockup and in the footer.

## Architecture

- `Experience.jsx` holds the single R3F `<Canvas>`. It is mounted once and never unmounted. It contains the galaxy, warp field, nebula, sky stars and solar system.
- `store/useExperience.js` (zustand) holds the phase machine `GALAXY → WARP → ARRIVAL → LANDING_IDLE`. It also holds a mutable `scene` object that the timeline writes and every `useFrame` reads, so nothing re-renders per frame.
- `lib/timeline.js` builds the single GSAP master timeline. It drives the camera path, FOV and bank, every shader-facing value, the HUD ring and comet, the countdown, the microcopy, the end card and the landing reveal.
  - Countdown numerals are looked up from timeline time (`TIMELINE.countTicks`), never from a timer.
- `hud/LoaderHUD.jsx` is a DOM overlay. It owns the timeline lifecycle: build, `?scrub`, skip, pause on hidden tab and cleanup. It unmounts at 6.0s, and the timeline keeps running to finish the hero reveal over the live canvas.

## Files

```
index.html
src/main.jsx
src/App.jsx
src/index.css
src/config/experience.js            ← all tuning
src/store/useExperience.js
src/lib/timeline.js
src/lib/shaders.js
src/lib/useShaderMaterial.js
src/components/Experience.jsx
src/components/CometCursor.jsx
src/components/Gallery.jsx
src/components/scene/CameraRig.jsx
src/components/scene/SpiralGalaxy.jsx
src/components/scene/WarpField.jsx
src/components/scene/NebulaClouds.jsx
src/components/scene/SkyStars.jsx
src/components/scene/SolarSystem.jsx
src/components/hud/LoaderHUD.jsx
src/components/hud/CountdownRing.jsx
src/components/hud/BrandLogo.jsx
src/pages/LandingPage.jsx
src/components/ui/FestMark.jsx        ← ringed-planet fest mark (SVG)
src/components/ui/EventCountdown.jsx  ← live countdown to EVENT.start
src/config/departments.js            ← departments, their worlds and every event (from the events sheet)
src/lib/deptRoute.js                 ← #/dept/… routes (Back / Forward, deep links)
src/lib/deptShaders.js               ← radiation aura, ejecta, backdrop, "inside the world" environment
src/components/dept/DepartmentView.jsx ← department pages: GSAP choreography + DOM
src/components/dept/DeptScene.jsx    ← department pages' own WebGL scene
src/components/dept/EventsPanel.jsx  ← event list + full brief (format, contacts, rules)
src/components/dept/HubPanel.jsx     ← inside the Sun: CUBYC at a glance + department directory
src/components/scene/StationModel.jsx ← the space station (landing + department page)
src/lib/stationShaders.js            ← station hull, solar panels, window lights
src/assets/                          ← christ-university-logo.png goes here
```

## Interactive background (landing page)

- **Drag** to orbit the solar system; it keeps some momentum after you let go (`CAMERA.drag`). On phones, swipe sideways.
- **Hover** a planet or the sun to see its name and event track, with its orbit lit in gold.
- **Click** a planet or the sun to fly the camera to it and open the info card (bottom-left). Moving between planets with the card buttons or **← / →** is a smooth glide. **Esc** (or a click on empty space) returns.
- **Click empty space** to launch a shooting star from the cursor.
- **Where it works:** in the hero the system is pure backdrop (no hover, drag or click). All interaction lives in the **Explore section** (`#cosmos`, right after the hero): a full-screen view of only the live system, which zooms in as you scroll to it (`CAMERA.exploreBox`). Scrolling past it fades the planets out (only the stars remain in later sections), and scrolling back brings them back. Leaving the section closes any open planet card.
- **Explore section scroll:** the section is ~3 screens tall (`h-[300svh]` on `#cosmos`). While it scrolls past, the camera circles the system (`CAMERA.exploreYaw`) and the planets advance along their orbits (`SCROLL_EARTH_ORBITS`), with golden motion trails. A pinned **Explore Departments** pill (top right) starts the planet tour.
- **Real motion:** orbital and spin speeds come from each planet's real period (`orbitDays`, `dayLength` on `PLANETS`), scaled by `EARTH_ORBIT_SPEED` / `EARTH_SPIN`. All ratios are true: Mercury laps ~4× faster than Earth, Neptune ~165× slower, and Venus and Uranus spin backwards.
- **Moons:** `MOONS` in config (Earth's Moon by default) orbit their parent planet at their real relative speed, on an inclined orbit with a thin gold ring, and are tidally locked. They share the planets' shader, reveal, hover label, click-to-fly and details card. In the ← / → tour each moon comes right after its planet (`TOUR`). Moons don't add cards to the Events grid.
- **Scrolling** slowly turns the system (`CAMERA.scrollYaw`). Mouse parallax and idle drift are always on.
- **Background detail:** a Milky Way band with a dust lane and warm core, distant spiral galaxies, bright flaring stars and random shooting stars (`BACKGROUND` in config, `scene/BackgroundDetails.jsx`).
- **Framing:** the system is auto-fitted to cover the viewport (`CAMERA.heroBox`). Phones roll the view so the orbits run lengthwise (`CAMERA.portraitRoll`).
- **Event info** for each planet (`track`, `blurb`) lives on `PLANETS` in config. The landing Events grid and the 3D info card both read it.
- **Countdown:** moon-phase cards (`ui/EventCountdown.jsx`). Each moon waxes toward full as its unit counts down, and the days moon becomes full on fest day (`EVENT.countdownFrom`).

## Department pages

The Sun is **CUBYC**, Christ University Yeshwanthpur Campus, the host. Its page is the hub: diving into it shows the directory of every department.

Every other world is a department: Economics (Mercury), Psychology (Venus), Computer Science (Earth), Mathematics (Moon), Commerce (Mars), **Cultural Events · SWO (the Space Station)**, Media Studies (Jupiter), English & Cultural Studies (Saturn), Management (Uranus) and DPS (Neptune).

The space station (`STATIONS` in config, `scene/StationModel.jsx`, `lib/stationShaders.js`) has its own dashed orbit between the asteroid belt and Jupiter. It has a rotating habitat ring with lit windows, a hub with a gold docking collar, and navy-and-gold solar wings, and it is lit like the planets. It hovers, clicks, flies-to and tours like any planet. Its interior is a gliding ring corridor.

- **Open:** click a world in the Explore section (the camera starts flying to it, then its page fades in), use **Enter department** on the tour card, or click a card in the Events grid.
- **Orbit view:** the world rises from the bottom edge as a semicircle with its radiation aura, which swells as it approaches and as the pointer nears it. The department name and brief sit above it.
- **Next / previous:** the buttons beside the semicircle, **← / →**, the dots in the top bar, or a sideways swipe on phones. The worlds hang off a wheel whose hub is below the screen, so a swap reads as a rotation.
- **Inside the world:** click the world (or **Enter**). It fills the screen from below, the atmosphere streaks past, and its environment becomes the backdrop for the events: the list, plus each event's format, faculty and student in-charge, and rules.
- **Leave:** **Esc** steps back (events → orbit → solar system). Browser Back / Forward work, and the landing keeps its scroll position.
- **Routes:** `#/dept/<world>`, `#/dept/<world>/events` and `#/dept/<world>/events/<event>` (for example `#/dept/earth/events/prime-prompt-ai-prompt-wars`) are deep-linkable.
- **Content:** everything lives in `src/config/departments.js`. Rules are `'Label: text'` strings, and lines starting with `- ` render as bullets. Department names and taglines also drive the planet tooltip, the tour card and the Events grid.

## Gallery page (`#/gallery`)

The navbar's **Gallery** link opens a full-screen page around an Interstellar-style black hole (`gallery/GalleryPage.jsx`, shaders in `lib/blackHole.js`). Photos drift in from the left and right on spiral paths. Near the hole they stretch, heat up and vanish behind the event horizon.

- **Interaction:** hover (or press) a photo to hold it, click to open it in a lightbox. The buttons, mouse wheel, drag and the arrow keys move the stream, Space pauses it, and **Esc** returns to the landing page.
- **Your photos:** drop images into **`src/assets/gallery/`** (jpg, png, webp or avif). They appear automatically in filename order. Titles come from the filenames, so `01-main-auditorium.jpg` becomes "Main Auditorium". Until then, the illustrated placeholders are shown.

## Schedule page (`#/schedule`)

The navbar's **Schedule** link opens a flight plan over a live Milky Way (`schedule/SchedulePage.jsx`, `schedule/Shuttle.jsx`, sky shader in `lib/milkyWay.js`).

- **Flying:** scroll, drag or swipe (or use the arrow keys, Home and End) to fly the shuttle from centre-left toward centre-right. A glowing flight line is drawn behind it, and each stop opens off the line in time order, alternating above and below.
- **Switching days:** click the shuttle (or the Day 01 / Day 02 switch) to boost it. The hull turns orange for Day 2, and the line rewinds and redraws with that day's plan. **Esc** returns to the landing page.
- **Content:** the timings are placeholders. Edit **`src/config/schedule.js`**, where each stop has a time, title, venue and tag.

## Rules page (`#/rules`)

The navbar's **Rules** link opens a spacecraft bridge (`rules/RulesPage.jsx`, window view in `lib/spaceView.js`). Galaxies and streaming stars fly past the window, and the craft keeps moving.

- **Console:** three live screens (systems, navigation radar, telemetry) and toggles for nav lights, shields and autopilot. The throttle sets the flight speed.
- **Display protocol:** powers the screens down and projects the rules on a gold hologram. Only the hologram scrolls, and its section tabs jump between sections. **Esc** closes the hologram, then the page.
- **Content:** edit **`src/config/rules.js`**. Wrap a key phrase in `**double asterisks**` to highlight it.

## Events page (`#/events`)

The navbar's **Events** link opens all 27 events as a fan of gold-framed glass cards (`eventsPage/EventsPage.jsx`, list built in `config/allEvents.js` from the departments).

- **Moving through the cards:** scroll, drag, swipe or use the arrow keys. The fan settles on the nearest card, and the orb on the left shows that event's world (planet, Moon or space station).
- **Search and filter:** search matches event, department and world names. The filter narrows by team size and department.
- **Opening a card:** clicking a side card brings it to the centre, and clicking the centre card (or **Enter**) opens its brief. **Register** goes to the event's full page in its department, and Back returns to the Events page.

## CUBYC Comms chatbot

A freighter floats in the bottom-right of every page (`chat/ChatBot.jsx`, `chat/Freighter.jsx`). Clicking it fires a laser volley, and the comms room opens: a porthole onto Earth from orbit (`lib/orbitView.js`) and a gold hologram where the chat happens. **Esc** closes it.

- **Built-in brain (always on):** `src/lib/chatBrain.js` answers fest questions instantly, offline and free: events (rules, team size, contacts, timing), departments, dates, venue, registration, schedule, general rules, and practical questions. It tolerates typos, remembers the event you were discussing ("who's the coordinator?"), and its answers include buttons that open the right page. Everything comes from the site's own config, so it stays in sync.
- **AI for everything else (optional):** questions the brain can't answer go to `api/chat.js`, a Vercel serverless function that calls Claude with the whole fest knowledge in its system prompt. To enable it:
  1. Deploy the project on **Vercel** (it detects Vite and the `api/` folder automatically).
  2. In Vercel → Project → Settings → Environment Variables, add **`ANTHROPIC_API_KEY`** (from console.anthropic.com), then redeploy.

  The key stays on the server and is never sent to the browser. The function rate-limits each visitor, keeps only the last 12 turns, and caches the system prompt. Without a key, unknown questions get a friendly fallback with suggestions. To use a different server, set `VITE_CHAT_API` to its URL.
- **Knowledge file:** `api/_knowledge.js` is generated from the config by `scripts/build-knowledge.mjs`. It regenerates on every `npm run build`, and you can run it by hand with `npm run knowledge`.

## Customization (`src/config/experience.js`)

| What | Where |
| --- | --- |
| Overall speed | `TIMELINE.timeScale` (0.8 is slower, 1.25 is faster). Phase boundaries are in `TIMELINE.phases`. Segment timings and easing are in `lib/timeline.js`. |
| Countdown / copy | `TIMELINE.countTicks` (`[time, numeral]`) and `TIMELINE.copy` (`[time, line]`) |
| Brand text | `BRAND`: fest name, `universityFull`, `campus`, `subline`, tagline |
| Event dates / countdown | `EVENT.start` / `EVENT.end` (IST, ISO strings), `dateLabel`, `days`. The hero countdown targets `start` and switches to “We are live” and then a thank-you note. |
| Landing size of the solar system | `CAMERA.heroBox`: the screen area (NDC, -1…1) the whole system is auto-fitted into, centred behind the hero. Bigger `hx`/`hy` gives a bigger system, and every planet's orbit always stays inside the box. `CAMERA.hero.offset` sets the viewing angle. |
| Colours | `PALETTE`: galaxy inside/outside, `nebula[]`, `warp[]` / `warpGold`, sun, orbit gold. Landing tokens are in `@theme` in `index.css`. |
| Particle counts | `GALAXY.count`, `WARP.streaks`, `NEBULA.count`, `SKY_STARS`, `BELT` (`high` / `low`) |
| Galaxy shape | `GALAXY.branches`, `spin`, `randomness`, `thickness`, `rotationSpeed`, `portraitScale` |
| Camera path | `CAMERA.start`, `cruise`, `arrivalDistance`, `warpFov`, `parallax`, `idleDrift` |
| Planets | `PLANETS[]`: `radius`, `orbit`, `angle`, `speed`, `tilt`, `colors`, `bands`, `ring`. Global multipliers: `PLANET_SCALE` and `ORBIT_SCALE`. The solar system's location and tilt are in `SOLAR`. |
| Landing content | `src/pages/LandingPage.jsx`. The comment block below the hero marks where future sections plug in. Keep the `#events`, `#schedule`, `#team` and `#contact` anchors for the navbar. |

**Art direction:** `?scrub=3.2` freezes the sequence at 3.2s. `?scrub=99` jumps to the landing page.

## Testing checklist

- [ ] Plays 6 → 0 with microcopy changing at 0, 1.5, 3.5 and 4.8s. The end card blooms at about 5s and the landing fades in with no white flash.
- [ ] The planets keep orbiting behind the landing page, and mouse parallax plus idle drift are active.
- [ ] **Skip intro** veils the cut, jumps to the end state and hands off cleanly.
- [ ] Switching tabs mid-sequence pauses it. Returning resumes it.
- [ ] With `prefers-reduced-motion`, there is no warp: about a 1.2s crossfade from galaxy to solar system, and no cursor or parallax.
- [ ] Phone portrait: the galaxy scales down, the HUD sits clear of the safe areas, and the system sits above the headline.
- [ ] Landscape phone and tablet: framing holds (`CAMERA.narrowFit`).
- [ ] Logo present: the PNG shows. Logo absent: the monogram shows and the build still passes.
- [ ] Dev (StrictMode): no console errors and no duplicate timeline.
- [ ] Real-device FPS check on a mid-range phone. `PerformanceMonitor` drops DPR to 1 if it struggles.
