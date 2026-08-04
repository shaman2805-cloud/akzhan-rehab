const burger = document.querySelector('.burger');
const mobileMenu = document.querySelector('.mobile-menu');

burger?.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function imageExists(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function loadManifest(folder) {
  try {
    const response = await fetch(`${folder}/manifest.json`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) return null;

    const verified = [];
    for (const file of data) {
      const src = `${folder}/${file}`;
      if (await imageExists(src)) verified.push(src);
    }

    return verified.length ? verified : null;
  } catch {
    return null;
  }
}

async function discoverNumberedImages(folder, max = 60) {
  const images = [];

  for (let index = 1; index <= max; index += 1) {
    let found = false;

    for (const ext of IMAGE_EXTENSIONS) {
      const src = `${folder}/${index}.${ext}`;
      if (await imageExists(src)) {
        images.push(src);
        found = true;
        break;
      }
    }

    if (!found && images.length) break;
  }

  return images;
}

async function discoverImages(folder) {
  const fromManifest = await loadManifest(folder);
  if (fromManifest?.length) return fromManifest;
  return discoverNumberedImages(folder);
}

class GallerySlider {
  constructor(root, images, lightbox) {
    this.root = root;
    this.images = images;
    this.lightbox = lightbox;
    this.index = 0;
    this.touchStartX = 0;
    this.touchDeltaX = 0;

    this.track = root.querySelector('.slider-track');
    this.dots = root.querySelector('.slider-dots');
    this.prevBtn = root.querySelector('.slider-arrow--prev');
    this.nextBtn = root.querySelector('.slider-arrow--next');
    this.viewport = root.querySelector('.slider-viewport');

    this.render();
    this.bindEvents();
    this.update();
  }

  render() {
    if (!this.images.length) {
      this.root.innerHTML = `
        <div class="gallery-empty reveal">
          <p>Фотографии скоро появятся в этой галерее.</p>
        </div>
      `;
      const empty = this.root.querySelector('.reveal');
      if (empty) revealObserver.observe(empty);
      return;
    }

    this.track.innerHTML = this.images
      .map(
        (src, index) => `
          <article class="slider-slide">
            <button
              class="gallery-card"
              type="button"
              data-index="${index}"
              aria-label="Открыть фото ${index + 1} из ${this.images.length}"
            >
              <div class="gallery-card__frame">
                <img src="${src}" alt="Фото ${index + 1}" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async">
              </div>
              <span class="gallery-card__zoom" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M7.5 3H4.5C3.67 3 3 3.67 3 4.5V7.5M11.5 3H14.5C15.33 3 16 3.67 16 4.5V7.5M11.5 15H14.5C15.33 15 16 14.33 16 13.5V10.5M7.5 15H4.5C3.67 15 3 14.33 3 13.5V10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
              </span>
            </button>
          </article>
        `
      )
      .join('');

    this.dots.innerHTML = this.images
      .map(
        (_, index) => `
          <button
            class="slider-dot${index === 0 ? ' is-active' : ''}"
            type="button"
            aria-label="Слайд ${index + 1}"
            data-index="${index}"
          ></button>
        `
      )
      .join('');
  }

  bindEvents() {
    if (!this.images.length) return;

    this.prevBtn?.addEventListener('click', () => this.goTo(this.index - 1));
    this.nextBtn?.addEventListener('click', () => this.goTo(this.index + 1));

    this.dots?.addEventListener('click', (event) => {
      const dot = event.target.closest('.slider-dot');
      if (!dot) return;
      this.goTo(Number(dot.dataset.index));
    });

    this.track?.addEventListener('click', (event) => {
      const card = event.target.closest('.gallery-card');
      if (!card) return;
      this.lightbox.open(this.images, Number(card.dataset.index));
    });

    this.viewport?.addEventListener(
      'touchstart',
      (event) => {
        this.touchStartX = event.changedTouches[0].clientX;
        this.touchDeltaX = 0;
      },
      { passive: true }
    );

    this.viewport?.addEventListener(
      'touchmove',
      (event) => {
        this.touchDeltaX = event.changedTouches[0].clientX - this.touchStartX;
      },
      { passive: true }
    );

    this.viewport?.addEventListener(
      'touchend',
      () => {
        if (Math.abs(this.touchDeltaX) < 48) return;
        if (this.touchDeltaX < 0) this.goTo(this.index + 1);
        else this.goTo(this.index - 1);
      },
      { passive: true }
    );

    window.addEventListener('resize', () => this.update(false));
  }

  goTo(nextIndex) {
    if (!this.images.length) return;
    this.index = (nextIndex + this.images.length) % this.images.length;
    this.update();
  }

  update(animate = true) {
    if (!this.track) return;

    if (!animate) this.track.style.transition = 'none';
    this.track.style.transform = `translate3d(-${this.index * 100}%, 0, 0)`;
    if (!animate) {
      this.track.offsetHeight;
      this.track.style.transition = '';
    }

    this.dots?.querySelectorAll('.slider-dot').forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === this.index);
    });

    if (this.prevBtn) this.prevBtn.disabled = this.images.length <= 1;
    if (this.nextBtn) this.nextBtn.disabled = this.images.length <= 1;
  }
}

class Lightbox {
  constructor(root) {
    this.root = root;
    this.images = [];
    this.index = 0;

    this.image = root.querySelector('.lightbox-image');
    this.counter = root.querySelector('.lightbox-counter');
    this.prevBtn = root.querySelector('.lightbox-arrow--prev');
    this.nextBtn = root.querySelector('.lightbox-arrow--next');

    root.querySelectorAll('[data-lightbox-close]').forEach((el) => {
      el.addEventListener('click', () => this.close());
    });

    this.prevBtn?.addEventListener('click', () => this.step(-1));
    this.nextBtn?.addEventListener('click', () => this.step(1));

    document.addEventListener('keydown', (event) => {
      if (!this.root.classList.contains('is-open')) return;
      if (event.key === 'Escape') this.close();
      if (event.key === 'ArrowLeft') this.step(-1);
      if (event.key === 'ArrowRight') this.step(1);
    });
  }

  open(images, index = 0) {
    this.images = images;
    this.index = index;
    this.render();

    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      this.root.classList.add('is-open');
    });
  }

  close() {
    this.root.classList.remove('is-open');
    this.root.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    window.setTimeout(() => {
      if (!this.root.classList.contains('is-open')) {
        this.root.hidden = true;
        if (this.image) this.image.src = '';
      }
    }, 450);
  }

  step(direction) {
    if (!this.images.length) return;
    this.index = (this.index + direction + this.images.length) % this.images.length;
    this.render();
  }

  render() {
    if (!this.image || !this.images.length) return;

    this.image.src = this.images[this.index];
    this.image.alt = `Фото ${this.index + 1} из ${this.images.length}`;

    if (this.counter) {
      this.counter.textContent = `${this.index + 1} / ${this.images.length}`;
    }

    const single = this.images.length <= 1;
    if (this.prevBtn) this.prevBtn.hidden = single;
    if (this.nextBtn) this.nextBtn.hidden = single;
  }
}

async function initGalleries() {
  const lightbox = new Lightbox(document.getElementById('lightbox'));
  const sliders = document.querySelectorAll('[data-gallery]');

  for (const sliderRoot of sliders) {
    const folder = sliderRoot.dataset.folder;
    if (!folder) continue;

    const images = await discoverImages(folder);
    new GallerySlider(sliderRoot, images, lightbox);
  }
}

initGalleries();
