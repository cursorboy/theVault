# theVault — Visual Identity

## Style Prompt

Editorial / private-notebook aesthetic. Paper-cream base, warm deep-brown ink for type, a single deep teal accent. Mono-leaning typography pairs JetBrains Mono captions with an Instrument Serif display face and Inter for UI text. Restrained chroma, high contrast, lots of whitespace. Movement is precise, not flashy: short eases, small offsets, staggered reveals. Platform tints (instagram pink, tiktok teal-pink) appear only as small pill badges. The whole thing should feel like a thoughtful magazine spread, not a tech app.

## Colors

| token | hex | role |
|---|---|---|
| ink | `#F5F0E8` | page background (paper cream) |
| vault | `#EFE8DC` | panel background (warm cream) |
| panel | `#FBF7F0` | raised cards |
| edge | `#E4DCCC` | subtle border |
| edge2 | `#D2C7B2` | visible border |
| text | `#1F1B14` | primary type (deep brown-black) |
| text2 | `#5A5142` | secondary type |
| text3 | `#8C8470` | tertiary type |
| accent | `#1E4D54` | deep teal (single accent) |
| accentSoft | `#3D7079` | softened accent |
| accentInk | `#F5F0E8` | cream type on accent surfaces |
| accent2 | `#7A4E2E` | warm sienna for secondary highlights |
| ig | `#C44A6B` | instagram pink |
| tt | `#3DB8B2` | tiktok teal |
| ttPink | `#E0506E` | tiktok pink |

## Typography

- Display: `"Instrument Serif", Georgia, serif` — italics for hero phrases, regular for stat labels
- Body / UI: `"Inter", system-ui, sans-serif` — weights 400/500/600
- Mono: `"JetBrains Mono", ui-monospace, monospace` — for tags, metadata, system messages, small caps labels

OpenType: `font-feature-settings: "ss01", "cv11"` on Inter for tighter numerals. `font-variant-numeric: tabular-nums` on stat columns.

## Motion

- Eases: `power3.out` (entrances), `power2.in` (occasional outs on final scene only), `expo.out` (hero reveals), `quint.out` (mono labels)
- Stagger: 60-100ms between sibling reveals
- Offset first animation 0.15-0.3s into each scene
- No exit animations — transitions handle scene changes

## What NOT to Do

- No dark backgrounds (this is a paper-cream brand, not a tech-bro dark dashboard)
- No purple gradients, no neon glow, no gradient meshes
- No emojis anywhere
- No emdashes in copy (use comma or new line)
- No exclamation points
- No serif for body text — serif is reserved for the brand mark + hero phrases
- No more than one accent color in a single frame (the deep teal is the lone hero color)
