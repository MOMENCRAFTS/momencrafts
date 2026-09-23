# Sahhaaab on momencrafts.com — card 10 and a showcase page

**Date:** 2026-09-23 · **Status:** BUILT the same evening — all seven decisions taken by recommendation
(`docs/plan/decisions.md`, D-SAH-1 to D-SAH-7), the ten files are STAGED and NOT committed; `npm run build`
green; headless render of /home and /sahhaaab passed in EN and AR at 1280 px and 390 px (card 10 with DEV
pill, cards 11 to 14 renumbered, counters 14 and 7, no overflow, no console errors). Waits for Momen's
COMMIT and PUSH, then the live journal row (section 3, row 10). · **Owner:** Momen · **Written by:** Claude

Also fixed while moving the counts: the Arabic founder line and the Arabic adoption line still said "the ten
products" from before KURAS; both now say fourteen.

---

## 1. What this is, in plain words

Sahhaaab (سحّاب, "the one who draws") is the studio's phone duel game, in development in its own repo
(`Projects/momencrafts/sahhaaab`, private GitHub MOMENCRAFTS/sahhaaab). It is not on momencrafts.com yet.

This plan adds it to the site the same way KURAS was added on 2026-09-15 (commit b2a8c62), as **product 14**:

1. a card in the home grid (card 10, DEV pill, right after KURAS),
2. an item in the investor portfolio (expand-to-read),
3. a line in the ballot ("which product should we build next"),
4. a showcase page at **/sahhaaab** (EN + AR), modelled on the KURAS page,
5. the counters moving from 13 products to 14, and (if D-SAH-2 is yes) 6 industries to 7,
6. a journal entry "Sahhaaab joins the portfolio".

The whole site, home grid included, sits behind the investor gate (`/home` and every product route are
inside `AuthGuard`). So this is **not a public reveal**: only people with a token see the name. The
pending trademark and store-name checks (game decisions log, Sep 19) are not blocked by this work.

Nothing in this plan touches the game repo. It is read for facts and art only; another window owns
its build run.

## 2. What the site will say about the game (facts, as of 2026-09-24)

Every line below comes from the game repo (`docs/DECISIONS.md`, `docs/RUN-LOG.md`, `design/`).
The site must not claim more than this.

- One-on-one real-time duels on the phone: holster the phone at your hip, wait for the buzz (no
  countdown), draw, tilt to aim, tap to fire, six rounds then reload. Draw early and you lose health.
- Set in Old Damascus: nine places in the hub (coffeehouse, tailor, gunsmith, notice board, merchant,
  khan gate, courtyard, scribe, runner). The loop is rivalry, reputation, neighbourhood pride.
- Arabic first, Eastern numerals by default, English second, one fixed layout in both languages.
- Original world: own art (flat vector, produced from the studio's own sources), own words, own rules.
- Version 1 plays offline against bots with the real UI and art; online duels, gangs, missions, shop
  come later. Engine is pure TypeScript; the app is Expo (React Native); server planned on AWS Bahrain.
- Where it stands: engine, art pipeline, region data, motion adapter, real hit zones and the duel
  scene with HUD and result are built (commits 11 to 21, 302 tests green); the first feel-test build on
  real phones is the next stop.
- Market: Gulf, Saudi and Kuwait first. The phone-duel genre had millions of Gulf players before its
  classic died in 2016 and nothing credible replaced it (D-SAH-3 decides whether this line is used).
- Money: cosmetics, energy, name changes and bounty flair for money; duel-affecting items earned with
  gold; never pay-to-win. The game log marks this "leaning"; the site states it as the stance (D-SAH-5).

**Hard rule from the game repo:** the reference game's name appears nowhere. "The genre's classic" is
the most the site may say. No art from `design/reference/` or the UI handoff screens; only files in
`design/assets/gfx/`, which the manifest marks "original, MomenCrafts".

## 3. Exact footprint (mirrors the KURAS commit, 10 files)

| # | File | Change |
|---|---|---|
| 1 | `src/i18n/dict/home.ts` | `cards.sahhaaab` (EN + AR); `portfolio.items.sahhaaab` (EN + AR); counts 13 to 14 at EN lines 27, 47, 233, 415, 416, 431 and AR lines 605, 624, 805, 985; "games" added to the studio sentence (EN ~137, AR ~712) if D-SAH-2; journal fallback entry at the top of EN (~486) and AR (~1051) |
| 2 | `src/screens/HomeScreen.tsx` | `PUBLIC_CARDS`: new row `sahhaaab` no `10`, DEV, href `/sahhaaab`; muscle, aqar, sabha become 11, 12, 13; xhb becomes 14 (the number is display-only). `INV_CARDS`: `SAHHAAAB`, cat `Mobile Gaming`, badge `dev`, keys `sector, revenue, status, market`, demoLink `/sahhaaab`. `BALLOT_PRODUCTS`: one line after kuras. Traction counters line 1002 `n: 13` to 14 and line 1004 `n: 6` to 7 (if D-SAH-2). `JOURNAL_META`: `{ category: 'update', product: 'Sahhaaab', pinned: true }` first |
| 3 | `src/i18n/dict/sahhaaab.ts` | new, same shape as `kuras.ts`: nav, hero, facts, how, why, cta, footer, EN then AR |
| 4 | `src/i18n/index.ts` | import and register `sahhaaab` in both languages (3 lines, as kuras) |
| 5 | `src/screens/SahhaaabScreen.tsx` | copy of `KurasScreen.tsx` with the dict swapped and class `sahhaaab-page product-page` |
| 6 | `src/styles/sahhaaab.css` | scoped `.sahhaaab-page`: hero image frame, facts strip, dark ink on white cards, Arabic font fallback for the serif display face (same four rules as kuras.css) |
| 7 | `src/assets/sahhaaab/hero.png` | the hero art (D-SAH-4), about 140 KB, lighter than the KURAS mascot |
| 8 | `src/App.tsx` | `const Sahhaaab = lazy(...)` and `<Route path="/sahhaaab" element={<AuthGuard><Sahhaaab /></AuthGuard>} />` |
| 9 | `vercel.json` | `{ "source": "/sahhaaab", "destination": "/index.html" }` next to `/kuras` |
| 10 | `co_journal` (live table) | one pinned English row, added by Momen in the admin Journal tab after PUSH, or by Claude on his OK (D-SAH-6). Not a file. |

The shared `product-nav.css` already fixes the stacked nav on product pages; nothing new is needed there.

## 4. Proposed copy

### 4a. Home card (`cards.sahhaaab`)

EN
- name: `SAHHAAAB · سحّاب`
- tagline: `A real-time one-on-one duel game for the phone, set in Old Damascus. Holster the phone at your hip, wait for the buzz, draw, and fire.`
- tags: `Mobile Game` · `Real-Time Duels` · `Arabic First` · `Old Damascus`
- link: `View Sahhaaab`

AR
- name: `SAHHAAAB · سحّاب`
- tagline: `لعبة مبارزة فردية لحظية على الجوال في دمشق القديمة. ضع الجوال على خصرك، انتظر الاهتزاز، اسحب، وأطلق.`
- tags: `لعبة جوال` · `مبارزات لحظية` · `العربية أولًا` · `دمشق القديمة`
- link: `عرض Sahhaaab`

### 4b. Investor portfolio item (`portfolio.items.sahhaaab`)

EN
- tagline: `Real-Time Duel Game`
- desc: `A phone game of one-on-one duels: you holster the phone, wait for the buzz, draw, tilt to aim, and fire. Set in Old Damascus, with its coffeehouse, tailor, gunsmith and notice board, and with rivalry, reputation and neighbourhood pride as the loop. The phone-duel genre had millions of Gulf players before its classic died in 2016; nothing credible replaced it. Arabic first. Version 1 plays offline against bots; online duels follow.`
- sector: `Mobile Gaming · Arab heritage`
- revenue: `In-app purchases — cosmetics and energy, never pay-to-win`
- status: `In development — duel engine, art pack and duel scene built; first feel-test build next`
- market: `Gulf — Saudi and Kuwait first`
- demoLabel: `View Sahhaaab`

AR
- tagline: `لعبة مبارزات لحظية`
- desc: `لعبة مبارزة فردية على الجوال: تضع الجوال على خصرك، تنتظر الاهتزاز، تسحب، تميل الجوال للتصويب، وتطلق. تدور في دمشق القديمة بمقهاها وخياطها وصانع أسلحتها ولوحة إعلاناتها، ودافعها التنافس والسمعة وفخر الحارة. كان لهذا النوع من الألعاب ملايين اللاعبين في الخليج قبل أن تتوقف لعبته الكلاسيكية عام ٢٠١٦ ولم يعوّضها شيء جدير. العربية أولًا. النسخة الأولى تُلعب دون اتصال ضد خصوم آليين، والمبارزات عبر الإنترنت تليها.`
- sector: `ألعاب الجوال · تراث عربي`
- revenue: `مشتريات داخل التطبيق — مظاهر وطاقة، ولا دفع مقابل الفوز`
- status: `قيد التطوير — محرك المبارزة وحزمة الرسوم ومشهد المبارزة مبنية، ونسخة اختبار الإحساس هي التالية`
- market: `الخليج — السعودية والكويت أولًا`
- demoLabel: `عرض Sahhaaab`

If D-SAH-3 is "no", the sentence about the classic is dropped from both languages.

### 4c. Showcase page (`sahhaaab.ts`), English outline; Arabic written at build time to the same shape

- nav: `How a duel works` · `Why it is different` · `Talk to the founder →` · `← Investor Room`
- hero eyebrow `MOMENCRAFTS STUDIOS · GAMES`; title `SAHHAAAB · سحّاب` / *Holster. Wait.* / `Draw.`
- hero sub: `A real-time one-on-one duel game for the phone, set in the alleys of Old Damascus. You holster the phone at your hip, wait for the buzz, draw, tilt to aim, and fire. An original world with its own art, its own words and its own rules.`
- badges: `IN DEVELOPMENT` · `MOBILE GAME · ARABIC FIRST` · `ORIGINAL WORLD`
- facts strip: `1 v 1` real-time duels · `9` places in Old Damascus · `AR · EN` Arabic first · `6` rounds in the cylinder
- how (4 steps): **Pick a rival** (the hub, the notice board, rivals by name) · **Holster** (phone at your hip, no countdown, the buzz is the signal; draw early and you pay in health) · **Draw and fire** (raise, tilt to aim, tap to fire, six rounds then reload) · **Reputation** (gold, bounty and level when you win; the neighbourhood knows when you lose; rematch)
- why (4 pillars): **An original world** (Old Damascus, tarboushes not hats, all art and words the studio's own) · **The phone is the gun** (sensors and haptics, no on-screen joystick) · **Arabic first** (Arabic with Eastern numerals by default, English second, one layout) · **Fair fights** (cosmetics for money, duel items earned with gold, never pay-to-win)
- cta: `CO-BUILD` / `Help bring Sahhaaab to the Gulf` / `In development. The duel engine, the art pack and the duel scene are built; the first feel-test build on real phones is next, then online duels. Game designers, Arabic writers, artists and co-founders are welcome.`
- footer as KURAS.

Arabic numerals in AR copy follow home.ts (Eastern: ٢٠١٦, ١٤).

### 4d. Journal entry

`Sahhaaab joins the portfolio — product 14` / `An original real-time duel game for the phone, set in Old Damascus: holster, wait for the buzz, draw, fire. Arabic first, Gulf first. Version 1 plays offline against bots; the first feel-test build is next.` · date Sep 2026 · category Update · pinned.

## 5. Hero art (D-SAH-4)

Candidates in the game repo, all original, all in `design/assets/gfx/`:

| File | Size | Fits |
|---|---|---|
| `scene-dam-opening.png` | 1024×1536, 139 KB, portrait | **Recommended.** The opening alley scene; shown in a rounded phone-shaped frame with a drop shadow it reads as "the game on a phone" |
| `figure-m-aiming@3x.png` | 299×792, 154 KB, transparent | Alternative: a cut-out duelist, the way KURAS shows its mascot |
| `hub-dam-noon.png` | 1536×1024, 171 KB, landscape | The hub; too wide for the hero column, fine as a section band later |
| `brand-app-icon.png` | 1024×1024, 19 KB | Could sit in the card row later; the home card has no image slot today |

The file is copied into `src/assets/sahhaaab/hero.png`; Vite bundles it like the KURAS mascot.

## 6. Build order and checks

1. Card first: home.ts card + portfolio + counts, HomeScreen.tsx rows and counters. `npx tsc --noEmit` and `npm run build` green. About 30 minutes.
2. Page: sahhaaab.ts, SahhaaabScreen.tsx, sahhaaab.css, hero asset, index.ts, App.tsx, vercel.json. About 1.5 hours including the Arabic.
3. Journal fallback + JOURNAL_META.
4. Preview both languages: `npm run dev`, Momen signs in with a real token; or headless, seed sessionStorage `mcr-store` with a token and stub `**/functions/v1/verify-token` to `{valid:true}` (the Playwright setup lives in the kuras repo).
5. Check: card 10 sits after KURAS with the DEV pill and glyph; the WhatsApp cards read 11 to 13 and XHB 14; the counters read 14 (and 7); the portfolio item expands with four labelled lines and "View Sahhaaab" opens /sahhaaab; the page nav does not stack on mobile; the language toggle stays in its corner in Arabic; the hero image does not overflow at 390 px; `/sahhaaab` reloads directly on Vercel (rewrite).
6. Momen: **COMMIT**, **PUSH** (Vercel deploys from master), then the live journal row.

Whole job is one session, the same size as KURAS.

## 7. Who does what

- Claude builds directly in this repo, staged and uncommitted, on Momen's "go" (D-SAH-7).
- Momen: the seven decisions, COMMIT, PUSH, the live journal row (or an OK for Claude to insert it).
- Nothing is written to the Sahhaaab repo by this work.
