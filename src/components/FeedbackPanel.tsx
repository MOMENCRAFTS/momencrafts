// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — FeedbackPanel Component
// Premium tiered feedback system for investor portal
// Tier: visitor (HOUR/WEEK/MONTH) | cofounder (STRATEGIC/COFOUNDER/PERMANENT/FOUNDER)
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react'

const SUPABASE_FN = 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1'

const COFOUNDER_TIER = new Set(['PERMANENT', 'STRATEGIC', 'COFOUNDER', 'FOUNDER'])
const FOUNDER_TIER   = new Set(['PERMANENT', 'FOUNDER'])

const REACTIONS = [
  { id: 'love',        emoji: '🔥', label: 'Love it' },
  { id: 'interesting', emoji: '🤔', label: 'Interesting' },
  { id: 'potential',   emoji: '💡', label: 'Potential' },
  { id: 'pass',        emoji: '👎', label: 'Not for me' },
]

const INTEREST_LABELS = ['', 'Low', 'Moderate', 'Medium', 'High', 'Strong fit']

interface FeedbackState {
  reaction: string | null
  stars: number
  useCase: string
  comment: string
  ideaOpen: boolean
  ideaText: string
  introOpen: boolean
  introName: string
  introContext: string
  privateNote: string
  voiceDuration: number
  voiceActive: boolean
}

interface Props {
  productId: string
  productName: string
}

export function FeedbackPanel({ productId, productName }: Props) {
  const tokenType = sessionStorage.getItem('mcr_type') || 'MONTH'
  const isCofounder = COFOUNDER_TIER.has(tokenType)
  const isFounder   = FOUNDER_TIER.has(tokenType)

  const [open, setOpen]         = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [fb, setFb] = useState<FeedbackState>({
    reaction: null, stars: 0, useCase: '', comment: '',
    ideaOpen: false, ideaText: '',
    introOpen: false, introName: '', introContext: '',
    privateNote: '', voiceDuration: 0, voiceActive: false,
  })

  const up = (patch: Partial<FeedbackState>) => setFb(f => ({ ...f, ...patch }))

  // ── Voice recording ─────────────────────────────────────
  const [recording, setRecording] = useState(false)
  const [recSec, setRecSec]       = useState(0)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const stopRec = useCallback((sec: number) => {
    mediaRef.current?.stop()
    mediaRef.current?.stream.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
    up({ voiceDuration: sec })
  }, [])

  const startRec = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      mediaRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = e => chunksRef.current.push(e.data)
      rec.start()
      setRecording(true)
      setRecSec(0)
      let s = 0
      timerRef.current = setInterval(() => {
        s++
        setRecSec(s)
        if (s >= 30) stopRec(s)
      }, 1000)
    } catch {
      setError('Microphone access denied')
      setTimeout(() => setError(''), 3000)
    }
  }, [stopRec])

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!fb.reaction && !fb.comment && fb.stars === 0 && !fb.ideaText && !fb.introName) {
      setError('Add at least a reaction or a note to submit.')
      setTimeout(() => setError(''), 3000)
      return
    }
    setLoading(true)
    const token = sessionStorage.getItem('mcr_token') || ''
    try {
      const res = await fetch(`${SUPABASE_FN}/submit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          productId,
          feedbackType: 'composite',
          payload: {
            reaction:     fb.reaction,
            stars:        fb.stars || null,
            useCase:      fb.useCase || null,
            comment:      fb.comment || null,
            idea:         fb.ideaText || null,
            intro:        fb.introName ? { name: fb.introName, context: fb.introContext } : null,
            privateNote:  isFounder ? (fb.privateNote || null) : null,
            voiceDuration: fb.voiceDuration || null,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSubmitted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
      setTimeout(() => setError(''), 4000)
    }
    setLoading(false)
  }

  // ── Success state ────────────────────────────────────────
  if (submitted) return (
    <div className="fbk-success">
      <div className="fbk-success-icon">✦</div>
      <div className="fbk-success-title">Feedback Logged</div>
      <div className="fbk-success-sub">
        {isCofounder
          ? 'Your contribution is recorded in the & Co Registry.'
          : 'Thank you — your input shapes what we build next.'}
      </div>
    </div>
  )

  return (
    <div className="fbk-root" dir="ltr">

      {/* Trigger button */}
      <button
        className={`fbk-trigger${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        id={`fbk-trigger-${productId}`}
      >
        <span className="fbk-trigger-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </span>
        <span>{open ? 'Close Feedback' : isCofounder ? '✦ Co-Builder Feedback' : 'Give Feedback'}</span>
        {isCofounder && !open && <span className="fbk-trigger-badge">{tokenType}</span>}
        <span className={`fbk-trigger-chevron${open ? ' open' : ''}`}>›</span>
      </button>

      {/* Panel */}
      {open && (
        <div className={`fbk-panel${isCofounder ? ' fbk-panel--cofounder' : ''}`} id={`fbk-panel-${productId}`}>

          {/* Header */}
          <div className="fbk-header">
            <div className="fbk-header-left">
              <div className="fbk-header-title">Your Feedback</div>
              <div className="fbk-header-product">{productName}</div>
            </div>
            <div className={`fbk-header-tier fbk-tier--${tokenType.toLowerCase()}`}>{tokenType}</div>
          </div>

          {/* ── REACTIONS ── all tiers ─── */}
          <div className="fbk-section">
            <div className="fbk-section-label">REACTION</div>
            <div className="fbk-reactions">
              {REACTIONS.map(r => (
                <button
                  key={r.id}
                  className={`fbk-reaction-btn${fb.reaction === r.id ? ' selected' : ''}`}
                  onClick={() => up({ reaction: fb.reaction === r.id ? null : r.id })}
                  id={`fbk-reaction-${productId}-${r.id}`}
                  title={r.label}
                >
                  <span className="fbk-reaction-emoji">{r.emoji}</span>
                  <span className="fbk-reaction-label">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── INTEREST STARS ── cofounder+ ─── */}
          {isCofounder && (
            <div className="fbk-section">
              <div className="fbk-section-label">INTEREST LEVEL</div>
              <div className="fbk-stars">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    className={`fbk-star${n <= fb.stars ? ' filled' : ''}`}
                    onClick={() => up({ stars: fb.stars === n ? 0 : n })}
                    id={`fbk-star-${productId}-${n}`}
                    aria-label={`${n} stars`}
                  >★</button>
                ))}
                {fb.stars > 0 && (
                  <span className="fbk-star-label">{INTEREST_LABELS[fb.stars]}</span>
                )}
              </div>
            </div>
          )}

          {/* ── USE CASE ── cofounder+ ─── */}
          {isCofounder && (
            <div className="fbk-section">
              <div className="fbk-section-label">YOUR ANGLE</div>
              <select
                className="fbk-select"
                value={fb.useCase}
                onChange={e => up({ useCase: e.target.value })}
                id={`fbk-usecase-${productId}`}
              >
                <option value="">Select your perspective...</option>
                <option value="personal">Personal use</option>
                <option value="enterprise">Enterprise adoption</option>
                <option value="government">Government / Public sector</option>
                <option value="investment">Investment interest</option>
                <option value="partnership">Strategic partnership</option>
                <option value="distribution">Distribution / Channels</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          {/* ── COMMENT ── all tiers ─── */}
          <div className="fbk-section">
            <div className="fbk-section-label">
              {isCofounder ? 'YOUR TAKE' : 'QUICK NOTE'}
            </div>
            <textarea
              className="fbk-textarea"
              placeholder={isCofounder
                ? 'What stands out? Pain points addressed? Market fit? Your perspective as a co-builder...'
                : 'One-line take on this product...'}
              value={fb.comment}
              onChange={e => up({ comment: e.target.value.slice(0, isCofounder ? 600 : 140) })}
              rows={isCofounder ? 3 : 2}
              id={`fbk-comment-${productId}`}
            />
            <div className="fbk-char-count">{fb.comment.length} / {isCofounder ? 600 : 140}</div>
          </div>

          {/* ══════════════════════════════════════
              CO-BUILDER TOOLS — cofounder tier only
          ══════════════════════════════════════ */}
          {isCofounder && (
            <div className="fbk-cofounder-zone">
              <div className="fbk-zone-label">✦ CO-BUILDER TOOLS</div>

              {/* Idea submission */}
              <div className="fbk-extra-block">
                <button
                  className={`fbk-extra-toggle${fb.ideaOpen ? ' active' : ''}`}
                  onClick={() => up({ ideaOpen: !fb.ideaOpen })}
                  id={`fbk-idea-toggle-${productId}`}
                >
                  <span className="fbk-extra-ico">💡</span>
                  <span className="fbk-extra-text">
                    <span className="fbk-extra-main">Submit an Idea</span>
                    <span className="fbk-extra-sub">Feature, improvement, or new direction</span>
                  </span>
                  <span className={`fbk-extra-chevron${fb.ideaOpen ? ' open' : ''}`}>+</span>
                </button>
                {fb.ideaOpen && (
                  <div className="fbk-extra-body">
                    <textarea
                      className="fbk-textarea fbk-sub-textarea"
                      placeholder="Describe your idea clearly — the more specific, the more valuable..."
                      value={fb.ideaText}
                      onChange={e => up({ ideaText: e.target.value.slice(0, 500) })}
                      rows={3}
                      autoFocus
                      id={`fbk-idea-text-${productId}`}
                    />
                    <div className="fbk-char-count">{fb.ideaText.length} / 500</div>
                    {fb.ideaText.length > 10 && (
                      <div className="fbk-idea-note">
                        💡 Validated ideas earn a contribution entry in the & Co Registry
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Intro submission */}
              <div className="fbk-extra-block">
                <button
                  className={`fbk-extra-toggle${fb.introOpen ? ' active' : ''}`}
                  onClick={() => up({ introOpen: !fb.introOpen })}
                  id={`fbk-intro-toggle-${productId}`}
                >
                  <span className="fbk-extra-ico">🤝</span>
                  <span className="fbk-extra-text">
                    <span className="fbk-extra-main">Know someone who needs this?</span>
                    <span className="fbk-extra-sub">Make an intro — log it as a contribution</span>
                  </span>
                  <span className={`fbk-extra-chevron${fb.introOpen ? ' open' : ''}`}>+</span>
                </button>
                {fb.introOpen && (
                  <div className="fbk-extra-body fbk-intro-body">
                    <input
                      className="fbk-input"
                      placeholder="Name · Company · Role"
                      value={fb.introName}
                      onChange={e => up({ introName: e.target.value })}
                      id={`fbk-intro-name-${productId}`}
                    />
                    <input
                      className="fbk-input"
                      placeholder="Why they'd need this (optional)"
                      value={fb.introContext}
                      onChange={e => up({ introContext: e.target.value })}
                      id={`fbk-intro-ctx-${productId}`}
                    />
                    <div className="fbk-intro-note">
                      🔗 Momen will be notified via WhatsApp with your name attached
                    </div>
                  </div>
                )}
              </div>

              {/* Voice note */}
              <div className="fbk-extra-block">
                <div className="fbk-voice-row">
                  {fb.voiceDuration > 0 ? (
                    <div className="fbk-voice-done">
                      <span className="fbk-voice-done-ico">🎙</span>
                      <span className="fbk-voice-done-txt">Voice note recorded — {fb.voiceDuration}s</span>
                      <button
                        className="fbk-voice-reset"
                        onClick={() => { setRecSec(0); up({ voiceDuration: 0 }) }}
                        title="Remove voice note"
                      >✕</button>
                    </div>
                  ) : (
                    <button
                      className={`fbk-voice-btn${recording ? ' recording' : ''}`}
                      onClick={recording ? () => stopRec(recSec) : startRec}
                      id={`fbk-voice-${productId}`}
                    >
                      {recording ? (
                        <>
                          <span className="fbk-rec-pulse" />
                          <span className="fbk-voice-btn-text">Recording {recSec}s / 30s · Click to stop</span>
                          <div className="fbk-rec-bar">
                            <div className="fbk-rec-bar-fill" style={{ width: `${(recSec / 30) * 100}%` }} />
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="fbk-voice-ico">🎙</span>
                          <span className="fbk-voice-btn-text">Record a 30s Voice Note</span>
                          <span className="fbk-voice-hint">Microphone required</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              PRIVATE NOTE — PERMANENT / FOUNDER only
          ══════════════════════════════════════ */}
          {isFounder && (
            <div className="fbk-private-zone">
              <div className="fbk-private-header">
                <span>🔒</span>
                <span>PRIVATE NOTE TO MOMEN</span>
                <span className="fbk-private-badge">FOUNDERS ONLY</span>
              </div>
              <textarea
                className="fbk-textarea fbk-private-textarea"
                placeholder="Direct message — visible only to Momen. Strategy, concerns, ideas for the relationship..."
                value={fb.privateNote}
                onChange={e => up({ privateNote: e.target.value.slice(0, 800) })}
                rows={3}
                id={`fbk-private-${productId}`}
              />
              <div className="fbk-char-count">{fb.privateNote.length} / 800</div>
            </div>
          )}

          {/* Error */}
          {error && <div className="fbk-error" role="alert">{error}</div>}

          {/* Submit */}
          <button
            className={`fbk-submit${loading ? ' loading' : ''}`}
            onClick={handleSubmit}
            disabled={loading}
            id={`fbk-submit-${productId}`}
          >
            {loading ? (
              <><span className="fbk-spinner" />Submitting...</>
            ) : (
              <>Send Feedback <span className="fbk-submit-arrow">→</span></>
            )}
          </button>

          {/* Footer */}
          <div className="fbk-footer">
            {isCofounder
              ? '✦ Co-builder submissions are logged to the & Co Registry'
              : 'Your feedback is private and helps shape the product roadmap'}
          </div>
        </div>
      )}
    </div>
  )
}
