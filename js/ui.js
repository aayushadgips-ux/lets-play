// UI helpers (ES6 module)
export function getFormElements() {
  return {
    form: document.getElementById('bookingForm'),
    name: document.getElementById('name'),
    phone: document.getElementById('phone'),
    email: document.getElementById('email'),
    pickup: document.getElementById('pickup'),
    destination: document.getElementById('destination'),
    date: document.getElementById('date'),
    mapboxToken: document.getElementById('mapboxToken'),
    useMapbox: document.getElementById('useMapbox'),
    driversGrid: document.querySelectorAll('.driver-card'),
    ui: null,
  };
}

export function setupUI(els, onDriverSelected, onSubmit) {
  // create a small UI helper object
  const ui = {
    showErrors: (errors) => {
      Object.keys(errors).forEach(k => {
        const input = document.getElementById(k);
        if (input) {
          input.closest('.input-group').classList.add('error');
          let err = input.closest('.input-group').querySelector('.input-error');
          if (!err) { err = document.createElement('div'); err.className = 'input-error'; input.closest('.input-group').appendChild(err); }
          err.textContent = errors[k];
        }
      });
    },
    clearErrors: () => {
      const groups = document.querySelectorAll('.input-group.error');
      groups.forEach(g => g.classList.remove('error'));
      document.querySelectorAll('.input-error').forEach(e => e.textContent = '');
    },
    showEstimate: (est) => {
      const panel = document.querySelector('.trip-details');
      if (!panel) return;
      panel.style.display = 'block';
      document.getElementById('distance').textContent = `${est.kms} km`;
      document.getElementById('duration').textContent = `${est.durationMins} mins`;
      document.getElementById('price').textContent = `$${est.price}`;
    }
  };

  els.ui = ui;

  // wire drivers
  els.driversGrid.forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('disabled')) return;
      // toggle selection
      els.driversGrid.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const driver = {
        id: card.dataset.id,
        name: card.querySelector('h3').textContent,
        rating: card.querySelector('.rating').textContent,
        experience: card.querySelector('.experience').textContent
      };
      onDriverSelected(driver);
    });
  });

  // persist mapbox token locally
  const tokenInput = document.getElementById('mapboxToken');
  if (tokenInput) {
    const saved = localStorage.getItem('mapboxToken');
    if (saved) tokenInput.value = saved;
    tokenInput.addEventListener('change', () => localStorage.setItem('mapboxToken', tokenInput.value.trim()));
  }

  // submit
  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = {
      name: els.name.value.trim(),
      phone: els.phone.value.trim(),
      email: els.email.value.trim(),
      pickup: els.pickup.value.trim(),
      destination: els.destination.value.trim(),
      date: els.date.value
    };
    onSubmit(formData, els);
  });
}

// helpers to enable/disable drivers
export function setDriverDisabled(id, disabled = true) {
  const card = document.querySelector(`.driver-card[data-id="${id}"]`);
  if (!card) return;
  if (disabled) card.classList.add('disabled'); else card.classList.remove('disabled');
}

export function clearDriverDisabled() {
  document.querySelectorAll('.driver-card.disabled').forEach(c => c.classList.remove('disabled'));
}

export function renderBookingConfirmation(details) {
  const modal = document.getElementById('confirmationModal');
  const bookingSummary = document.querySelector('.booking-summary');
  bookingSummary.innerHTML = `
    <h3>Booking Details:</h3>
    <p><strong>Name:</strong> ${details.name}</p>
    <p><strong>Phone:</strong> ${details.phone}</p>
    <p><strong>Email:</strong> ${details.email}</p>
    <p><strong>Pickup:</strong> ${details.pickup}</p>
    <p><strong>Destination:</strong> ${details.destination}</p>
    <p><strong>Date & Time:</strong> ${details.date}</p>
    <p><strong>Driver:</strong> ${details.driver ? details.driver.name : 'TBD'}</p>
    <p><strong>Estimated Distance:</strong> ${details.estimate ? details.estimate.kms + ' km' : '-'}</p>
    <p><strong>Estimated Duration:</strong> ${details.estimate ? details.estimate.durationMins + ' mins' : '-'}</p>
    <p><strong>Estimated Price:</strong> ${details.estimate ? '$' + details.estimate.price : '-'}</p>
  `;
  modal.style.display = 'block';
}

export function showLoading(on) {
  const btn = document.querySelector('.submit-btn');
  if (on) {
    btn.disabled = true;
    btn.innerHTML = '<span>Booking...</span> <i class="fas fa-spinner fa-spin"></i>';
  } else {
    btn.disabled = false;
    btn.innerHTML = '<span>Book Now</span> <i class="fas fa-arrow-right"></i>';
  }
}

// Lightweight confetti using canvas
export function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.left = 0;
  canvas.style.top = 0;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const pieces = [];
  for (let i=0;i<120;i++) pieces.push({ x: Math.random()*canvas.width, y: -20-Math.random()*200, vx: -2+Math.random()*4, vy: 2+Math.random()*6, size: 6+Math.random()*6, color: `hsl(${Math.random()*360},70%,50%)` });
  let t = 0;
  function frame() {
    t++; ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p=>{
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; ctx.fillStyle = p.color; ctx.fillRect(p.x,p.y,p.size,p.size);
    });
    if (t < 180) requestAnimationFrame(frame); else canvas.remove();
  }
  requestAnimationFrame(frame);
}
