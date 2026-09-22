const forms = document.querySelectorAll('[data-form]');

const TELEGRAM = {
  botToken: '',
  chatId: '',
};

async function sendToTelegram(payload) {
  const serverEndpoint = '/api/lead';

  try {
    const response = await fetch(serverEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) return;
  } catch {
  }

  if (!TELEGRAM.botToken || !TELEGRAM.chatId) {
    throw new Error('Telegram не налаштовано');
  }

  const text = [
    'Нова заявка з сайту PivTorg',
    `Імʼя: ${payload.name || '—'}`,
    `Телефон: ${payload.phone || '—'}`,
    `Компанія: ${payload.company || '—'}`,
    `Коментар: ${payload.message || '—'}`,
    `Сторінка: ${location.href}`,
    `Час: ${new Date().toLocaleString('uk-UA')}`,
  ].join('\n');

  const fallbackResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM.chatId,
      text,
    }),
  });

  if (!fallbackResponse.ok) {
    throw new Error('Не вдалося відправити заявку');
  }
}

for (const form of forms) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const status = form.querySelector('[data-status]');
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get('name') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      company: String(formData.get('company') || '').trim(),
      message: String(formData.get('message') || '').trim(),
    };

    status.textContent = 'Відправляємо...';
    submitButton.disabled = true;

    try {
      await sendToTelegram(payload);
      status.textContent = 'Дякуємо! Заявку відправлено.';
      form.reset();
    } catch (error) {
      status.textContent = 'Не вдалося відправити. Перевірте налаштування Telegram.';
      console.error(error);
    } finally {
      submitButton.disabled = false;
    }
  });
}

const year = document.getElementById('year');
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

if (menuToggle && mobileMenu) {
  const closeTargets = mobileMenu.querySelectorAll('[data-menu-close], [data-menu-link]');

  const closeMenu = () => {
    mobileMenu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.classList.remove('is-active');
    document.body.classList.remove('menu-open');
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menuToggle.classList.toggle('is-active', isOpen);
    document.body.classList.toggle('menu-open', isOpen);
  });

  closeTargets.forEach((item) => {
    item.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

const quickToggle = document.querySelector('[data-quick-toggle]');
const quickContact = document.querySelector('[data-quick-contact]');

if (quickToggle && quickContact) {
  quickToggle.addEventListener('click', () => {
    const isOpen = quickContact.classList.toggle('is-open');
    quickToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const revealSelector = [
  '.hero-grid > div > *',
  '.hero-photo',
  '.category-grid .category-card',
  '.about-grid > *',
  '.advantages-grid .card',
  '.process-list .process-step',
  '.teaser',
  '.manager-grid .manager-card',
  '.form',
  '.closing-inner > *',
].join(', ');

const revealEls = Array.from(document.querySelectorAll(revealSelector));

if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealEls.forEach((el) => el.classList.add('reveal', 'is-visible'));
} else {
  const groups = new Map();
  revealEls.forEach((el) => {
    el.classList.add('reveal');
    const parent = el.parentElement;
    const index = groups.get(parent) || 0;
    el.style.transitionDelay = `${(index % 6) * 70}ms`;
    groups.set(parent, index + 1);
  });

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  revealEls.forEach((el) => revealObserver.observe(el));
}