/* ═══════════════════════════════════════════════════════════
   BlueprintSheet — the studio's drawing-sheet background.

   Extracted so any route can sit on the same ground as the landing
   page: exposure tone, drafting grid, registration marks, vignette
   and film grain. Lighter than HomeScreen's full sheet (no atelier
   linework or PCB thesis) — this is the version for working pages.

   Must be rendered inside an element carrying `.bp-root`, which is
   where blueprint.css scopes its tokens.
   ═══════════════════════════════════════════════════════════ */

export const RegMark = ({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) => (
  <div className={`reg reg--${pos}`} aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M9 0v18M0 9h18" stroke="currentColor" strokeWidth=".7" />
    </svg>
  </div>
)

/* Build-stage glyph — the same cube language as the product cards.
   A glyph's stage must match its status pill. */
export type Stage = 'live' | 'beta' | 'dev'
const CUBE = 'M20 6 L34 14 L34 26 L20 34 L6 26 L6 14 Z'
const CUBE_LINES = 'M20 6 v28 M6 14 L34 26 M34 14 L6 26'

export function StageGlyph({ stage, size = 30 }: { stage: Stage; size?: number }) {
  if (stage === 'live') return (
    <svg className="art" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path className="fill--solid" d={CUBE} opacity=".22" />
      <g className="stroke stroke--built"><path d={CUBE} /><path d={CUBE_LINES} /></g>
    </svg>
  )
  if (stage === 'beta') return (
    <svg className="art" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path className="fill--ghost" d={CUBE} />
      <g className="stroke stroke--built"><path d={CUBE} /><path d="M20 6 v28" /></g>
      <g className="stroke stroke--sketch"><path d="M6 14 L34 26 M34 14 L6 26" /></g>
    </svg>
  )
  return (
    <svg className="art" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g className="stroke stroke--sketch"><path d={CUBE} /><path d={CUBE_LINES} /></g>
    </svg>
  )
}

export function BlueprintSheet({ grain = true }: { grain?: boolean }) {
  return (
    <>
      <div className="fx fx-tone"     aria-hidden="true" />
      <div className="fx fx-vignette" aria-hidden="true" />
      <div className="grid-bg"        aria-hidden="true" />
      <RegMark pos="tl" /><RegMark pos="tr" /><RegMark pos="bl" /><RegMark pos="br" />
      {grain && (
        <div className="fx fx-grain" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg">
            <filter id="bp-sheet-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={4} stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#bp-sheet-grain)" />
          </svg>
        </div>
      )}
    </>
  )
}

export default BlueprintSheet
