/**
 * АРФА БРАГИ — Скандинавская крафтовая пивоварня & Раки
 * Interactive Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initAgeGate();
  initWorkingHours();
  initEmbers();
  initNavbar();
  initBeerAssortment();
  initCrayfishCalc();
  initOrderSystem();
});

/* ==========================================================================
   1. Age Verification Gate (18+)
   ========================================================================== */
function initAgeGate() {
  const modal = document.getElementById('ageModal');
  const btnAccept = document.getElementById('btnAgeAccept');
  const btnReject = document.getElementById('btnAgeReject');

  if (!modal || !btnAccept || !btnReject) return;

  const isVerified = localStorage.getItem('arfa_bragi_age_verified');
  if (!isVerified) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } else {
    modal.classList.add('hidden');
  }

  btnAccept.addEventListener('click', () => {
    localStorage.setItem('arfa_bragi_age_verified', 'true');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  });

  btnReject.addEventListener('click', () => {
    alert('Доступ разрешён только воинам, достигшим возраста совершеннолетия (18+). Славных тебе походов!');
    window.location.href = 'https://yandex.ru';
  });
}

/* ==========================================================================
   2. Real-Time Working Hours (11:00 - 20:00)
   ========================================================================== */
function initWorkingHours() {
  const badge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  if (!badge || !statusText) return;

  function update() {
    const now = new Date();
    const hours = now.getHours();

    // Work hours: 11:00 to 20:00
    const isOpen = hours >= 11 && hours < 20;

    if (isOpen) {
      badge.classList.remove('closed');
      statusText.textContent = 'Открыто до 20:00';
    } else {
      badge.classList.add('closed');
      statusText.textContent = 'Откроемся в 11:00';
    }
  }

  update();
  setInterval(update, 60000);
}

/* ==========================================================================
   3. Subtle Nordic Ambient Embers Animation
   ========================================================================== */
function initEmbers() {
  const canvas = document.getElementById('canvas-embers');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particlesCount = Math.min(35, Math.floor(width / 30));
  const particles = [];

  for (let i = 0; i < particlesCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.8,
      speedY: Math.random() * 0.8 + 0.25,
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.6 + 0.2,
      fadeSpeed: Math.random() * 0.008 + 0.002,
      color: Math.random() > 0.4 ? '229, 169, 60' : '192, 57, 43'
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.y -= p.speedY;
      p.x += p.speedX;
      p.opacity -= p.fadeSpeed;

      if (p.opacity <= 0 || p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
        p.opacity = Math.random() * 0.6 + 0.3;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${p.color}, 0.8)`;
      ctx.fill();
    });

    requestAnimationFrame(render);
  }

  render();
}

/* ==========================================================================
   4. Navbar Scroll & Mobile Menu
   ========================================================================== */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const burgerBtn = document.getElementById('burgerBtn');
  const navLinks = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  if (burgerBtn && navLinks) {
    burgerBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }
}

/* ==========================================================================
   5. Beer Cart & Order State
   ========================================================================== */
const cart = {
  beers: {
    'Солнце домов': { price: 145, qty: 0, type: 'Классическое (л)' },
    'Берег мечей': { price: 155, qty: 0, type: 'Пшеничное (л)' },
    'Волшебный трут': { price: 167, qty: 0, type: 'Карамельное (л)' }
  },
  crayfish: {
    added: false,
    type: 'Варёные',
    caliber: 'Крупный',
    weight: 2,
    pricePerKg: 2100
  }
};

function initBeerAssortment() {
  document.querySelectorAll('.beer-card').forEach((card) => {
    const beerName = card.dataset.name;
    const btnMinus = card.querySelector('.qty-minus');
    const btnPlus = card.querySelector('.qty-plus');
    const valDisplay = card.querySelector('.qty-val');
    const btnAdd = card.querySelector('.btn-add-beer');

    if (!btnMinus || !btnPlus || !valDisplay || !beerName) return;

    let localQty = 1;

    btnMinus.addEventListener('click', () => {
      if (localQty > 1) {
        localQty--;
        valDisplay.textContent = localQty;
      }
    });

    btnPlus.addEventListener('click', () => {
      localQty++;
      valDisplay.textContent = localQty;
    });

    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        cart.beers[beerName].qty += localQty;
        updateCartBadge();
        showNotification(`Добавлено: ${beerName} (${localQty} л)`);
      });
    }
  });
}

/* ==========================================================================
   6. Crayfish Interactive Calculator
   ========================================================================== */
function initCrayfishCalc() {
  const typeBtns = document.querySelectorAll('.calc-type-btn');
  const caliberBtns = document.querySelectorAll('.caliber-btn');
  const weightSlider = document.getElementById('crayfishWeightSlider');
  const weightDisplay = document.getElementById('crayfishWeightDisplay');
  const totalPriceDisplay = document.getElementById('crayfishTotalPrice');
  const btnOrderCrayfish = document.getElementById('btnOrderCrayfish');

  if (!weightSlider || !weightDisplay || !totalPriceDisplay) return;

  let currentType = 'Варёные';
  let currentCaliber = 'Крупный';
  let pricePerKg = 2100;

  const caliberPrices = {
    'Средний': 1500,
    'Крупный': 2100,
    'Отборный': 2800
  };

  typeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      typeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      recalc();
    });
  });

  caliberBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      caliberBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentCaliber = btn.dataset.caliber;
      pricePerKg = caliberPrices[currentCaliber] || 2100;
      recalc();
    });
  });

  weightSlider.addEventListener('input', () => {
    weightDisplay.textContent = `${weightSlider.value} кг`;
    recalc();
  });

  function recalc() {
    const weight = parseFloat(weightSlider.value);
    const cookFee = currentType === 'Варёные' ? 100 : 0; // +100 руб/кг за фирменную варку со специями
    const total = Math.round(weight * (pricePerKg + cookFee));
    totalPriceDisplay.textContent = `${total.toLocaleString('ru-RU')} ₽`;

    cart.crayfish = {
      added: true,
      type: currentType,
      caliber: currentCaliber,
      weight: weight,
      total: total
    };
  }

  recalc();

  if (btnOrderCrayfish) {
    btnOrderCrayfish.addEventListener('click', () => {
      cart.crayfish.added = true;
      updateCartBadge();
      openOrderModal();
    });
  }
}

/* ==========================================================================
   7. Cart Drawer & Order System
   ========================================================================== */
function initOrderSystem() {
  const floatingBtn = document.getElementById('cartFloatingBtn');
  const modal = document.getElementById('orderModal');
  const closeModalBtn = document.getElementById('closeOrderModal');
  const btnWhatsApp = document.getElementById('orderWhatsAppBtn');
  const btnCall = document.getElementById('orderCallBtn');

  if (floatingBtn) {
    floatingBtn.addEventListener('click', openOrderModal);
  }

  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  if (btnWhatsApp) {
    btnWhatsApp.addEventListener('click', () => {
      const text = generateOrderText();
      const phone = '79024069009';
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  }

  if (btnCall) {
    btnCall.addEventListener('click', () => {
      window.location.href = 'tel:+79024069009';
    });
  }
}

function updateCartBadge() {
  const floatingBtn = document.getElementById('cartFloatingBtn');
  const counter = document.getElementById('cartCounter');
  if (!floatingBtn || !counter) return;

  let totalItems = 0;
  for (let k in cart.beers) {
    totalItems += cart.beers[k].qty;
  }
  if (cart.crayfish.added) {
    totalItems += 1;
  }

  counter.textContent = totalItems;
  if (totalItems > 0) {
    floatingBtn.classList.add('visible');
  } else {
    floatingBtn.classList.remove('visible');
  }
}

function openOrderModal() {
  const modal = document.getElementById('orderModal');
  const listContainer = document.getElementById('orderSummaryList');
  const finalPriceElem = document.getElementById('orderFinalPrice');
  if (!modal || !listContainer || !finalPriceElem) return;

  listContainer.innerHTML = '';
  let grandTotal = 0;
  let hasItems = false;

  // Beers
  for (const [name, item] of Object.entries(cart.beers)) {
    if (item.qty > 0) {
      hasItems = true;
      const cost = item.qty * item.price;
      grandTotal += cost;
      const row = document.createElement('div');
      row.className = 'order-summary-item';
      row.innerHTML = `
        <div>
          <strong>${name}</strong> (${item.type})<br>
          <span style="color: var(--steel-muted); font-size: 0.8rem;">${item.qty} л × ${item.price} ₽</span>
        </div>
        <div style="font-weight: 700; color: var(--gold-bright);">${cost} ₽</div>
      `;
      listContainer.appendChild(row);
    }
  }

  // Crayfish
  if (cart.crayfish.added) {
    hasItems = true;
    grandTotal += cart.crayfish.total;
    const row = document.createElement('div');
    row.className = 'order-summary-item';
    row.innerHTML = `
      <div>
        <strong>Раки: ${cart.crayfish.type}</strong> (${cart.crayfish.caliber})<br>
        <span style="color: var(--steel-muted); font-size: 0.8rem;">${cart.crayfish.weight} кг</span>
      </div>
      <div style="font-weight: 700; color: var(--gold-bright);">${cart.crayfish.total.toLocaleString('ru-RU')} ₽</div>
    `;
    listContainer.appendChild(row);
  }

  if (!hasItems) {
    listContainer.innerHTML = `
      <div style="text-align: center; color: var(--steel-muted); padding: 16px;">
        Ваш рог пуст. Выберите пиво или раков для предзаказа!
      </div>
    `;
  }

  finalPriceElem.textContent = `${grandTotal.toLocaleString('ru-RU')} ₽`;
  modal.classList.add('active');
}

function generateOrderText() {
  let text = 'Здравствуйте! Хочу сделать предзаказ в «АРФА БРАГИ» (Майкоп, Победа, 171):\n\n';
  let total = 0;

  for (const [name, item] of Object.entries(cart.beers)) {
    if (item.qty > 0) {
      const cost = item.qty * item.price;
      total += cost;
      text += `🍺 ${name} — ${item.qty} л (${cost} ₽)\n`;
    }
  }

  if (cart.crayfish.added) {
    total += cart.crayfish.total;
    text += `🦞 Раки: ${cart.crayfish.type} (${cart.crayfish.caliber}) — ${cart.crayfish.weight} кг (${cart.crayfish.total} ₽)\n`;
  }

  text += `\nИтого: ${total} ₽\nУточните, пожалуйста, через сколько можно забрать?`;
  return text;
}

function showNotification(msg) {
  let notif = document.getElementById('toastNotification');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'toastNotification';
    notif.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 28px;
      background: var(--bg-surface-elevated);
      color: #fff;
      border: 1px solid var(--gold-primary);
      box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px var(--gold-glow);
      padding: 12px 20px;
      border-radius: 8px;
      font-family: var(--font-heading);
      font-size: 0.85rem;
      font-weight: 700;
      z-index: 10000;
      transition: all 0.3s ease;
      transform: translateY(20px);
      opacity: 0;
    `;
    document.body.appendChild(notif);
  }

  notif.textContent = msg;
  notif.style.transform = 'translateY(0)';
  notif.style.opacity = '1';

  setTimeout(() => {
    notif.style.transform = 'translateY(20px)';
    notif.style.opacity = '0';
  }, 2400);
}
