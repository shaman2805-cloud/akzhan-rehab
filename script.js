/* Progressive enhancement: content, links, galleries and details exist in HTML. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const html = document.documentElement;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 640px)');
  const motionKey = 'akzhan-motion-preference-v2';
  let motionPreference = 'full';
  try {
    const saved = localStorage.getItem(motionKey);
    if (['auto', 'full', 'reduced'].includes(saved)) motionPreference = saved;
    // Apply the new default to returning visitors, preserving a deliberate opt-out.
    else if (saved === null && localStorage.getItem('akzhan-motion-preference') === 'reduced') motionPreference = 'reduced';
  } catch (_) { /* The control still works when device storage is unavailable. */ }
  const reduced = () => motionPreference === 'reduced' || (motionPreference === 'auto' && motionQuery.matches);
  html.classList.toggle('motion-full', motionPreference === 'full');
  html.classList.toggle('reduce-motion', reduced());
  const motionSelects = $$('.motion-select');
  function watchMedia(query, listener) {
    if (query.addEventListener) query.addEventListener('change', listener);
    else if (query.addListener) query.addListener(listener);
  }
  const menu = $('#mobile-menu');
  const menuToggle = $('.menu-toggle');
  const lightbox = $('#lightbox');
  const sticky = $('.mobile-action');
  let heroPassed = false;
  let atContact = false;
  let menuOrigin = null;
  let lightboxOrigin = null;
  let fullImages = [];
  let fullIndex = 0;
  let journeyBusy = false;
  let journeyAnimation = null;
  const countAnimations = new Map();
  const curtain = $('.journey-curtain');

  // Text masks preserve the heading's complete accessible name.
  $$('h2').forEach(heading => {
    const copy = heading.cloneNode(true);
    $$('br', copy).forEach(br => br.replaceWith(' '));
    heading.setAttribute('aria-label', copy.textContent.replace(/\s+/g, ' ').trim());
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let wordIndex = 0;
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word => {
        if (!word.trim()) { fragment.append(document.createTextNode(word)); return; }
        const mask = document.createElement('span');
        mask.className = 'motion-word';
        mask.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.className = 'motion-word-inner';
        inner.textContent = word;
        inner.style.setProperty('--word-delay', `${Math.min(wordIndex++, 9) * 55}ms`);
        mask.append(inner);
        fragment.append(mask);
      });
      node.replaceWith(fragment);
    });
  });
  ['.service-list .service', '.product-features li', '.club-features p', '.education-links a', '.faq-list details'].forEach(selector => {
    $$(selector).forEach((element, index) => {
      element.classList.add('reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index, 3) * 75}ms`);
    });
  });

  function arriveAt(target, hash) {
    const top = target.getBoundingClientRect().top + window.scrollY - $('.header').offsetHeight - 14;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    try { history.pushState(null, '', hash); } catch (_) { /* Standalone previews can restrict history. */ }
    const title = $('h2', target) || target;
    const originalTabIndex = title.getAttribute('tabindex');
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
    title.addEventListener('blur', () => {
      if (originalTabIndex === null) title.removeAttribute('tabindex');
      else title.setAttribute('tabindex', originalTabIndex);
    }, { once: true });
  }
  $$('[data-journey]').forEach(link => link.addEventListener('click', async event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const hash = link.getAttribute('href');
    const target = $(hash);
    if (!target) return;
    event.preventDefault();
    if (journeyBusy) return;
    if (reduced() || !curtain?.animate) { arriveAt(target, hash); return; }
    journeyBusy = true;
    html.classList.add('in-journey');
    const rect = link.getBoundingClientRect();
    const x = Math.max(0, Math.min(window.innerWidth, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(window.innerHeight, rect.top + rect.height / 2));
    const radius = Math.hypot(window.innerWidth, window.innerHeight);
    let arrived = false;
    curtain.hidden = false;
    try {
      journeyAnimation = curtain.animate([
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${radius}px at ${x}px ${y}px)` }
      ], { duration: 460, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
      await journeyAnimation.finished;
      arriveAt(target, hash);
      arrived = true;
      if (!reduced()) {
        journeyAnimation = curtain.animate([
          { transform: 'translateY(0)', borderRadius: '0 0 0 0' },
          { transform: 'translateY(-105%)', borderRadius: '0 0 42% 42%' }
        ], { duration: 690, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' });
        await journeyAnimation.finished;
      }
    } catch (_) {
      if (!arrived) arriveAt(target, hash);
    } finally {
      curtain.hidden = true;
      curtain.getAnimations().forEach(animation => animation.cancel());
      journeyAnimation = null;
      journeyBusy = false;
      html.classList.remove('in-journey');
    }
  }));
  $$('.button').forEach(button => button.addEventListener('click', event => {
    if (reduced()) return;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'tap-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.detail ? event.clientX - rect.left : rect.width / 2}px`;
    ripple.style.top = `${event.detail ? event.clientY - rect.top : rect.height / 2}px`;
    button.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    window.setTimeout(() => ripple.remove(), 900);
  }));

  function syncSticky() {
    const show = mobileQuery.matches && heroPassed && !atContact && !menu.open && !lightbox.open;
    sticky.hidden = false;
    sticky.classList.toggle('is-visible', show);
    sticky.inert = !show;
    sticky.setAttribute('aria-hidden', String(!show));
    document.body.classList.toggle('has-mobile-action', mobileQuery.matches);
  }
  function syncLock() {
    document.body.classList.toggle('is-locked', menu.open || lightbox.open);
    syncSticky();
  }
  menuToggle.addEventListener('click', () => {
    if (menu.open) return;
    menuOrigin = document.activeElement;
    menu.showModal();
    menuToggle.setAttribute('aria-expanded', 'true');
    syncLock();
  });
  $('.menu-close').addEventListener('click', () => menu.close());
  menu.addEventListener('click', event => {
    if (event.target === menu && event.clientX < menu.getBoundingClientRect().left) menu.close();
  });
  menu.addEventListener('close', () => {
    menuToggle.setAttribute('aria-expanded', 'false');
    syncLock();
    menuOrigin?.focus({ preventScroll: true });
  });
  $$('a', menu).forEach(link => link.addEventListener('click', () => menu.close()));
  watchMedia(window.matchMedia('(min-width: 851px)'), event => {
    if (event.matches && menu.open) menu.close();
  });

  // Native horizontal scrolling works with touch, trackpads and keyboard.
  const tabs = $$('[data-tab]');
  const panels = $$('.gallery-panel');
  let panel = $('#panel-results');
  const track = () => $('.gallery-track', panel);
  const galleryCards = () => $$('.gallery-card', panel);
  const playButton = $('.gallery-play');
  let userPaused = false;
  let galleryVisible = false;
  let galleryHovered = false;
  let playTimer = null;
  let galleryFrame = null;

  function indexForTrack() {
    const rail = track();
    const items = $$('.gallery-item', rail);
    const first = items[0]?.offsetLeft || 0;
    let best = 0;
    let distance = Infinity;
    items.forEach((item, index) => {
      const d = Math.abs(item.offsetLeft - first - rail.scrollLeft);
      if (d < distance) { distance = d; best = index; }
    });
    return best;
  }
  function updateGalleryCounter() {
    const total = galleryCards().length;
    const current = indexForTrack();
    $('.gallery-counter').textContent = `${String(current + 1).padStart(2, '0')} / ${total}`;
    $('#results').style.setProperty('--gallery-progress', String((current + 1) / total));
    const rail = track();
    const bounds = rail.getBoundingClientRect();
    const center = bounds.left + rail.clientWidth / 2;
    // Read layout before writing transforms; only the card, never its item, moves.
    const positions = $$('.gallery-item', rail).map(item => {
      const rect = item.getBoundingClientRect();
      return (rect.left + rect.width / 2 - center) / (rect.width + 20);
    });
    galleryCards().forEach((card, index) => {
      const distance = Math.min(1.8, Math.abs(positions[index]));
      card.classList.toggle('is-current', index === current);
      card.style.setProperty('--card-scale', String(reduced() ? 1 : 1 - distance * .075));
      card.style.setProperty('--card-y', `${reduced() ? 0 : distance * 18}px`);
      card.style.setProperty('--card-angle', `${reduced() ? 0 : Math.max(-13, Math.min(13, -positions[index] * 11))}deg`);
      card.style.setProperty('--card-opacity', String(reduced() ? 1 : 1 - distance * .15));
    });
  }
  function updatePlayback() {
    if (playTimer) window.clearInterval(playTimer);
    playTimer = null;
    const paused = userPaused || reduced();
    playButton.setAttribute('aria-pressed', String(paused));
    playButton.setAttribute('aria-label', paused ? 'Включить автопрокрутку' : 'Остановить автопрокрутку');
    playButton.disabled = reduced();
    if (!paused && galleryVisible && !galleryHovered && !document.hidden && !lightbox.open && !menu.open) {
      playTimer = window.setInterval(() => moveGallery(1, false), 6000);
    }
  }
  function pauseGallery() { userPaused = true; updatePlayback(); }
  function moveGallery(direction, manual = true) {
    if (manual) pauseGallery();
    const rail = track();
    const items = $$('.gallery-item', rail);
    if (items.length < 2) return;
    const max = rail.scrollWidth - rail.clientWidth;
    const index = indexForTrack();
    let left;
    let wrapping = false;
    if (direction > 0 && rail.scrollLeft >= max - 3) { left = 0; wrapping = true; }
    else if (direction < 0 && rail.scrollLeft <= 3) { left = max; wrapping = true; }
    else {
      const next = Math.max(0, Math.min(items.length - 1, index + direction));
      left = Math.min(max, items[next].offsetLeft - items[0].offsetLeft);
    }
    rail.scrollTo({ left, behavior: reduced() || wrapping ? 'instant' : 'smooth' });
    if (wrapping && !reduced() && rail.animate) {
      rail.animate([{ opacity: .2, transform: `translateX(${direction * 24}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }
  function selectTab(tab, focus = false) {
    const changing = panel.id !== tab.getAttribute('aria-controls');
    tabs.forEach(button => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(item => { item.hidden = item.id !== tab.getAttribute('aria-controls'); });
    panel = document.getElementById(tab.getAttribute('aria-controls'));
    $('.gallery-tabs').style.setProperty('--tab-shift', tab.dataset.tab === 'reviews' ? '100%' : '0%');
    if (changing && !reduced() && panel.animate) {
      panel.getAnimations().forEach(animation => animation.cancel());
      panel.animate([
        { opacity: .2, clipPath: 'inset(0 0 35% 0 round 32px)', transform: 'translateY(22px)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0 round 0px)', transform: 'translateY(0)' }
      ], { duration: 720, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    if (focus) tab.focus({ preventScroll: true });
    pauseGallery();
    updateGalleryCounter();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  });
  $('.gallery-prev').addEventListener('click', () => moveGallery(-1));
  $('.gallery-next').addEventListener('click', () => moveGallery(1));
  playButton.addEventListener('click', () => { userPaused = !userPaused; updatePlayback(); });
  panels.forEach(item => {
    const rail = $('.gallery-track', item);
    rail.addEventListener('scroll', () => {
      if (galleryFrame) return;
      galleryFrame = requestAnimationFrame(() => { galleryFrame = null; updateGalleryCounter(); });
    }, { passive: true });
    rail.addEventListener('pointerdown', pauseGallery, { passive: true });
    rail.addEventListener('focusin', pauseGallery);
    item.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        moveGallery(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });
    // Touch-generated mouse events must not leave autoplay permanently hovered.
    item.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      galleryHovered = true;
      updatePlayback();
    });
    item.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'mouse') return;
      galleryHovered = false;
      updatePlayback();
    });
    rail.addEventListener('click', event => {
      const card = event.target.closest('.gallery-card');
      if (!card) return;
      event.preventDefault();
      pauseGallery();
      const cards = $$('.gallery-card', item);
      fullImages = cards.map(button => ({ src: button.dataset.full, alt: $('img', button).alt }));
      fullIndex = cards.indexOf(card);
      lightboxOrigin = card;
      renderLightbox();
      lightbox.showModal();
      syncLock();
      updatePlayback();
    });
  });
  function renderLightbox() {
    const img = $('.lightbox-image');
    const entry = fullImages[fullIndex];
    if (!entry) return;
    img.src = entry.src;
    img.alt = entry.alt;
    $('.lightbox-counter').textContent = `${fullIndex + 1} / ${fullImages.length}`;
    if (!reduced() && img.animate) {
      img.getAnimations().forEach(animation => animation.cancel());
      img.animate([{ opacity: 0, transform: 'scale(.94) translateY(14px)' }, { opacity: 1, transform: 'scale(1) translateY(0)' }], { duration: 440, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  }
  function stepLightbox(direction) {
    if (!fullImages.length) return;
    fullIndex = (fullIndex + direction + fullImages.length) % fullImages.length;
    renderLightbox();
  }
  $('.lightbox-close').addEventListener('click', () => lightbox.close());
  $('.lightbox-prev').addEventListener('click', () => stepLightbox(-1));
  $('.lightbox-next').addEventListener('click', () => stepLightbox(1));
  lightbox.addEventListener('close', () => {
    syncLock();
    lightboxOrigin?.focus({ preventScroll: true });
    updatePlayback();
  });
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); stepLightbox(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  lightbox.addEventListener('click', event => {
    if (event.target === $('.lightbox-stage')) lightbox.close();
  });
  let swipeStart = null;
  $('.lightbox-stage').addEventListener('touchstart', event => {
    swipeStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  $('.lightbox-stage').addEventListener('touchend', event => {
    if (!swipeStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - swipeStart.x;
    const dy = event.changedTouches[0].clientY - swipeStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) stepLightbox(dx < 0 ? 1 : -1);
    swipeStart = null;
  }, { passive: true });
  $('.lightbox-stage').addEventListener('touchcancel', () => { swipeStart = null; }, { passive: true });

  // Animate native details. They remain fully usable without JavaScript.
  $$('details').forEach(details => {
    const summary = $('summary', details);
    let animation = null;
    let intendedOpen = details.open;
    summary.addEventListener('click', event => {
      if (reduced() || !details.animate) return;
      event.preventDefault();
      const start = details.offsetHeight;
      const opening = animation ? !intendedOpen : !details.open;
      animation?.cancel();
      intendedOpen = opening;
      details.open = true;
      const end = opening ? details.offsetHeight : summary.offsetHeight + 2;
      details.style.overflow = 'hidden';
      animation = details.animate({ height: [`${start}px`, `${end}px`] }, { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
      animation.onfinish = () => {
        details.open = opening;
        details.style.overflow = '';
        animation = null;
      };
      animation.oncancel = () => { details.style.overflow = ''; };
    });
  });

  function countUp(element) {
    const value = Number(element.dataset.count);
    if (!Number.isFinite(value) || element.dataset.counted) return;
    element.dataset.counted = 'true';
    if (reduced()) return;
    const start = performance.now();
    element.setAttribute('aria-label', String(value));
    function frame(now) {
      const progress = reduced() ? 1 : Math.min(1, (now - start) / 1150);
      element.textContent = String(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) countAnimations.set(element, requestAnimationFrame(frame));
      else countAnimations.delete(element);
    }
    countAnimations.set(element, requestAnimationFrame(frame));
  }

  function setSectionVisibility(section, visible) {
    section.classList.toggle('in-view', visible);
    section.classList.toggle('motion-offscreen', !visible);
  }

  // Reveal once; don't hide previously read content on upward scrolling.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold: .05, rootMargin: '0px 0px -18px 0px' });
    $$('.reveal').forEach(element => {
      element.classList.add('will-reveal');
      observer.observe(element);
    });
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => setSectionVisibility(entry.target, entry.isIntersecting));
    }, { rootMargin: '60px 0px' });
    $$('main>section').forEach(section => sectionObserver.observe(section));
    const countObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      countObserver.unobserve(entry.target);
    }), { threshold: .5 });
    $$('[data-count]').forEach(element => countObserver.observe(element));
    new IntersectionObserver(([entry]) => { galleryVisible = entry.isIntersecting; updatePlayback(); }, { threshold: .05 }).observe($('#results'));
    new IntersectionObserver(([entry]) => {
      heroPassed = !entry.isIntersecting && entry.boundingClientRect.bottom < 90;
      syncSticky();
    }, { rootMargin: '-72px 0px 0px 0px' }).observe($('.hero-book'));
    new IntersectionObserver(([entry]) => {
      atContact = entry.isIntersecting || entry.boundingClientRect.top < 0;
      syncSticky();
    }, { rootMargin: '0px 0px 70px 0px' }).observe($('#contact'));
  } else {
    $$('.reveal').forEach(element => element.classList.add('is-visible'));
    $$('main>section').forEach(section => section.classList.add('in-view'));
    galleryVisible = true;
  }
  const driftElements = $$('[data-drift]');
  let scrollFrame = null;
  function paintScroll() {
    scrollFrame = null;
    const y = window.scrollY;
    const max = html.scrollHeight - window.innerHeight;
    html.style.setProperty('--progress', String(max > 0 ? y / max : 0));
    $('.header').classList.toggle('is-scrolled', y > 16);
    if (!reduced()) {
      html.style.setProperty('--hero-shift', `${Math.min(85, y * .12)}px`);
      html.style.setProperty('--hero-rotate', `${Math.min(20, y * .025)}deg`);
      driftElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const drift = Math.max(-32, Math.min(32, (window.innerHeight / 2 - rect.top - rect.height / 2) * Number(element.dataset.drift)));
        element.style.setProperty('--drift', `${drift}px`);
      });
    }
  }
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScroll);
  }, { passive: true });
  function applyMotion() {
    html.classList.toggle('motion-full', motionPreference === 'full');
    html.classList.toggle('reduce-motion', reduced());
    motionSelects.forEach(select => { select.value = motionPreference; });
    if (reduced()) {
      journeyAnimation?.cancel();
      countAnimations.forEach((id, element) => { cancelAnimationFrame(id); element.textContent = element.dataset.count; });
      countAnimations.clear();
      // Complete in-flight Web Animations when the user switches motion off.
      if (document.getAnimations) document.getAnimations().forEach(animation => {
        if (Number.isFinite(animation.effect?.getTiming().iterations)) {
          try { animation.finish(); } catch (_) { animation.cancel(); }
        }
      });
    }
    updatePlayback();
    updateGalleryCounter();
    paintScroll();
  }
  motionSelects.forEach(select => select.addEventListener('change', () => {
    motionPreference = select.value;
    try { localStorage.setItem(motionKey, motionPreference); } catch (_) { /* Session-only choice. */ }
    applyMotion();
  }));
  watchMedia(motionQuery, applyMotion);
  watchMedia(mobileQuery, syncSticky);

  function resumeMotion() {
    document.body.classList.toggle('page-paused', document.hidden);
    if (document.hidden) { updatePlayback(); return; }
    // Mobile browsers can restore a page without new observer notifications.
    const height = window.innerHeight;
    const inViewport = (element, margin = 0) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > -margin && rect.top < height + margin;
    };
    if ('IntersectionObserver' in window) {
      $$('main>section').forEach(section => setSectionVisibility(section, inViewport(section, 60)));
    }
    $$('.will-reveal:not(.is-visible)').forEach(element => {
      if (inViewport(element, -18)) element.classList.add('is-visible');
    });
    $$('[data-count]').forEach(element => { if (inViewport(element)) countUp(element); });
    galleryVisible = inViewport($('#results'));
    galleryHovered = false;
    heroPassed = $('.hero-book').getBoundingClientRect().bottom < 90;
    atContact = $('#contact').getBoundingClientRect().top < height + 70;
    syncSticky();
    updateGalleryCounter();
    paintScroll();
    updatePlayback();
  }
  document.addEventListener('visibilitychange', resumeMotion);
  window.addEventListener('pageshow', resumeMotion);
  window.addEventListener('focus', resumeMotion);
  menu.addEventListener('close', updatePlayback);
  menuToggle.addEventListener('click', updatePlayback);
  window.addEventListener('resize', () => { updateGalleryCounter(); paintScroll(); }, { passive: true });
  window.addEventListener('hashchange', () => { if (location.hash === '#reviews') selectTab($('#tab-reviews')); });
  if (location.hash === '#reviews') selectTab($('#tab-reviews'));
  html.classList.add('motion-ready');
  $$('.motion-setting').forEach(control => { control.hidden = false; });
  applyMotion();
  resumeMotion();
})();
