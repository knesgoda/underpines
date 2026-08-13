# Make the three messenger skins true to their inspirations

Right now the skins are a palette swap layered over the Under Pines messenger. The goal: when a skin is selected, every message surface (conversation list, thread header, transcript, composer, mobile screens) should read as the real thing — chrome, type, spacing, and colors — without adding or removing any buttons or features.

## What each skin should look like

**ICU — classic ICQ (1999-2002)**
- Windows-classic chrome: `#d4d0c8` panels, 2px outset/inset bevels, zero corner radius, hard 1px black-ish borders, drop shadow into the teal `#128985` desktop backdrop.
- Title bars: 25px, blue gradient (`#17318a → #4c8cd5`), white 10px bold Tahoma, square bevel window buttons.
- Transcript: flat white, no bubbles. Each line is `<nick>` in bold colored Tahoma 11px (incoming green/navy, outgoing rust) followed by the message on the same or next line, tight 2px line spacing — the ICQ chat-window look.
- Contact list: white inset list, square rows, selected row solid blue `#001c9b` with white text, green flower/status glyph column.
- Composer: white 2px-inset text area, thin bevel toolbar strip above it, small red "Send" label on an outset grey button at the right.

**Bullseye — AOL Instant Messenger**
- Windows 98/XP grey (`#ece9d8`/`#d4d0c8`) with blue gradient title bar (`#1680f8 → #0354cc`), square corners, thin `#555` borders.
- Transcript: white, no bubbles. `ScreenName:` in bold blue for the other person and bold red for you, message in Arial 13px right after the colon, no timestamps, no avatars — exactly the AIM IM window.
- Buddy list: grey panel, bold group headers ("Buddies (0/7)") with a yellow highlight bar, italic grey offline names, indented list, square rows.
- Composer: white typing box with a small format strip above, and a tall 3D outset grey Send button on the right with the red/underlined "Send" treatment.

**Emessen — MSN / Windows Live Messenger**
- Silver-blue glass: rounded 10-13px panels, `linear-gradient` blue title bar with white glow, inset white highlights, soft outer shadow on a `#dbe9f8` field.
- Contact list: white with light blue selection, green online dots, group rows in blue with a chevron, personal-message line in grey italic under the display name.
- Transcript: white with light blue name lines — display name in blue Trebuchet bold, message beneath in dark grey; my messages same layout in a warmer color. Rounded panel edges, subtle glass sheen at the top.
- Composer: rounded white typing box inside a glass strip, blue-outlined emoticon/attach icons (existing ones only, restyled), and the classic green gradient Send button.

## How this is done

- All work happens in `src/styles/messenger-skins.css`, which already carries both vocabularies: the handoff `.chat-window` classes (desktop stage) and the `.msg-skin-*` hooks (ported/mobile screens). Each skin block gets rewritten to cover **both**, so a skin looks period-correct on desktop and phone.
- Bubble-based surfaces get flipped to line-based transcripts for ICU and Bullseye by neutralizing `.msg-skin-bubble` (no background, no border, no radius, name + text inline) and styling the name via `.msg-skin-label`; Emessen keeps a soft rounded panel.
- The mobile conversation list rows, thread header, and composer already carry `.msg-skin-*` classes, so no component changes are needed beyond, at most, adding a class name or two where a surface is currently unhooked (e.g. list header, day dividers, empty state). Skin thumbnails in `SkinThumb.tsx` get their palettes updated to match the new looks.
- No functionality changes: no new buttons, no removed controls, no data or backend changes. Fonts stay to system stacks (Tahoma/Arial/Trebuchet) — no new webfonts.
- Verification: typecheck, lint, tests, build, plus screenshots of each skin (thread + list, both viewports) using a local mock harness, since signed-in checks can't run in the sandbox.
