import { useT } from '@/i18n'

/* ═══════════════════════════════════════════════════════════
   LangToggle — the single, site-wide English ⇄ Arabic switch.
   English is the default; this button is the only way into Arabic.
   ═══════════════════════════════════════════════════════════ */

interface Props {
  /** `floating` pins it to the top corner; `inline` sits in a nav row. */
  variant?: 'floating' | 'inline'
  className?: string
}

export function LangToggle({ variant = 'floating', className = '' }: Props) {
  const { isAr, toggleLang, t } = useT()

  return (
    <button
      type="button"
      className={`lang-toggle lang-toggle--${variant} ${className}`.trim()}
      onClick={toggleLang}
      aria-label={t.common.langToggleAria}
      title={t.common.langToggleAria}
      lang={isAr ? 'en' : 'ar'}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
      </svg>
      <span>{isAr ? 'English' : 'العربية'}</span>
    </button>
  )
}

export default LangToggle
