/* ═══════════════════════════════════════════════════════════
   MOMENCRAFTS.COM — Enhanced Interactivity
   Gradient mesh · Animated counters · 3D tilt · Parallax
   ═══════════════════════════════════════════════════════════ */

// --- Scroll Reveal with IntersectionObserver ---
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// --- Nav scroll effect ---
const nav = document.getElementById('nav');
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  nav.classList.toggle('scrolled', y > 40);
  lastScroll = y;
}, { passive: true });

// --- Hamburger menu ---
const burger = document.getElementById('nav-hamburger');
const links = document.getElementById('nav-links');
if (burger && links) {
  burger.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    burger.classList.toggle('active');
    // Lock body scroll when nav is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });
  // Close nav when any link is clicked
  links.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      links.classList.remove('open');
      burger.classList.remove('active');
      document.body.style.overflow = '';
    })
  );
  // Close nav when clicking outside
  document.addEventListener('click', (e) => {
    if (links.classList.contains('open') && !nav.contains(e.target)) {
      links.classList.remove('open');
      burger.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// --- Scroll progress bar ---
const progressBar = document.getElementById('progress-bar');
if (progressBar) {
  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total > 0) {
      progressBar.style.width = (window.scrollY / total * 100) + '%';
    }
  }, { passive: true });
}

// --- Animated counters on hero stats ---
const statNums = document.querySelectorAll('.stat-num');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const target = parseInt(el.textContent, 10);
      if (isNaN(target) || el.dataset.counted) return;
      el.dataset.counted = 'true';
      let current = 0;
      const duration = 1200;
      const start = performance.now();
      const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

      function animateCount(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        current = Math.round(easeOutQuart(progress) * target);
        el.textContent = current;
        if (progress < 1) requestAnimationFrame(animateCount);
      }
      el.textContent = '0';
      requestAnimationFrame(animateCount);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
statNums.forEach(el => counterObserver.observe(el));

// --- Active nav link highlighting ---
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
function updateActiveNav() {
  const scrollY = window.scrollY + 120;
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    if (scrollY >= top && scrollY < top + height) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + id) {
          link.classList.add('active');
        }
      });
    }
  });
}
window.addEventListener('scroll', updateActiveNav, { passive: true });

// --- Hero canvas — gradient mesh with flowing particles (desktop only) ---
const canvas = document.getElementById('hero-canvas');
const isMobile = window.matchMedia('(max-width: 640px)').matches;
if (canvas && !isMobile) {
  canvas.style.opacity = '0.3';
  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouseX = 0, mouseY = 0;
  let width, height;

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Track mouse for interactive glow
  canvas.parentElement.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  // Create particles
  const PARTICLE_COUNT = 65;
  const colors = [
    { r: 155, g: 27,  b: 48 },  // billiard deep red
    { r: 196, g: 30,  b: 58 },  // billiard bright red
    { r: 232, g: 100, b: 120 }, // soft rose
  ];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.4,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      color: colors[i % colors.length],
      baseOpacity: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Gradient blobs
  const blobs = [
    { x: 0.2, y: 0.4, r: 0.35, color: 'rgba(155,27,48,', baseAlpha: 0.07, speed: 0.0003, phase: 0 },
    { x: 0.7, y: 0.3, r: 0.3, color: 'rgba(196,30,58,', baseAlpha: 0.04, speed: 0.0004, phase: 2 },
    { x: 0.5, y: 0.7, r: 0.25, color: 'rgba(155,27,48,', baseAlpha: 0.05, speed: 0.0005, phase: 4 },
  ];

  let time = 0;
  function draw() {
    time += 0.016;
    ctx.clearRect(0, 0, width, height);

    // Draw animated gradient blobs
    blobs.forEach(blob => {
      const bx = (blob.x + Math.sin(time * blob.speed * 100 + blob.phase) * 0.05) * width;
      const by = (blob.y + Math.cos(time * blob.speed * 80 + blob.phase) * 0.04) * height;
      const br = blob.r * Math.min(width, height);
      const alpha = blob.baseAlpha + Math.sin(time * 0.5 + blob.phase) * 0.015;

      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, blob.color + Math.max(0, alpha).toFixed(3) + ')');
      grad.addColorStop(1, blob.color + '0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    });

    // Mouse glow
    if (mouseX > 0 && mouseY > 0) {
      const mouseGrad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 180);
      mouseGrad.addColorStop(0, 'rgba(155,27,48,0.06)');
      mouseGrad.addColorStop(1, 'rgba(155,27,48,0)');
      ctx.fillStyle = mouseGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw particles and connections
    particles.forEach((p, i) => {
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Pulsing opacity
      const alpha = p.baseOpacity + Math.sin(time * 1.5 + p.phase) * 0.15;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${Math.max(0, alpha).toFixed(2)})`;
      ctx.fill();

      // Draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          const lineAlpha = (1 - dist / 130) * 0.1;
          ctx.strokeStyle = `rgba(196,30,58,${lineAlpha.toFixed(3)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  }
  draw();
}

// --- 3D card tilt effect (desktop only) ---
if (window.matchMedia('(hover: hover)').matches) {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const tiltX = y * -6;
      const tiltY = x * 6;
      card.style.transform = `translateY(-6px) perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// --- Touch tap feedback on product cards (mobile) ---
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('touchstart', () => {
    card.classList.add('tapped');
  }, { passive: true });
  card.addEventListener('touchend', () => {
    setTimeout(() => card.classList.remove('tapped'), 320);
  }, { passive: true });
  card.addEventListener('touchcancel', () => {
    card.classList.remove('tapped');
  }, { passive: true });
});

// --- Typewriter effect for hero heading (optional) ---
const heroHeading = document.querySelector('.hero-heading');
if (heroHeading && heroHeading.dataset.typewriter) {
  // Placeholder for future typewriter integration
}
