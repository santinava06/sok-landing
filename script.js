/* ─────────────────────────────────────────
   SOK LANDING — script.js
   - Nav scroll effect
   - Mobile hamburger
   - GitHub release version fetch
   - GitHub changelog fetch
   - FAQ accordion
   - Scroll reveal animations
───────────────────────────────────────── */

const GITHUB_REPO = 'santinava06/Sok';
const GITHUB_API  = `https://api.github.com/repos/${GITHUB_REPO}`;

/* ── Nav scroll ── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ── Mobile hamburger ── */
const hamburger = document.getElementById('nav-hamburger');
const navLinks  = document.getElementById('nav-links');

hamburger?.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', isOpen);
});

// Close menu on link click
navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    hamburger?.setAttribute('aria-expanded', 'false');
  });
});

/* ── GitHub release info ── */
async function fetchLatestRelease() {
  const versionText    = document.getElementById('version-text');
  const versionSpinner = document.getElementById('version-spinner');
  const windowsBtn     = document.getElementById('download-windows-btn');

  versionSpinner?.classList.add('visible');

  try {
    const res  = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!res.ok) throw new Error('No releases yet');

    const data = res.status === 200 ? await res.json() : null;
    if (!data) throw new Error('Empty');

    const version   = data.tag_name || '';
    const published = data.published_at ? new Date(data.published_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

    // Find Windows installer asset (.msi or .exe)
    const asset = data.assets?.find(a =>
      a.name.endsWith('.msi') || (a.name.endsWith('.exe') && !a.name.includes('sig'))
    );

    if (versionText) {
      versionText.textContent = `Versión ${version}${published ? ` · ${published}` : ''}`;
    }

    if (asset && windowsBtn) {
      windowsBtn.href = asset.browser_download_url;
    }

    // Also update hero CTA
    const heroCta = document.getElementById('hero-cta');
    if (heroCta && asset) {
      heroCta.href = asset.browser_download_url;
    }

  } catch {
    if (versionText) {
      versionText.textContent = 'Versión disponible en GitHub Releases';
    }
    if (windowsBtn) {
      windowsBtn.href = `https://github.com/${GITHUB_REPO}/releases/latest`;
    }
    const heroCta = document.getElementById('hero-cta');
    if (heroCta) {
      heroCta.href = `https://github.com/${GITHUB_REPO}/releases/latest`;
    }
  } finally {
    versionSpinner?.classList.remove('visible');
  }
}

fetchLatestRelease();

/* ── Changelog from GitHub releases ── */
function parseMarkdown(text) {
  if (!text) return '<p>Sin notas de versión.</p>';
  // Only parse basic markdown: headers → bold, bullet lists, inline code
  return text
    .split('\n')
    .reduce((acc, line) => {
      // Escape HTML entities to prevent XSS attacks
      const escapedLine = line.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
      );

      if (/^#{1,3} /.test(escapedLine)) {
        acc.push(`<p><strong>${escapedLine.replace(/^#{1,3} /, '')}</strong></p>`);
      } else if (/^[-*] /.test(escapedLine)) {
        if (!acc.at(-1)?.startsWith('<ul>')) acc.push('<ul>');
        acc.push(`<li>${escapedLine.replace(/^[-*] /, '').replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`);
      } else if (escapedLine.trim()) {
        if (acc.at(-1)?.startsWith('<li>')) acc.push('</ul>');
        acc.push(`<p>${escapedLine.replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`);
      } else {
        if (acc.at(-1)?.startsWith('<li>')) acc.push('</ul>');
      }
      return acc;
    }, [])
    .join('') || '<p>Sin notas de versión.</p>';
}

async function fetchChangelog() {
  const list = document.getElementById('changelog-list');
  if (!list) return;

  try {
    const res = await fetch(`${GITHUB_API}/releases?per_page=5`);
    if (!res.ok) throw new Error('no releases');
    const releases = await res.json();
    if (!releases.length) throw new Error('empty');

    list.innerHTML = releases.map((r, i) => {
      const date = r.published_at
        ? new Date(r.published_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

      const winAsset = r.assets?.find(a =>
        a.name.endsWith('.msi') || (a.name.endsWith('.exe') && !a.name.includes('sig'))
      );

      const downloadBtn = winAsset
        ? `<a href="${winAsset.browser_download_url}" class="release-download">
             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             Descargar ${r.tag_name}
           </a>`
        : '';

      return `
        <div class="release-card reveal">
          <div class="release-dot ${i === 0 ? 'latest' : ''}"></div>
          <div class="release-body">
            <div class="release-header">
              <span class="release-version">${r.tag_name}</span>
              ${i === 0 ? '<span class="release-tag-latest">Última versión</span>' : ''}
              ${date ? `<span class="release-date">${date}</span>` : ''}
            </div>
            <div class="release-notes-container">
              <div class="release-notes-rendered">${parseMarkdown(r.body)}</div>
              <div class="release-notes-fade"></div>
            </div>
            ${downloadBtn}
          </div>
        </div>`;
    }).join('');

    // Process long release notes for collapsible behavior
    list.querySelectorAll('.release-notes-container').forEach(container => {
      const rendered = container.querySelector('.release-notes-rendered');
      const threshold = 140; // Max height before collapsing (px)
      
      if (rendered.scrollHeight > threshold) {
        container.classList.add('truncated');
        container.style.maxHeight = `${threshold}px`;

        // Create the collapse/expand toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'release-toggle-btn';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = `
          <span>Ver más</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        `;

        // Insert toggle button immediately after the notes container
        container.parentNode.insertBefore(toggleBtn, container.nextSibling);

        toggleBtn.addEventListener('click', () => {
          const isTruncated = container.classList.contains('truncated');
          if (isTruncated) {
            container.classList.remove('truncated');
            container.style.maxHeight = `${rendered.scrollHeight}px`;
            toggleBtn.querySelector('span').textContent = 'Ver menos';
            toggleBtn.querySelector('svg').style.transform = 'rotate(180deg)';
            toggleBtn.setAttribute('aria-expanded', 'true');
            
            // Allow height to auto-adjust after transition is done (for responsive resizing)
            container.addEventListener('transitionend', function handler() {
              if (!container.classList.contains('truncated')) {
                container.style.maxHeight = 'none';
              }
              container.removeEventListener('transitionend', handler);
            });
          } else {
            // Set to exact height before collapsing so transition runs smoothly
            container.style.maxHeight = `${rendered.scrollHeight}px`;
            container.offsetHeight; // trigger reflow
            
            container.classList.add('truncated');
            container.style.maxHeight = `${threshold}px`;
            toggleBtn.querySelector('span').textContent = 'Ver más';
            toggleBtn.querySelector('svg').style.transform = 'rotate(0deg)';
            toggleBtn.setAttribute('aria-expanded', 'false');
            
            // Scroll container into view if collapsing leaves user lost
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      }
    });

    // Observe newly added cards for scroll reveal
    list.querySelectorAll('.release-card').forEach((el, i) => {
      el.style.transitionDelay = `${i * 0.08}s`;
      revealObserver.observe(el);
    });

  } catch {
    list.innerHTML = `
      <div class="changelog-empty">
        <p>Aún no hay versiones publicadas.<br/>
        Seguí el proyecto en <a href="https://github.com/${GITHUB_REPO}/releases" target="_blank" rel="noopener">GitHub Releases</a>.</p>
      </div>`;
  }
}

fetchChangelog();

/* ── FAQ accordion ── */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item   = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-item.open').forEach(openItem => {
      openItem.classList.remove('open');
      const itemAnswer = openItem.querySelector('.faq-answer');
      itemAnswer.style.maxHeight = null;
      itemAnswer.setAttribute('aria-hidden', 'true');
      openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Open clicked if it was closed
    if (!isOpen) {
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
      answer.setAttribute('aria-hidden', 'false');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* ── Scroll reveal ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

// Add reveal class to elements we want to animate
const revealSelectors = [
  '.section-header',
  '.feature-card',
  '.platform-card',
  '.download-card',
  '.faq-item',
];

document.querySelectorAll(revealSelectors.join(', ')).forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = `${(i % 4) * 0.08}s`;
  revealObserver.observe(el);
});

/* ── Footer year ── */
const yearEl = document.getElementById('footer-year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ── Parallax orb on mouse move (subtle) ── */
const orb1 = document.querySelector('.hero-orb-1');
const orb2 = document.querySelector('.hero-orb-2');
let ticking = false;

document.addEventListener('mousemove', (e) => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const x = (e.clientX / window.innerWidth - 0.5);
      const y = (e.clientY / window.innerHeight - 0.5);
      if (orb1) orb1.style.transform = `translateX(calc(-50% + ${x * 30}px)) translateY(${y * 20}px)`;
      if (orb2) orb2.style.transform = `translateX(${x * -20}px) translateY(${y * -15}px)`;
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

/* ── Dark Mode Toggle ── */
const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn?.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark-theme');
  const isLight = document.documentElement.classList.contains('light-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Determine current active theme
  let currentTheme = 'light';
  if (isDark || (!isLight && systemPrefersDark)) {
    currentTheme = 'dark';
  }

  if (currentTheme === 'dark') {
    document.documentElement.classList.remove('dark-theme');
    document.documentElement.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.remove('light-theme');
    document.documentElement.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  }
});

/* ── 3D Tilt Effect on Hero Mockup ── */
const heroMockupWrapper = document.querySelector('.screenshot-wrapper');
const heroMockupShine = document.querySelector('.screenshot-shine');
let tiltTicking = false;

if (heroMockupWrapper) {
  heroMockupWrapper.addEventListener('mousemove', (e) => {
    if (!tiltTicking) {
      window.requestAnimationFrame(() => {
        const rect = heroMockupWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left; // X coordinate inside wrapper
        const y = e.clientY - rect.top;  // Y coordinate inside wrapper
        
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        
        // Tilt degrees (max 6deg horizontal, max 4deg vertical around 3deg default)
        const rotateY = -((x - xc) / xc) * 6;
        const rotateX = ((y - yc) / yc) * 4 + 3; // Keep default perspective offset (3deg)
        
        heroMockupWrapper.style.transform = `perspective(1400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        
        // Dynamically move the reflection / glass shine gradient
        const shineX = (x / rect.width) * 100;
        const shineY = (y / rect.height) * 100;
        if (heroMockupShine) {
          heroMockupShine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.12) 0%, transparent 60%)`;
        }
        tiltTicking = false;
      });
      tiltTicking = true;
    }
  });

  heroMockupWrapper.addEventListener('mouseleave', () => {
    // Reset smoothly to base styles when cursor leaves
    heroMockupWrapper.style.transform = `perspective(1400px) rotateX(3deg) rotateY(0deg)`;
    if (heroMockupShine) {
      heroMockupShine.style.background = `linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 45%)`;
    }
  });
}
