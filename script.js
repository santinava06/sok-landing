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
      if (/^#{1,3} /.test(line)) {
        acc.push(`<p><strong>${line.replace(/^#{1,3} /, '')}</strong></p>`);
      } else if (/^[-*] /.test(line)) {
        if (!acc.at(-1)?.startsWith('<ul>')) acc.push('<ul>');
        acc.push(`<li>${line.replace(/^[-*] /, '').replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`);
      } else if (line.trim()) {
        if (acc.at(-1)?.startsWith('<li>')) acc.push('</ul>');
        acc.push(`<p>${line.replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`);
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
            <div class="release-notes-rendered">${parseMarkdown(r.body)}</div>
            ${downloadBtn}
          </div>
        </div>`;
    }).join('');

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
      openItem.querySelector('.faq-answer').style.maxHeight = null;
      openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });

    // Open clicked if it was closed
    if (!isOpen) {
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
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

document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5);
  const y = (e.clientY / window.innerHeight - 0.5);
  if (orb1) orb1.style.transform = `translateX(calc(-50% + ${x * 30}px)) translateY(${y * 20}px)`;
  if (orb2) orb2.style.transform = `translateX(${x * -20}px) translateY(${y * -15}px)`;
}, { passive: true });
