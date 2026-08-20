/* ═══════════════════════════════════════════════════════════════
   MomenCrafts — central i18n
   English is the default language; Arabic is an opt-in toggle.

   Usage inside a component:
     const { t, lang, isAr, toggleLang } = useT()
     <h1>{t.home.hero.title}</h1>

   Adding strings:
     1. open the relevant file in ./dict/
     2. add the key to `en`
     3. TypeScript will now force you to add it to `ar`
   ═══════════════════════════════════════════════════════════════ */

import { useCallback } from 'react'
import { useAppStore } from '@/stores/useAppStore'

import * as common   from './dict/common'
import * as home     from './dict/home'
import * as gate     from './dict/gate'
import * as qadaa    from './dict/qadaa'
import * as sabha    from './dict/sabha'
import * as roger    from './dict/roger'
import * as tdc      from './dict/tdc'
import * as edgetack from './dict/edgetack'

export type Lang = 'en' | 'ar'

const EN = {
  common:   common.en,
  home:     home.en,
  gate:     gate.en,
  qadaa:    qadaa.en,
  sabha:    sabha.en,
  roger:    roger.en,
  tdc:      tdc.en,
  edgetack: edgetack.en,
}

const AR: typeof EN = {
  common:   common.ar,
  home:     home.ar,
  gate:     gate.ar,
  qadaa:    qadaa.ar,
  sabha:    sabha.ar,
  roger:    roger.ar,
  tdc:      tdc.ar,
  edgetack: edgetack.ar,
}

export type Dict = typeof EN

export const DICTS: Record<Lang, Dict> = { en: EN, ar: AR }

/** Non-hook accessor — for use outside React (event handlers, helpers). */
export function dict(lang?: Lang): Dict {
  return DICTS[lang ?? useAppStore.getState().lang]
}

export interface Translation {
  /** The active dictionary. */
  t: Dict
  lang: Lang
  isAr: boolean
  /** 'rtl' when Arabic is active, otherwise 'ltr'. */
  dir: 'rtl' | 'ltr'
  toggleLang: () => void
  setLang: (l: Lang) => void
  /** Pick one of two values based on the active language. */
  pick: <T>(en: T, ar: T) => T
}

export function useT(): Translation {
  const lang       = useAppStore((s) => s.lang)
  const toggleLang = useAppStore((s) => s.toggleLang)
  const setLang    = useAppStore((s) => s.setLang)

  const isAr = lang === 'ar'
  const pick = useCallback(<T,>(en: T, ar: T): T => (isAr ? ar : en), [isAr])

  return {
    t: DICTS[lang],
    lang,
    isAr,
    dir: isAr ? 'rtl' : 'ltr',
    toggleLang,
    setLang,
    pick,
  }
}

/**
 * Keeps <html lang> / <html dir> in sync with the active language, and
 * mirrors it onto <body data-lang> so CSS can target either direction.
 * Mounted once, at the App root.
 */
export function useDocumentLang(): Lang {
  const lang = useAppStore((s) => s.lang)

  if (typeof document !== 'undefined') {
    const el = document.documentElement
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    if (el.lang !== lang) el.lang = lang
    if (el.dir !== dir) el.dir = dir
    if (document.body && document.body.dataset.lang !== lang) {
      document.body.dataset.lang = lang
    }
  }

  return lang
}
