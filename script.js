/* ========================================
   Мобильное меню
======================================== */

const burger = document.querySelector('.burger');
const mobileMenu = document.querySelector('.mobile-menu');

burger?.addEventListener('click', () => {
  mobileMenu?.classList.toggle('open');
});

mobileMenu?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
  });
});


/* ========================================
   Анимация появления элементов
======================================== */

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.08,
    rootMargin: '0px 0px -20px 0px'
  }
);

document.querySelectorAll('.reveal').forEach((element) => {
  revealObserver.observe(element);
});


/* ========================================
   Загрузка фотографий
======================================== */

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

/*
  Быстрая загрузка списка фотографий.
  Файлы не проверяются по одному, поэтому галерея
  появляется практически сразу.
*/

async function loadManifest(folder) {
  try {
    const response = await fetch(`${folder}/manifest.json`, {
      cache: 'default'
    });

    if (!response.ok) {
      return null;
    }

    const files = await response.json();

    if (!Array.isArray(files) || files.length === 0) {
      return null;
    }

    return files.map((file) => `${folder}/${file}`);
  } catch (error) {
    console.error(`Ошибка загрузки ${folder}/manifest.json`, error);
    return null;
  }
}


/*
  Резервный поиск фотографий 1.jpg, 2.jpg и т. д.
  Используется только тогда, когда manifest.json отсутствует.
*/

function imageExists(src) {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

async function discoverNumberedImages(folder, max = 60) {
  const images = [];

  for (let index = 1; index <= max; index += 1) {
    const possibleImages = IMAGE_EXTENSIONS.map(
      (extension) => `${folder}/${index}.${extension}`
    );

    const checks = await Promise.all(
      possibleImages.map(async (src) => {
        const exists = await imageExists(src);
        return exists ? src : null;
      })
    );

    const foundImage = checks.find(Boolean);

    if (foundImage) {
      images.push(foundImage);
    } else if (images.length > 0) {
      break;
    } else if (index >= 3) {
      break;
    }
  }

  return images;
}

async function discoverImages(folder) {
  const manifestImages = await loadManifest(folder);

  if (manifestImages?.length) {
    return manifestImages;
  }

  return discoverNumberedImages(folder);
}


/* ========================================
   Слайдер фотографий
======================================== */

class GallerySlider {
  constructor(root, images, lightbox) {
    this.root = root;
    this.images = images;
    this.lightbox = lightbox;

    this.index = 0;
    this.touchStartX = 0;
    this.touchDeltaX = 0;

    this.autoPlayTimer = null;
    this.autoPlayDelay = 4000;

    this.track = root.querySelector('.slider-track');
    this.dots = root.querySelector('.slider-dots');
    this.prevBtn = root.querySelector('.slider-arrow--prev');
    this.nextBtn = root.querySelector('.slider-arrow--next');
    this.viewport = root.querySelector('.slider-viewport');

    this.render();
    this.bindEvents();
    this.update(false);
    this.preloadNextImages();
    this.startAutoPlay();
  }

  render() {
    if (!this.images.length) {
      this.root.innerHTML = `
        <div class="gallery-empty">
          <p>Фотографии скоро появятся в этой галерее.</p>
        </div>
      `;
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
                <img
                  src="${src}"
                  alt="Фото ${index + 1}"
                  loading="${index === 0 ? 'eager' : 'lazy'}"
                  fetchpriority="${index === 0 ? 'high' : 'auto'}"
                  decoding="async"
                >
              </div>

              <span class="gallery-card__zoom" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                >
                  <path
                    d="M7.5 3H4.5C3.67 3 3 3.67 3 4.5V7.5
                       M11.5 3H14.5C15.33 3 16 3.67 16 4.5V7.5
                       M11.5 15H14.5C15.33 15 16 14.33 16 13.5V10.5
                       M7.5 15H4.5C3.67 15 3 14.33 3 13.5V10.5"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                  />
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
            data-index="${index}"
            aria-label="Перейти к фото ${index + 1}"
          ></button>
        `
      )
      .join('');
  }

  bindEvents() {
    if (!this.images.length) return;

    this.prevBtn?.addEventListener('click', () => {
      this.goTo(this.index - 1);
    });

    this.nextBtn?.addEventListener('click', () => {
      this.goTo(this.index + 1);
    });

    this.dots?.addEventListener('click', (event) => {
      const dot = event.target.closest('.slider-dot');

      if (!dot) return;

      this.goTo(Number(dot.dataset.index));
    });

    this.track?.addEventListener('click', (event) => {
      const card = event.target.closest('.gallery-card');

      if (!card) return;

      this.stopAutoPlay();

      this.lightbox.open(
        this.images,
        Number(card.dataset.index)
      );
    });

    this.viewport?.addEventListener(
      'touchstart',
      (event) => {
        this.stopAutoPlay();
        this.touchStartX = event.changedTouches[0].clientX;
        this.touchDeltaX = 0;
      },
      { passive: true }
    );

    this.viewport?.addEventListener(
      'touchmove',
      (event) => {
        this.touchDeltaX =
          event.changedTouches[0].clientX - this.touchStartX;
      },
      { passive: true }
    );

    this.viewport?.addEventListener(
      'touchend',
      () => {
        if (Math.abs(this.touchDeltaX) >= 48) {
          if (this.touchDeltaX < 0) {
            this.goTo(this.index + 1, false);
          } else {
            this.goTo(this.index - 1, false);
          }
        }

        window.setTimeout(() => {
          this.startAutoPlay();
        }, 1500);
      },
      { passive: true }
    );

    this.root.addEventListener('mouseenter', () => {
      this.stopAutoPlay();
    });

    this.root.addEventListener('mouseleave', () => {
      this.startAutoPlay();
    });

    window.addEventListener('resize', () => {
      this.update(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopAutoPlay();
      } else {
        this.startAutoPlay();
      }
    });
  }

  preloadNextImages() {
    this.images.slice(1, 4).forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }

  startAutoPlay() {
    if (this.images.length <= 1) return;

    this.stopAutoPlay();

    this.autoPlayTimer = window.setInterval(() => {
      this.goTo(this.index + 1, false);
    }, this.autoPlayDelay);
  }

  stopAutoPlay() {
    if (!this.autoPlayTimer) return;

    window.clearInterval(this.autoPlayTimer);
    this.autoPlayTimer = null;
  }

  restartAutoPlay() {
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  goTo(nextIndex, restartTimer = true) {
    if (!this.images.length) return;

    this.index =
      (nextIndex + this.images.length) %
      this.images.length;

    this.update(true);

    if (restartTimer) {
      this.restartAutoPlay();
    }
  }

  update(animate = true) {
    if (!this.track) return;

    if (!animate) {
      this.track.style.transition = 'none';
    }

    this.track.style.transform =
      `translate3d(-${this.index * 100}%, 0, 0)`;

    if (!animate) {
      this.track.offsetHeight;
      this.track.style.transition = '';
    }

    this.dots
      ?.querySelectorAll('.slider-dot')
      .forEach((dot, dotIndex) => {
        dot.classList.toggle(
          'is-active',
          dotIndex === this.index
        );
      });

    const onlyOneImage = this.images.length <= 1;

    if (this.prevBtn) {
      this.prevBtn.disabled = onlyOneImage;
    }

    if (this.nextBtn) {
      this.nextBtn.disabled = onlyOneImage;
    }
  }
}


/* ========================================
   Просмотр фотографии на весь экран
======================================== */

class Lightbox {
  constructor(root) {
    this.root = root;
    this.images = [];
    this.index = 0;

    this.image = root.querySelector('.lightbox-image');
    this.counter = root.querySelector('.lightbox-counter');
    this.prevBtn = root.querySelector('.lightbox-arrow--prev');
    this.nextBtn = root.querySelector('.lightbox-arrow--next');

    root
      .querySelectorAll('[data-lightbox-close]')
      .forEach((element) => {
        element.addEventListener('click', () => {
          this.close();
        });
      });

    this.prevBtn?.addEventListener('click', () => {
      this.step(-1);
    });

    this.nextBtn?.addEventListener('click', () => {
      this.step(1);
    });

    document.addEventListener('keydown', (event) => {
      if (!this.root.classList.contains('is-open')) return;

      if (event.key === 'Escape') {
        this.close();
      }

      if (event.key === 'ArrowLeft') {
        this.step(-1);
      }

      if (event.key === 'ArrowRight') {
        this.step(1);
      }
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

        if (this.image) {
          this.image.src = '';
        }
      }
    }, 450);
  }

  step(direction) {
    if (!this.images.length) return;

    this.index =
      (this.index + direction + this.images.length) %
      this.images.length;

    this.render();
  }

  render() {
    if (!this.image || !this.images.length) return;

    this.image.src = this.images[this.index];
    this.image.alt =
      `Фото ${this.index + 1} из ${this.images.length}`;

    if (this.counter) {
      this.counter.textContent =
        `${this.index + 1} / ${this.images.length}`;
    }

    const onlyOneImage = this.images.length <= 1;

    if (this.prevBtn) {
      this.prevBtn.hidden = onlyOneImage;
    }

    if (this.nextBtn) {
      this.nextBtn.hidden = onlyOneImage;
    }
  }
}


/* ========================================
   Запуск галерей
======================================== */

async function createGallery(sliderRoot, lightbox) {
  const folder = sliderRoot.dataset.folder;

  if (!folder) return;

  const images = await discoverImages(folder);

  new GallerySlider(sliderRoot, images, lightbox);
}

async function initGalleries() {
  const lightboxRoot = document.getElementById('lightbox');

  if (!lightboxRoot) {
    console.error('Не найден блок lightbox');
    return;
  }

  const lightbox = new Lightbox(lightboxRoot);
  const sliders = [
    ...document.querySelectorAll('[data-gallery]')
  ];

  /*
    Обе галереи загружаются одновременно:
    отзывы и фотографии до/после.
  */

  await Promise.all(
    sliders.map((sliderRoot) => {
      return createGallery(sliderRoot, lightbox);
    })
  );
}

initGalleries();