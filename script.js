// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach(el => observer.observe(el));

// Nav scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Hamburger
const burger = document.getElementById('nav-hamburger');
const links = document.getElementById('nav-links');
burger.addEventListener('click', () => links.classList.toggle('open'));
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

// Smooth scroll for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// Scroll progress bar
const progressBar = document.getElementById('progress-bar');
if (progressBar) {
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (window.scrollY / total * 100) + '%';
  }, { passive: true });
}

// Hero canvas particles
const canvas = document.getElementById('hero-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];
  const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 55; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3, o: Math.random() * 0.6 + 0.2
    });
  }
  const colors = ['#006C35', '#00A651', '#C8A96E'];
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = p.o; ctx.fill();
      // Draw lines to nearby particles
      particles.forEach((p2, j) => {
        if (j <= i) return;
        const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = '#006C35'; ctx.globalAlpha = (1 - dist/120) * 0.15;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ═══════════════════════════════════════════════════════════
// REQUEST ACCESS — Modal + Multi-step Flow
// ═══════════════════════════════════════════════════════════

const RA_API = 'https://isciigqmdfcozrtojqcm.supabase.co/functions/v1';
let raRequestId = null;
let raResendTimer = null;
let raResendSeconds = 0;
let raFullPhone = '';

function openRequestModal() {
  const modal = document.getElementById('request-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  // Reset to step 1
  showStep(1);
  // Focus first field
  setTimeout(() => document.getElementById('ra-name')?.focus(), 300);
}

function closeRequestModal() {
  const modal = document.getElementById('request-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.body.style.overflow = '';
  // Clear resend timer
  if (raResendTimer) { clearInterval(raResendTimer); raResendTimer = null; }
}

function showStep(step) {
  // Hide all panels
  for (let i = 1; i <= 3; i++) {
    const panel = document.getElementById(`ra-step-${i}`);
    if (panel) panel.style.display = i === step ? 'block' : 'none';
  }
  // Update step dots
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`ra-step-dot-${i}`);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < step) dot.classList.add('done');
    else if (i === step) dot.classList.add('active');
  }
  // Clear errors
  const err1 = document.getElementById('ra-error-1');
  const err2 = document.getElementById('ra-error-2');
  if (err1) err1.textContent = '';
  if (err2) err2.textContent = '';
}

function setButtonLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── STEP 1: Submit visitor info ──
async function submitRequestInfo() {
  const name = document.getElementById('ra-name')?.value?.trim();
  const email = document.getElementById('ra-email')?.value?.trim();
  const phoneRaw = document.getElementById('ra-phone')?.value?.trim();
  const countryCode = document.getElementById('ra-country-code')?.value || '+966';
  const company = document.getElementById('ra-company')?.value?.trim();
  const errorEl = document.getElementById('ra-error-1');

  // Validate
  if (!name || name.length < 2) {
    errorEl.textContent = 'Please enter your full name.';
    document.getElementById('ra-name')?.focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorEl.textContent = 'Please enter a valid email address.';
    document.getElementById('ra-email')?.focus();
    return;
  }
  if (!phoneRaw || phoneRaw.length < 5) {
    errorEl.textContent = 'Please enter a valid phone number.';
    document.getElementById('ra-phone')?.focus();
    return;
  }

  // Build full phone
  const phoneDigits = phoneRaw.replace(/[^0-9]/g, '');
  raFullPhone = countryCode + phoneDigits;

  errorEl.textContent = '';
  setButtonLoading('ra-submit-info', true);

  try {
    const res = await fetch(`${RA_API}/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone: raFullPhone,
        company: company || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }

    raRequestId = data.request_id;

    // Show phone number in step 2
    const phoneDisplay = document.getElementById('ra-phone-display');
    if (phoneDisplay) {
      phoneDisplay.textContent = `${countryCode} ••••${data.phone_last4 || phoneDigits.slice(-4)}`;
    }

    // Move to step 2
    showStep(2);
    startResendTimer();

    // Focus first OTP digit
    setTimeout(() => {
      const firstDigit = document.querySelector('.ra-otp-digit[data-idx="0"]');
      if (firstDigit) firstDigit.focus();
    }, 200);

  } catch (err) {
    errorEl.textContent = err.message || 'Something went wrong. Please try again.';
    // Shake the button
    const btn = document.getElementById('ra-submit-info');
    btn?.classList.add('ra-shake');
    setTimeout(() => btn?.classList.remove('ra-shake'), 400);
  } finally {
    setButtonLoading('ra-submit-info', false);
  }
}

// ── STEP 2: Submit OTP ──
async function submitOTP() {
  const digits = document.querySelectorAll('.ra-otp-digit');
  let code = '';
  digits.forEach(d => { code += d.value; });
  const errorEl = document.getElementById('ra-error-2');

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    errorEl.textContent = 'Please enter all 6 digits.';
    return;
  }

  if (!raRequestId) {
    errorEl.textContent = 'Session expired. Please start over.';
    return;
  }

  errorEl.textContent = '';
  setButtonLoading('ra-submit-otp', true);

  try {
    const res = await fetch(`${RA_API}/verify-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: raRequestId,
        otp_code: code,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Verification failed');
    }

    // ── SUCCESS ──
    if (raResendTimer) { clearInterval(raResendTimer); raResendTimer = null; }

    // Populate success screen
    const nameEl = document.getElementById('ra-welcome-name');
    const tokenEl = document.getElementById('ra-token-value');
    const expiryEl = document.getElementById('ra-token-expiry');

    if (nameEl) nameEl.textContent = data.name || 'Visitor';
    if (tokenEl) tokenEl.textContent = data.token;
    if (expiryEl) {
      const exp = new Date(data.expires_at);
      expiryEl.textContent = `Expires at ${exp.toLocaleTimeString('en-SA', { hour: '2-digit', minute: '2-digit' })} · 30 min access`;
    }

    // Store token for auto-redirect
    window.__raToken = data.token;

    showStep(3);

  } catch (err) {
    errorEl.textContent = err.message || 'Invalid code. Please try again.';
    // Shake OTP inputs
    const wrap = document.querySelector('.ra-otp-wrap');
    wrap?.classList.add('ra-shake');
    setTimeout(() => wrap?.classList.remove('ra-shake'), 400);
    // Clear digits for retry
    digits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
    digits[0]?.focus();
  } finally {
    setButtonLoading('ra-submit-otp', false);
  }
}

// ── Resend OTP ──
function startResendTimer() {
  raResendSeconds = 60;
  const timerEl = document.getElementById('ra-resend-timer');
  const resendBtn = document.getElementById('ra-resend-btn');
  if (resendBtn) resendBtn.disabled = true;

  if (raResendTimer) clearInterval(raResendTimer);
  raResendTimer = setInterval(() => {
    raResendSeconds--;
    if (timerEl) timerEl.textContent = `Resend in ${raResendSeconds}s`;
    if (raResendSeconds <= 0) {
      clearInterval(raResendTimer);
      raResendTimer = null;
      if (timerEl) timerEl.textContent = '';
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);
}

async function resendOTP() {
  if (raResendSeconds > 0) return;

  const resendBtn = document.getElementById('ra-resend-btn');
  if (resendBtn) resendBtn.disabled = true;

  try {
    // Re-submit the info to get a new OTP
    const name = document.getElementById('ra-name')?.value?.trim();
    const email = document.getElementById('ra-email')?.value?.trim();
    const company = document.getElementById('ra-company')?.value?.trim();

    const res = await fetch(`${RA_API}/request-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone: raFullPhone,
        company: company || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    raRequestId = data.request_id;
    startResendTimer();

    // Clear OTP digits
    document.querySelectorAll('.ra-otp-digit').forEach(d => {
      d.value = '';
      d.classList.remove('filled');
    });
    document.querySelector('.ra-otp-digit[data-idx="0"]')?.focus();

  } catch (err) {
    const errorEl = document.getElementById('ra-error-2');
    if (errorEl) errorEl.textContent = err.message || 'Failed to resend. Please try again.';
    if (resendBtn) resendBtn.disabled = false;
  }
}

// ── Enter Studio — auto-redirect with pre-filled token ──
function enterStudio() {
  const token = window.__raToken;
  if (!token) {
    window.location.href = '/';
    return;
  }
  // Navigate to the gate page (React SPA) with the token as a query param
  window.location.href = `/?token=${encodeURIComponent(token)}`;
}

// ── OTP digit auto-advance + paste handling ──
document.addEventListener('DOMContentLoaded', () => {
  const otpDigits = document.querySelectorAll('.ra-otp-digit');
  if (!otpDigits.length) return;

  otpDigits.forEach((input, idx) => {
    // Auto-advance on input
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val.slice(0, 1);

      if (val && idx < otpDigits.length - 1) {
        otpDigits[idx + 1].focus();
      }

      // Update filled state
      e.target.classList.toggle('filled', !!val);
    });

    // Backspace → go to previous
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        otpDigits[idx - 1].focus();
        otpDigits[idx - 1].value = '';
        otpDigits[idx - 1].classList.remove('filled');
      }
      // Enter → submit
      if (e.key === 'Enter') {
        submitOTP();
      }
    });

    // Select all on focus
    input.addEventListener('focus', () => {
      input.select();
    });
  });

  // Paste support — distribute pasted code across all digits
  otpDigits[0]?.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData)
      .getData('text')
      .replace(/[^0-9]/g, '')
      .slice(0, 6);

    pasted.split('').forEach((char, i) => {
      if (otpDigits[i]) {
        otpDigits[i].value = char;
        otpDigits[i].classList.add('filled');
      }
    });

    // Focus last filled or submit button
    const nextIdx = Math.min(pasted.length, otpDigits.length - 1);
    otpDigits[nextIdx]?.focus();

    // Auto-submit if 6 digits pasted
    if (pasted.length === 6) {
      setTimeout(() => submitOTP(), 200);
    }
  });

  // Close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRequestModal();
  });
});

