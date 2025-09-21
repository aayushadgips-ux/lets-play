import { setupUI, getFormElements, renderBookingConfirmation, showLoading, triggerConfetti, setDriverDisabled, clearDriverDisabled } from './ui.js';
import { validateForm } from './validators.js';
import { estimateTrip, getSurgeMultiplier, haversineDistance as haversineLocal } from './estimator.js';
import { estimateWithMapbox, geocodeText } from './mapboxService.js';

class App {
  constructor() {
    this.state = { selectedDriver: null };
    this.debounceTimer = null;
    this.drivers = [
      { id: '1', name: 'John Doe', lat: 37.7749, lng: -122.4194, availableFromHour: 6, availableToHour: 22 },
      { id: '2', name: 'Mike Smith', lat: 37.7849, lng: -122.4094, availableFromHour: 8, availableToHour: 20 },
      { id: '3', name: 'Sarah Johnson', lat: 37.7649, lng: -122.4294, availableFromHour: 0, availableToHour: 23 }
    ];
    this.els = getFormElements();
  }

  init() {
    setupUI(this.els, this.onDriverSelected.bind(this), this.onSubmit.bind(this));
    this.setMinDate(this.els.date);
    ['pickup', 'destination', 'date'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.updateEstimateDebounced());
    });
    // close modal
    const modal = document.getElementById('confirmationModal');
    if (modal) {
      modal.querySelector('.close-btn').addEventListener('click', () => modal.style.display = 'none');
      modal.querySelector('.ok-btn').addEventListener('click', () => modal.style.display = 'none');
    }
  }

  onDriverSelected(driver) {
    this.state.selectedDriver = driver;
  }

  async onSubmit(formData, els) {
    const errors = validateForm(formData, this.state.selectedDriver);
    if (Object.keys(errors).length) {
      els.ui.showErrors(errors);
      return;
    }

    els.ui.clearErrors();
    showLoading(true);

    const useMapbox = els.useMapbox.checked && els.mapboxToken.value.trim();
    // persist token
    if (els.mapboxToken) localStorage.setItem('mapboxToken', els.mapboxToken.value.trim());

    let estimate = null;
    try {
      if (useMapbox) {
        const mb = await estimateWithMapbox(formData.pickup, formData.destination, els.mapboxToken.value.trim());
        const mult = getSurgeMultiplier(formData.date);
        estimate = { ...mb, price: Math.round(mb.price * mult * 100) / 100 };
      } else {
        estimate = await estimateTrip(formData.pickup, formData.destination, formData.date);
      }
    } catch (err) {
      // fallback
      estimate = await estimateTrip(formData.pickup, formData.destination, formData.date);
    }

    // simulate network delay
    setTimeout(() => {
      showLoading(false);
      renderBookingConfirmation({ ...formData, driver: this.state.selectedDriver, estimate });
      // small celebration
      triggerConfetti();
    }, 600);
  }

  async updateEstimateDebounced() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      const pickup = this.els.pickup.value.trim();
      const destination = this.els.destination.value.trim();
      if (!pickup || !destination) return;
      const useMapbox = this.els.useMapbox.checked && this.els.mapboxToken.value.trim();
      try {
        const est = useMapbox ? await estimateWithMapbox(pickup, destination, this.els.mapboxToken.value.trim()) : await estimateTrip(pickup, destination, this.els.date.value);
        this.els.ui.showEstimate(est);
        this.filterDriversByEstimate(est);
      } catch (err) {
        const est = await estimateTrip(pickup, destination, this.els.date.value);
        this.els.ui.showEstimate(est);
        this.filterDriversByEstimate(est);
      }
    }, 420);
  }

  filterDriversByEstimate(est) {
    clearDriverDisabled();
    // if estimate is very large, disable some drivers
    const threshold = 60; // km
    const selectedHour = this.els.date && this.els.date.value ? new Date(this.els.date.value).getHours() : new Date().getHours();
    this.drivers.forEach(d => {
      const avail = selectedHour >= d.availableFromHour && selectedHour <= d.availableToHour;
      if (!avail || est.kms > threshold) setDriverDisabled(d.id, true);
    });
  }

  setMinDate(dateEl) {
    if (!dateEl) return;
    const min = new Date(Date.now() + 1000 * 60 * 60);
    const tzOffset = min.getTimezoneOffset() * 60000;
    const localISO = new Date(min - tzOffset).toISOString().slice(0,16);
    dateEl.min = localISO;
  }
}

const app = new App();
app.init();
