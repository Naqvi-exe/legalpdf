/* =========================================================
   LegalPDF — Production App Script
   nav · scroll · reveal · faq · contact · tool logic
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  /* ---------- Year ---------- */
  $$('#year').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Header shadow (debounced) ---------- */
  const header = $('.site-header');
  if (header) {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 8);
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Active nav link (aria-current) ---------- */
  (function markActiveNav() {
    const path = location.pathname.split('/').pop() || 'index.html';
    $$('.nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href === path) a.setAttribute('aria-current', 'page');
    });
  })();

  /* ---------- Mobile nav ---------- */
  const navToggle = $('#navToggle') || $('.nav-toggle');
  const nav = $('#nav') || $('.nav');
  if (navToggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.textContent = open ? '✕' : '☰';
      navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    };
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!nav.classList.contains('open'));
    });
    $$('a', nav).forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target)) setOpen(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) setOpen(false);
    });
  }

  /* ---------- Scroll Reveal ---------- */
  const revealEls = $$('.reveal, .reveal-stagger');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function setStatus(el, msg, type) {
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'tool-status' + (type ? ' ' + type : '');
  }
  function downloadBytes(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'output.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const PDFLibReady = () => window.PDFLib;
  const PDFJSReady = () => window.pdfjsLib;

  /* =========================================================
     FAQ PAGE
     ========================================================= */
  const faqList = $('#faqList');
  if (faqList) {
    const faqs = [
      { q: 'Do my files get uploaded to a server?', a: 'No. Every tool runs entirely in your browser using client-side JavaScript. Your documents are read from your device into browser memory, processed there, and downloaded back. Nothing is transmitted to us.' },
      { q: 'Is the redaction tool legally sufficient for court filings?', a: 'Our redaction tool covers visible text with a solid rectangle and strips metadata, but it does not remove the underlying text layer. For filings requiring certified irreversible redaction, verify the output with dedicated forensic tools before submitting.' },
      { q: 'Why is there a watermark on the free plan?', a: 'The free plan is intended for evaluation and occasional use. A subtle watermark is added to output files. Upgrading to Pro removes the watermark and unlocks unlimited usage.' },
      { q: 'Can I use LegalPDF offline?', a: 'Once a tool page has loaded, the core processing works without an internet connection. The PDF libraries are cached by your browser after the first visit.' },
      { q: 'How do I subscribe to Pro or Firm?', a: 'Payments are not yet automated. Use the contact page to reach us with your plan choice, and we will set up your account manually.' },
      { q: 'Do you keep any logs?', a: 'We do not log file contents. Basic, privacy-focused page-view analytics may be collected. Contact form submissions are routed through Formspree.' },
      { q: 'What PDF size is supported?', a: 'There is no hard limit imposed by us — the practical limit depends on your device memory. Very large files (hundreds of MB) may be slow on older devices.' },
      { q: 'Is Bates numbering available on the free plan?', a: 'Bates numbering is a Pro feature. You can preview the interface on the free plan, but applying numbers requires an upgrade.' }
    ];
    faqList.innerHTML = faqs.map((f, i) => `
      <details class="faq-item reveal"${i === 0 ? ' open' : ''}>
        <summary>${escapeHtml(f.q)}</summary>
        <div class="faq-answer">${escapeHtml(f.a)}</div>
      </details>
    `).join('');
    if ('IntersectionObserver' in window) {
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('visible'); io2.unobserve(e.target); }
        });
      }, { threshold: 0.12 });
      $$('.faq-item.reveal', faqList).forEach(el => io2.observe(el));
    }
  }

  /* =========================================================
     CONTACT FORM
     ========================================================= */
  const contactForm = $('#contactForm');
  if (contactForm) {
    const status = $('#contactStatus');
    const submitBtn = $('#contactSubmit');

    const params = new URLSearchParams(location.search);
    const plan = params.get('plan');
    if (plan) {
      const subject = $('#subject');
      if (subject) {
        const opt = Array.from(subject.options).find(o =>
          o.value.toLowerCase().includes(plan.toLowerCase())
        );
        if (opt) subject.value = opt.value;
      }
    }

    contactForm.addEventListener('submit', async (e) => {
      if (contactForm.action.includes('YOUR_FORM_ID')) {
        e.preventDefault();
        if (status) {
          status.textContent = 'Contact form is not configured yet. Please email saan63238@gmail.com directly.';
          status.className = 'tool-status error';
        }
        return;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
    });
  }

  /* =========================================================
     TOOLS — PDF operations
     ========================================================= */

  /* ---- MERGE ---- */
  (function mergeTool() {
    const dz = $('#mergeDropzone');
    if (!dz || !$('#mergeInput')) return;
    const input = $('#mergeInput');
    const filelist = $('#mergeFilelist');
    const runBtn = $('#mergeRun');
    const resetBtn = $('#mergeReset');
    const status = $('#mergeStatus');
    let files = [];

    function render() {
      if (!filelist) return;
      filelist.innerHTML = files.map(f =>
        `<div class="file-item"><span>${escapeHtml(f.name)}</span><span>${(f.size / 1024).toFixed(1)} KB</span></div>`
      ).join('');
      if (runBtn) runBtn.disabled = files.length < 2;
      if (resetBtn) resetBtn.disabled = files.length === 0;
    }

    input.addEventListener('change', () => {
      files = Array.from(input.files || []);
      render();
      setStatus(status, files.length + ' file(s) selected.');
    });
    resetBtn && resetBtn.addEventListener('click', () => {
      files = []; input.value = ''; render(); setStatus(status, '');
    });
    runBtn && runBtn.addEventListener('click', async () => {
      if (!PDFLibReady()) { setStatus(status, 'PDF library not loaded.', 'error'); return; }
      if (files.length < 2) return;
      setStatus(status, 'Merging…');
      try {
        const merged = await PDFLibReady().PDFDocument.create();
        for (const f of files) {
          const bytes = await f.arrayBuffer();
          const src = await PDFLibReady().PDFDocument.load(bytes);
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        }
        const out = await merged.save();
        downloadBytes(out, 'merged.pdf');
        setStatus(status, 'Merged successfully.', 'success');
      } catch (err) {
        console.error(err);
        setStatus(status, 'Merge failed: ' + err.message, 'error');
      }
    });
  })();

  /* ---- SPLIT ---- */
  (function splitTool() {
    const input = $('#splitInput');
    if (!input) return;
    const runBtn = $('#splitRun');
    const resetBtn = $('#splitReset');
    const status = $('#splitStatus');
    const rangeInput = $('#splitRange');
    let file = null;

    function parseRange(str, max) {
      const out = new Set();
      String(str).split(',').forEach(part => {
        part = part.trim();
        if (!part) return;
        if (part.includes('-')) {
          const [a, b] = part.split('-').map(n => parseInt(n, 10));
          for (let i = a; i <= b; i++) if (i >= 1 && i <= max) out.add(i);
        } else {
          const n = parseInt(part, 10);
          if (n >= 1 && n <= max) out.add(n);
        }
      });
      return Array.from(out).sort((a, b) => a - b);
    }

    input.addEventListener('change', () => {
      file = input.files && input.files[0];
      if (runBtn) runBtn.disabled = !file;
      if (resetBtn) resetBtn.disabled = !file;
      if (file) setStatus(status, 'Loaded: ' + file.name);
    });
    resetBtn && resetBtn.addEventListener('click', () => {
      file = null; input.value = '';
      if (runBtn) runBtn.disabled = true;
      if (resetBtn) resetBtn.disabled = true;
      setStatus(status, '');
    });
    runBtn && runBtn.addEventListener('click', async () => {
      if (!file || !PDFLibReady()) return;
      setStatus(status, 'Extracting…');
      try {
        const bytes = await file.arrayBuffer();
        const src = await PDFLibReady().PDFDocument.load(bytes);
        const total = src.getPageCount();
        const pages = parseRange(rangeInput ? rangeInput.value : '1-1', total);
        if (!pages.length) { setStatus(status, 'Invalid page range.', 'error'); return; }
        const out = await PDFLibReady().PDFDocument.create();
        const copied = await out.copyPages(src, pages.map(p => p - 1));
        copied.forEach(p => out.addPage(p));
        const saved = await out.save();
        downloadBytes(saved, 'split.pdf');
        setStatus(status, `Extracted ${pages.length} page(s).`, 'success');
      } catch (err) {
        console.error(err);
        setStatus(status, 'Split failed: ' + err.message, 'error');
      }
    });
  })();

  /* ---- REDACT ---- */
  (function redactTool() {
    const input = $('#redactInput');
    if (!input) return;
    const runBtn = $('#redactRun');
    const resetBtn = $('#redactReset');
    const status = $('#redactStatus');
    const termInput = $('#redactTerm');
    let file = null;

    input.addEventListener('change', () => {
      file = input.files && input.files[0];
      if (runBtn) runBtn.disabled = !file;
      if (resetBtn) resetBtn.disabled = !file;
      if (file) setStatus(status, 'Loaded: ' + file.name);
    });
    resetBtn && resetBtn.addEventListener('click', () => {
      file = null; input.value = '';
      if (runBtn) runBtn.disabled = true;
      if (resetBtn) resetBtn.disabled = true;
      setStatus(status, '');
    });
    runBtn && runBtn.addEventListener('click', async () => {
      if (!file || !PDFLibReady() || !PDFJSReady()) {
        setStatus(status, 'Libraries not loaded.', 'error'); return;
      }
      const term = (termInput && termInput.value || '').trim();
      if (!term) { setStatus(status, 'Enter text to redact.', 'error'); return; }
      setStatus(status, 'Processing…');
      try {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFJSReady().getDocument({ data: bytes.slice(0) }).promise;
        const hits = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const content = await page.getTextContent();
          content.items.forEach(item => {
            if (!item.str) return;
            if (item.str.toLowerCase().includes(term.toLowerCase())) {
              const tx = item.transform;
              hits.push({
                pageIndex: i - 1,
                x: tx[4],
                y: viewport.height - tx[5] - (item.height || 10),
                w: item.width || 60,
                h: item.height || 10
              });
            }
          });
        }
        const doc = await PDFLibReady().PDFDocument.load(bytes);
        hits.forEach(h => {
          const page = doc.getPage(h.pageIndex);
          page.drawRectangle({
            x: h.x, y: h.y, width: h.w, height: h.h,
            color: PDFLibReady().rgb(0, 0, 0)
          });
        });
        doc.setTitle(''); doc.setAuthor(''); doc.setSubject('');
        doc.setKeywords([]); doc.setProducer(''); doc.setCreator('');
        const saved = await doc.save();
        downloadBytes(saved, 'redacted.pdf');
        setStatus(status, `Redacted ${hits.length} occurrence(s). Metadata stripped.`, 'success');
      } catch (err) {
        console.error(err);
        setStatus(status, 'Redaction failed: ' + err.message, 'error');
      }
    });
  })();

  /* ---- COMPRESS ---- */
  (function compressTool() {
    const input = $('#compressInput');
    if (!input) return;
    const runBtn = $('#compressRun');
    const resetBtn = $('#compressReset');
    const status = $('#compressStatus');
    let file = null;

    input.addEventListener('change', () => {
      file = input.files && input.files[0];
      if (runBtn) runBtn.disabled = !file;
      if (resetBtn) resetBtn.disabled = !file;
      if (file) setStatus(status, 'Loaded: ' + file.name);
    });
    resetBtn && resetBtn.addEventListener('click', () => {
      file = null; input.value = '';
      if (runBtn) runBtn.disabled = true;
      if (resetBtn) resetBtn.disabled = true;
      setStatus(status, '');
    });
    runBtn && runBtn.addEventListener('click', async () => {
      if (!file || !PDFLibReady()) return;
      setStatus(status, 'Optimizing…');
      try {
        const bytes = await file.arrayBuffer();
        const doc = await PDFLibReady().PDFDocument.load(bytes);
        doc.setTitle(''); doc.setAuthor(''); doc.setSubject('');
        doc.setKeywords([]); doc.setProducer(''); doc.setCreator('');
        const saved = await doc.save({ useObjectStreams: true });
        const before = bytes.byteLength;
        const after = saved.byteLength;
        downloadBytes(saved, 'optimized.pdf');
        const pct = before ? Math.round((1 - after / before) * 100) : 0;
        setStatus(status, `Done. ${(before/1024).toFixed(0)} KB → ${(after/1024).toFixed(0)} KB (${pct}% smaller).`, 'success');
      } catch (err) {
        console.error(err);
        setStatus(status, 'Optimize failed: ' + err.message, 'error');
      }
    });
  })();

  /* ---- BATES ---- */
  (function batesTool() {
    const input = $('#batesInput');
    if (!input) return;
    const runBtn = $('#batesRun');
    const resetBtn = $('#batesReset');
    const status = $('#batesStatus');
    const prefixIn = $('#batesPrefix');
    const startIn = $('#batesStart');
    const digitsIn = $('#batesDigits');
    let file = null;

    input.addEventListener('change', () => {
      file = input.files && input.files[0];
      if (runBtn) runBtn.disabled = !file;
      if (resetBtn) resetBtn.disabled = !file;
      if (file) setStatus(status, 'Loaded: ' + file.name);
    });
    resetBtn && resetBtn.addEventListener('click', () => {
      file = null; input.value = '';
      if (runBtn) runBtn.disabled = true;
      if (resetBtn) resetBtn.disabled = true;
      setStatus(status, '');
    });
    runBtn && runBtn.addEventListener('click', async () => {
      if (!file || !PDFLibReady()) return;
      setStatus(status, 'Applying Bates numbers…');
      try {
        const prefix = (prefixIn && prefixIn.value) || 'BATES';
        let start = parseInt(startIn && startIn.value, 10) || 1;
        const digits = Math.min(10, Math.max(1, parseInt(digitsIn && digitsIn.value, 10) || 6));
        const bytes = await file.arrayBuffer();
        const doc = await PDFLibReady().PDFDocument.load(bytes);
        const pages = doc.getPages();
        const font = await doc.embedFont(PDFLibReady().StandardFonts.HelveticaBold);
        pages.forEach((page, idx) => {
          const num = String(start + idx).padStart(digits, '0');
          const text = prefix + num;
          const { width } = page.getSize();
          page.drawText(text, {
            x: width - 12 - font.widthOfTextAtSize(text, 9),
            y: 12,
            size: 9,
            font,
            color: PDFLibReady().rgb(0.1, 0.1, 0.1)
          });
        });
        const saved = await doc.save();
        downloadBytes(saved, 'bates.pdf');
        setStatus(status, `Applied Bates numbers to ${pages.length} page(s).`, 'success');
      } catch (err) {
        console.error(err);
        setStatus(status, 'Bates failed: ' + err.message, 'error');
      }
    });
  })();

})();