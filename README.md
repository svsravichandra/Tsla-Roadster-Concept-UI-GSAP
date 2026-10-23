# Roadster — Roads Optional

An interactive landing page concept for the Tesla Roadster, built with GSAP. **v2** follows the October 15, 2026 reveal at SpaceX's McGregor, Texas test site: cold-gas thrusters, a vacuum system that clings the underbody to any surface, and a car that climbs a ramp until it hangs from the ceiling, lets go, rolls, and lands. No images: the car is a hand-drawn SVG, so every line can be drawn, repainted, spun and flown.

**Live demo:** https://svsravichandra.github.io/roadster-roads-optional/

**Run it locally:** open `index.html`, or serve the folder (`npx serve .`). GSAP is vendored in `vendor/`, so the only network request is for Google Fonts.

## What happens on the page

| Section | Motion |
|---|---|
| Intro | A timer counts 0.00 → 0.81 s in exactly 0.81 real seconds: the 0–60 run shown at the reveal. |
| Hero | The outline draws itself, the paint fades in, the wheels spin down, then the car hops on a burst of cold gas. |
| Launch | Pinned and scroll-scrubbed. The red 2026 car (60 mph in 0.81 s, rear thrusters venting) races a dashed outline of the 2017 promise (60 mph in 1.9 s). |
| The reveal | Pinned. The car follows a MotionPath up a quarter-pipe and across the ceiling with suction arrows showing, drops off the end, does a full axial roll, and fires its downward thrusters to land. Step labels track the timeline. |
| Nine years later | Words light up as you read them. |
| Numbers | Odometers: 10 thrusters, 600 L of compressed air, 230+ mph, 300 mi. |
| Anatomy | Horizontal scroll: ten thrusters venting at random around a plan view, an inverted car held to a ceiling, and seat plans for the three trims. |
| Configure | Paint swaps tween four gradient stops. Trims set the reservation (Performance $50,000, Thrust $250,000, Rocket invite only); Thrust lights its rear thrusters, Rocket hops on all of them. Drag the car to roll it. |
| Reserve | Velocity-reactive marquee, magnetic button, and a counter of how far a Roadster at 230 mph would have gone while you've been on the page. |

It respects `prefers-reduced-motion`: no intro, no pinning, and every section is static and readable.

## Sources for v2 figures

Figures are as reported from the October 15, 2026 reveal (TechCrunch, Electrek, Fox Business, Aviation Week and others). Outlets disagree on some acceleration numbers; the page uses "under 1 s" and the 0.81 s run reported at the event, and holds the launch readout at 60 mph because higher speeds weren't published.

## Files

- `index.html`: markup and the car SVG template
- `css/style.css`: design tokens and layout (Archivo Expanded with JetBrains Mono)
- `js/main.js`: all animation
- `vendor/`: GSAP 3.13 core, ScrollTrigger, MotionPathPlugin, DrawSVGPlugin, SplitText, CustomEase

---

Independent design concept. Not affiliated with or endorsed by Tesla, Inc. or SpaceX.
