// ═══════════════════════════════════════════════════════════
// MOMENCRAFTS — RequestAccessForm
// 3-step: Info → Twilio OTP → Token Granted (auto-fills gate)
// ═══════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from 'react'

const SUPABASE_URL = 'https://isciigqmdfcozrtojqcm.supabase.co'

const CATEGORIES_EN = [
  'Investor / Angel',
  'Co-founder / Partner',
  'Industry Expert / Advisor',
  'Builder / Developer',
  'Press / Media',
  'Healthcare Professional',
  'FPV / Drone Enthusiast',
  'Other',
]
const CATEGORIES_AR = [
  'مستثمر / ملاك',
  'شريك مؤسس',
  'خبير / مستشار',
  'مطور / منشئ',
  'صحافة / إعلام',
  'متخصص رعاية صحية',
  'هواة الطائرات FPV',
  'أخرى',
]

const COUNTRY_CODES = [
  { code: '+966', flag: '🇸🇦', name: 'SA' },
  { code: '+971', flag: '🇦🇪', name: 'AE' },
  { code: '+965', flag: '🇰🇼', name: 'KW' },
  { code: '+974', flag: '🇶🇦', name: 'QA' },
  { code: '+973', flag: '🇧🇭', name: 'BH' },
  { code: '+968', flag: '🇴🇲', name: 'OM' },
  { code: '+1',   flag: '🇺🇸', name: 'US' },
  { code: '+44',  flag: '🇬🇧', name: 'GB' },
  { code: '+49',  flag: '🇩🇪', name: 'DE' },
  { code: '+33',  flag: '🇫🇷', name: 'FR' },
  { code: '+91',  flag: '🇮🇳', name: 'IN' },
  { code: '+20',  flag: '🇪🇬', name: 'EG' },
  { code: '+212', flag: '🇲🇦', name: 'MA' },
]

type Step = 'form' | 'otp' | 'granted'

interface Props {
  lang: 'ar' | 'en'
  onTokenGranted: (token: string) => void
}

export function RequestAccessForm({ lang, onTokenGranted }: Props) {
  // ── Step 1 state ──
  const [step, setStep]           = useState<Step>('form')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [countryCode, setCC]      = useState('+966')
  const [phone, setPhone]         = useState('')
  const [category, setCategory]   = useState('')
  const [company, setCompany]     = useState('')
  const [jobTitle, setJobTitle]   = useState('')
  const [referral, setReferral]   = useState('')
  const [message, setMessage]     = useState('')
  const [linkedin, setLinkedin]   = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Step 2 state ──
  const [requestId, setRequestId] = useState('')
  const [phoneLast4, setPhoneLast4] = useState('')
  const [otp, setOtp]             = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError]   = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Step 3 state ──
  const [grantedToken, setGrantedToken] = useState('')
  const [grantedName,  setGrantedName]  = useState('')

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // ── Submit Step 1 ──
  const submitForm = useCallback(async () => {
    setFormError('')
    if (!name.trim() || name.trim().length < 2) {
      setFormError(lang === 'ar' ? 'الاسم مطلوب (حرفان على الأقل)' : 'Name is required (min 2 characters)')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError(lang === 'ar' ? 'البريد الإلكتروني غير صالح' : 'Valid email is required')
      return
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      setFormError(lang === 'ar' ? 'رقم الجوال مطلوب' : 'Valid phone number is required')
      return
    }
    if (!category) {
      setFormError(lang === 'ar' ? 'اختر مجال اهتمامك' : 'Please select your area of interest')
      return
    }
    if (!company.trim() || company.trim().length < 2) {
      setFormError(lang === 'ar' ? 'اسم الشركة أو المؤسسة مطلوب' : 'Company / Organization is required')
      return
    }

    const fullPhone = countryCode + phone.replace(/^0/, '').replace(/\D/g, '')

    setSubmitting(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: fullPhone,
          category,
          company: company.trim(),
          job_title: jobTitle.trim() || undefined,
          referral_source: referral || undefined,
          message: message.trim() || undefined,
          linkedin: linkedin.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to send code')

      setRequestId(data.request_id)
      setPhoneLast4(data.phone_last4)
      setResendCooldown(30)
      setStep('otp')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [name, email, countryCode, phone, category, company, jobTitle, referral, message, linkedin, lang])

  // ── OTP box input handler ──
  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[idx] = val.slice(-1)
    setOtp(next)
    setOtpError('')
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus()
    if (!val && idx > 0) otpRefs.current[idx - 1]?.focus()
  }

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
  }

  // ── Submit Step 2 ──
  const submitOtp = useCallback(async () => {
    const code = otp.join('')
    if (code.length < 6) {
      setOtpError(lang === 'ar' ? 'أدخل الرمز المكوّن من 6 أرقام' : 'Enter the 6-digit code')
      return
    }
    setVerifying(true)
    setOtpError('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, otp_code: code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Invalid code')

      setGrantedToken(data.token)
      setGrantedName(data.name)
      setStep('granted')
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Invalid code. Please try again.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }, [otp, requestId, lang])

  // ── Resend OTP ──
  const resendOtp = useCallback(async () => {
    if (resendCooldown > 0) return
    const fullPhone = countryCode + phone.replace(/^0/, '').replace(/\D/g, '')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: fullPhone, category, company, job_title: jobTitle || undefined, referral_source: referral || undefined, message: message || undefined, linkedin: linkedin || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setRequestId(data.request_id)
        setResendCooldown(30)
        setOtp(['', '', '', '', '', ''])
        setOtpError('')
        otpRefs.current[0]?.focus()
      }
    } catch { /* ignore */ }
  }, [resendCooldown, countryCode, phone, name, email, category, company, jobTitle, referral, message, linkedin])

  // ── Enter Studio ──
  const enterStudio = () => {
    onTokenGranted(grantedToken)
  }

  const cats = lang === 'ar' ? CATEGORIES_AR : CATEGORIES_EN

  // ────────────────────────────────────────────
  // STEP 1 — Info Form
  // ────────────────────────────────────────────
  if (step === 'form') return (
    <div className="raf-panel">
      <div className="raf-step-badge">
        {lang === 'ar' ? 'خطوة ١ / ٣ — معلوماتك' : 'STEP 1 / 3 — YOUR INFO'}
      </div>
      <p className="raf-desc">
        {lang === 'ar'
          ? 'رمز الوصول يُمنح للمختارين. أخبرنا عن نفسك وسنرسل رمزاً عبر SMS.'
          : "Access is granted to selected visitors. Tell us about yourself and we'll send a code via SMS."}

      </p>

      {/* Name */}
      <div className="raf-field">
        <label className="raf-label">{lang === 'ar' ? 'الاسم' : 'NAME'}</label>
        <input
          className="raf-input"
          type="text"
          placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full name'}
          value={name}
          onChange={e => setName(e.target.value)}
          autoComplete="name"
        />
      </div>

      {/* Email */}
      <div className="raf-field">
        <label className="raf-label">{lang === 'ar' ? 'البريد الإلكتروني' : 'EMAIL'}</label>
        <input
          className="raf-input"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          dir="ltr"
        />
      </div>

      {/* Phone */}
      <div className="raf-field">
        <label className="raf-label">{lang === 'ar' ? 'رقم الجوال' : 'PHONE (SMS CODE)'}</label>
        <div className="raf-phone-row">
          <select
            className="raf-select raf-cc-select"
            value={countryCode}
            onChange={e => setCC(e.target.value)}
          >
            {COUNTRY_CODES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
          <input
            className="raf-input raf-phone-input"
            type="tel"
            placeholder="5XXXXXXXX"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
            autoComplete="tel-national"
            dir="ltr"
            inputMode="numeric"
          />
        </div>
      </div>

      {/* Category */}
      <div className="raf-field">
        <label className="raf-label">{lang === 'ar' ? 'مجال الاهتمام' : 'AREA OF INTEREST'}</label>
        <select
          className="raf-select raf-select--full"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="">{lang === 'ar' ? '— اختر —' : '— Select —'}</option>
          {cats.map((c, i) => (
            <option key={i} value={CATEGORIES_EN[i]}>{c}</option>
          ))}
        </select>
      </div>

      {/* Company — REQUIRED */}
      <div className="raf-field">
        <label className="raf-label">{lang === 'ar' ? 'الشركة / المؤسسة' : 'COMPANY / ORGANIZATION'}</label>
        <input
          className="raf-input"
          type="text"
          placeholder={lang === 'ar' ? 'اسم الشركة أو "مستقل"' : 'Company name or "Independent"'}
          value={company}
          onChange={e => setCompany(e.target.value)}
          autoComplete="organization"
        />
      </div>

      {/* Job Title — GRACEFUL */}
      <div className="raf-field">
        <label className="raf-label">
          {lang === 'ar' ? 'المسمى الوظيفي (اختياري)' : 'JOB TITLE (OPTIONAL)'}
        </label>
        <input
          className="raf-input"
          type="text"
          placeholder={lang === 'ar' ? 'مثل: مدير تنفيذي، مهندس...' : 'e.g. CEO, Engineer, Researcher...'}
          value={jobTitle}
          onChange={e => setJobTitle(e.target.value)}
          autoComplete="organization-title"
        />
      </div>

      {/* LinkedIn / Social — GRACEFUL */}
      <div className="raf-field">
        <label className="raf-label">
          {lang === 'ar' ? 'لينكدإن أو وسائل التواصل (اختياري)' : 'LINKEDIN / SOCIAL (OPTIONAL)'}
        </label>
        <input
          className="raf-input"
          type="url"
          placeholder="https://linkedin.com/in/yourname"
          value={linkedin}
          onChange={e => setLinkedin(e.target.value)}
          dir="ltr"
        />
      </div>

      {/* How did you hear — GRACEFUL */}
      <div className="raf-field">
        <label className="raf-label">
          {lang === 'ar' ? 'كيف سمعت عنا؟ (اختياري)' : 'HOW DID YOU HEAR ABOUT US? (OPTIONAL)'}
        </label>
        <select
          className="raf-select raf-select--full"
          value={referral}
          onChange={e => setReferral(e.target.value)}
        >
          <option value="">{lang === 'ar' ? '— اختر —' : '— Select —'}</option>
          <option value="Social Media">{lang === 'ar' ? 'وسائل التواصل الاجتماعي' : 'Social Media'}</option>
          <option value="Referral">{lang === 'ar' ? 'إحالة / توصية' : 'Referral'}</option>
          <option value="Event / Conference">{lang === 'ar' ? 'فعالية / مؤتمر' : 'Event / Conference'}</option>
          <option value="Search Engine">{lang === 'ar' ? 'محرك بحث' : 'Search Engine'}</option>
          <option value="News / Press">{lang === 'ar' ? 'أخبار / صحافة' : 'News / Press'}</option>
          <option value="Other">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
        </select>
      </div>

      {/* Brief message — GRACEFUL */}
      <div className="raf-field">
        <label className="raf-label">
          {lang === 'ar' ? 'رسالة قصيرة (اختياري)' : 'BRIEF MESSAGE (OPTIONAL)'}
        </label>
        <textarea
          className="raf-input raf-textarea"
          placeholder={lang === 'ar' ? 'ما الذي يثير اهتمامك في MomenCrafts؟' : 'What interests you about MomenCrafts?'}
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={2}
          maxLength={500}
        />
      </div>

      {formError && <div className="raf-error" role="alert">{formError}</div>}

      <button
        className={`raf-submit${submitting ? ' loading' : ''}`}
        onClick={submitForm}
        disabled={submitting}
      >
        <div className="btn-spinner" />
        <span>{lang === 'ar' ? 'إرسال رمز التحقق →' : 'Send Verification Code →'}</span>
      </button>
    </div>
  )

  // ────────────────────────────────────────────
  // STEP 2 — OTP Verification
  // ────────────────────────────────────────────
  if (step === 'otp') return (
    <div className="raf-panel">
      <div className="raf-step-badge">
        {lang === 'ar' ? 'خطوة ٢ / ٣ — التحقق من الجوال' : 'STEP 2 / 3 — PHONE VERIFICATION'}
      </div>

      <div className="raf-otp-hint">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.91 14a16 16 0 006 6l.41-.41a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
        <span>
          {lang === 'ar'
            ? `أرسلنا رمز مكوّن من 6 أرقام إلى +••• ••••${phoneLast4}`
            : `We sent a 6-digit code to +••• ••••${phoneLast4}`}
        </span>
      </div>

      <div className="raf-otp-boxes" dir="ltr">
        {otp.map((digit, idx) => (
          <input
            key={idx}
            ref={el => { otpRefs.current[idx] = el }}
            className={`raf-otp-box${otpError ? ' error' : ''}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleOtpChange(idx, e.target.value)}
            onKeyDown={e => handleOtpKeyDown(idx, e)}
            onFocus={e => e.target.select()}
            aria-label={`Digit ${idx + 1}`}
          />
        ))}
      </div>

      {otpError && <div className="raf-error" role="alert">{otpError}</div>}

      <button
        className={`raf-submit${verifying ? ' loading' : ''}`}
        onClick={submitOtp}
        disabled={verifying}
      >
        <div className="btn-spinner" />
        <span>{lang === 'ar' ? 'تحقق من الرمز →' : 'Verify Code →'}</span>
      </button>

      <div className="raf-resend-row">
        <button
          className="raf-resend-btn"
          onClick={resendOtp}
          disabled={resendCooldown > 0}
        >
          {resendCooldown > 0
            ? (lang === 'ar' ? `إعادة الإرسال خلال ${resendCooldown}ث` : `Resend in ${resendCooldown}s`)
            : (lang === 'ar' ? 'لم تصلك الرسالة؟ أعد الإرسال' : "Didn't receive it? Resend")}
        </button>
        <button className="raf-back-btn" onClick={() => setStep('form')}>
          {lang === 'ar' ? '← رجوع' : '← Back'}
        </button>
      </div>
    </div>
  )

  // ────────────────────────────────────────────
  // STEP 3 — Access Granted
  // ────────────────────────────────────────────
  return (
    <div className="raf-panel raf-panel--granted">
      <div className="raf-granted-mark">✦</div>
      <div className="raf-granted-title">
        {lang === 'ar' ? `مرحباً، ${grantedName}` : `Welcome, ${grantedName}`}
      </div>
      <div className="raf-granted-sub">
        {lang === 'ar' ? 'تم منح رمز وصول لمدة ٣٠ دقيقة.' : 'A 30-minute access pass has been granted.'}
      </div>

      <div className="raf-granted-token-wrap">
        <div className="raf-granted-token-label">
          {lang === 'ar' ? 'رمز الوصول' : 'ACCESS KEY'}
        </div>
        <div className="raf-granted-token">{grantedToken}</div>
        <div className="raf-granted-expiry">
          {lang === 'ar' ? '⏱ ينتهي خلال ٣٠ دقيقة' : '⏱ Expires in 30 minutes'}
        </div>
      </div>

      <p className="raf-granted-email-note">
        {lang === 'ar'
          ? 'تم إرسال الرمز أيضاً إلى بريدك الإلكتروني.'
          : 'The key was also sent to your email.'}
      </p>

      <button className="raf-enter-btn" onClick={enterStudio}>
        {lang === 'ar' ? 'دخول الاستوديو ✦' : 'Enter the Studio ✦'}
      </button>
    </div>
  )
}
