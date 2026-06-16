/* ═══════════════════════════════════════════════════════════
   DART — Drone Arena Radio Tag
   Landing Page Interactions
   ═══════════════════════════════════════════════════════════ */

// ─── Navigation Scroll ───
const nav = document.getElementById('nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
});

// ─── Smooth Scroll for Anchor Links ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      // Close mobile menu if open
      const navLinksEl = document.querySelector('.nav__links');
      const hamburger = document.getElementById('nav-hamburger');
      if (navLinksEl) navLinksEl.classList.remove('open');
      if (hamburger) hamburger.classList.remove('active');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ─── Mobile Hamburger Menu ───
const hamburger = document.getElementById('nav-hamburger');
const navLinksEl = document.querySelector('.nav__links');

if (hamburger && navLinksEl) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinksEl.classList.toggle('open');
  });
}

// ─── Scroll Reveal ───
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1,
  rootMargin: '0px 0px -60px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// ─── Hero Particles ───
const particlesContainer = document.getElementById('hero-particles');

function createParticles() {
  if (!particlesContainer) return;
  
  const count = 20;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 6 + 's';
    particle.style.animationDuration = (4 + Math.random() * 4) + 's';
    particle.style.width = (1 + Math.random() * 3) + 'px';
    particle.style.height = particle.style.width;
    particle.style.opacity = 0;
    particlesContainer.appendChild(particle);
  }
}

createParticles();

// ─── Mouse-tracking glow for CTA ───
const ctaInner = document.getElementById('cta-inner');

if (ctaInner) {
  ctaInner.addEventListener('mousemove', (e) => {
    const rect = ctaInner.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    ctaInner.style.setProperty('--mouse-x', x + '%');
    ctaInner.style.setProperty('--mouse-y', y + '%');
  });
}

// ─── Hero Stats Counter Animation ───
function animateStats() {
  const stats = document.querySelectorAll('.hero__stat-value');
  
  stats.forEach(stat => {
    // Snapshot the original innerHTML to restore at end
    const originalHTML = stat.innerHTML;
    // Extract the unit span
    const unitSpan = stat.querySelector('.unit');
    const unitHTML = unitSpan ? unitSpan.outerHTML : '';
    
    // Get the raw text before the unit span
    const rawText = stat.textContent.trim();
    
    // Parse: find the numeric part and any prefix like "<"
    let prefix = '';
    let numStr = '';
    
    for (let i = 0; i < rawText.length; i++) {
      const ch = rawText[i];
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        numStr += ch;
      } else if (numStr.length === 0) {
        prefix += ch;
      } else {
        break; // stop at the unit text
      }
    }
    
    const target = parseFloat(numStr);
    if (isNaN(target)) return;
    
    const useDecimal = target < 10;
    const duration = 1500;
    const start = performance.now();
    
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = target * eased;
      const displayNum = useDecimal ? current.toFixed(1) : Math.round(current);
      
      stat.innerHTML = prefix + displayNum + unitHTML;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // Restore the exact original HTML
        stat.innerHTML = originalHTML;
      }
    }
    
    requestAnimationFrame(update);
  });
}


// Trigger stats animation when hero is visible
const heroStats = document.getElementById('hero-stats');
if (heroStats) {
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(animateStats, 500);
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  statsObserver.observe(heroStats);
}

// ─── Parallax on Hero Image ───
const heroImage = document.querySelector('.hero__bg img');

window.addEventListener('scroll', () => {
  if (!heroImage) return;
  const scrollY = window.scrollY;
  if (scrollY < window.innerHeight) {
    heroImage.style.transform = `scale(1.1) translateY(${scrollY * 0.15}px)`;
  }
});

// ─── Terminal Typing Effect ───
function initTerminalTyping() {
  const terminal = document.getElementById('specs-terminal');
  if (!terminal) return;
  
  const lines = terminal.querySelectorAll('.terminal__line');
  
  const terminalObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        lines.forEach((line, i) => {
          line.style.opacity = '0';
          line.style.transform = 'translateX(-10px)';
          line.style.transition = `all 0.4s ${0.08 * i}s var(--ease-out-expo)`;
          
          setTimeout(() => {
            line.style.opacity = '1';
            line.style.transform = 'translateX(0)';
          }, 100);
        });
        
        terminalObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  
  terminalObserver.observe(terminal);
}

initTerminalTyping();

// ─── Tilt effect on layer cards ───
document.querySelectorAll('.layer-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    const tiltX = (y - 0.5) * 6;
    const tiltY = (x - 0.5) * -6;
    
    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
  });
  
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ─── Active nav link highlight ───
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__link');

window.addEventListener('scroll', () => {
  let current = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });
  
  navLinks.forEach(link => {
    link.style.color = '';
    if (link.getAttribute('href') === '#' + current) {
      link.style.color = 'var(--red-400)';
    }
  });
});

// ─── Preloader fade ───
window.addEventListener('load', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.6s ease';
  
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
});
