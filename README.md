# Roadster — 1.9 Seconds

An interactive landing page concept for the Tesla Roadster, built with GSAP. No images: the car is a hand-drawn SVG, so every line can be drawn, repainted and spun.

**Run it:** open `index.html`, or serve the folder (`npx serve .`). GSAP is vendored in `vendor/`, so the only network request is for Google Fonts.

## What happens on the page

| Section | Motion |
|---|---|
| Intro | A timer counts 0.00 → 1.90 s in exactly 1.9 real seconds, then: "That was 1.9 seconds." |
| Hero | The car's outline draws itself (DrawSVG), the paint fades in, the wheels spin down and the suspension settles. Car and title follow the pointer. |
| Launch | Pinned and scroll-scrubbed. Scrolling works as the throttle: time, speed and distance come from a speed curve through the claimed 60 mph @ 1.9 s and 100 mph @ 4.2 s, so the car starts slow and then leaves the screen. |
| Origin | Words light up as you read them. |
| Numbers | Odometer counters that roll into place. |
| Anatomy | Horizontal scroll: three motors with torque flowing to the wheels, a glass roof that lifts off and drops into the trunk, and 2+2 seating. |
| Configure | Paint swaps tween one hex value into four gradient stops. The car dips on its suspension, the name re-types itself, the price rolls. You can drag the car: the wheels turn by the distance travelled and it springs back. |
| Reserve | The marquee speeds up and reverses with your scroll velocity, the button is magnetic, and a counter shows how far a Roadster would have gone at 250 mph while you've been on the page. |

The whole page shares a wind field (canvas streaks) driven by scroll velocity and launch speed, and the nav shows your scroll speed in mph.

It respects `prefers-reduced-motion`: no intro, no pinning, and every section is static and readable.

## Files

- `index.html`: markup and the car SVG template
- `css/style.css`: design tokens and layout (Archivo Expanded with JetBrains Mono)
- `js/main.js`: all animation
- `vendor/`: GSAP 3.13 core, ScrollTrigger, DrawSVGPlugin, SplitText, CustomEase

---

Independent design concept. Not affiliated with or endorsed by Tesla, Inc. Figures are manufacturer claims from the November 2017 unveiling.
