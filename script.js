document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('bookingForm');
    const driverCards = document.querySelectorAll('.driver-card');
    const modal = document.getElementById('confirmationModal');
    const closeBtn = document.querySelector('.close-btn');
    const okBtn = document.querySelector('.ok-btn');
    const bookingSummary = document.querySelector('.booking-summary');
    const tripDetailsEl = document.querySelector('.trip-details');
    const distanceEl = document.getElementById('distance');
    const durationEl = document.getElementById('duration');
    const priceEl = document.getElementById('price');
    let selectedDriver = null;

    // Mock drivers data with locations (lat, lng) and schedules
    const drivers = [
        { id: '1', name: 'John Doe', lat: 37.7749, lng: -122.4194, rating: 4.9, experience: '5 years', availableFromHour: 6, availableToHour: 22 },
        { id: '2', name: 'Mike Smith', lat: 37.7849, lng: -122.4094, rating: 4.8, experience: '3 years', availableFromHour: 8, availableToHour: 20 },
        { id: '3', name: 'Sarah Johnson', lat: 37.7649, lng: -122.4294, rating: 4.9, experience: '4 years', availableFromHour: 0, availableToHour: 23 }
    ];

    // Driver selection (clicking a card selects if available)
    driverCards.forEach(card => {
        card.addEventListener('click', function() {
            const id = this.dataset.id;
            const driverData = drivers.find(d => d.id === id);
            const bookingTime = getBookingHour();
            if (!isDriverAvailable(driverData, bookingTime)) {
                alert(`${driverData.name} is not available at the selected time.`);
                return;
            }

            driverCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            selectedDriver = {
                id: driverData.id,
                name: driverData.name,
                rating: driverData.rating,
                experience: driverData.experience
            };
        });
    });

    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        // Estimate trip one more time and include in summary
        const pickup = document.getElementById('pickup').value.trim();
        const destination = document.getElementById('destination').value.trim();
        const dateVal = document.getElementById('date').value;

        const estimate = estimateTrip(pickup, destination, dateVal);

        const bookingDetails = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            pickup,
            destination,
            date: formatDateTime(dateVal),
            driver: selectedDriver,
            estimate
        };

        // Simulate saving/loading
        showLoading(true);
        setTimeout(() => {
            showLoading(false);
            displayConfirmation(bookingDetails);
        }, 900);
    });

    // Update estimates live when pickup/destination/date change
    ['pickup', 'destination', 'date'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', updateEstimatesDebounced);
        el.addEventListener('change', updateEstimatesDebounced);
    });

    // Form validation
    function validateForm() {
        const requiredFields = ['name', 'phone', 'email', 'pickup', 'destination', 'date'];
        let isValid = true;

        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (!input.value.trim()) {
                setInputError(input, 'This field is required');
                isValid = false;
            } else {
                clearInputError(input);
            }
        });

        if (!selectedDriver) {
            // highlight driver area
            document.querySelector('.form-group:last-of-type h2').classList.add('driver-warning');
            setTimeout(() => document.querySelector('.form-group:last-of-type h2').classList.remove('driver-warning'), 1200);
            alert('Please select a driver');
            isValid = false;
        }

        // Email validation
        const email = document.getElementById('email');
        if (!isValidEmail(email.value)) {
            setInputError(email, 'Enter a valid email address');
            isValid = false;
        }

        // Phone validation
        const phone = document.getElementById('phone');
        if (!isValidPhone(phone.value)) {
            setInputError(phone, 'Enter a valid phone number');
            isValid = false;
        }

        // Date validation: at least 1 hour in future
        const dateInput = document.getElementById('date');
        if (dateInput.value) {
            const selected = new Date(dateInput.value);
            const minDate = new Date(Date.now() + 1000 * 60 * 60);
            if (selected < minDate) {
                setInputError(dateInput, 'Choose a time at least 1 hour from now');
                isValid = false;
            }
        }

        return isValid;
    }

    // Input error helpers
    function setInputError(input, msg) {
        const group = input.closest('.input-group');
        if (group) group.classList.add('error');
        input.setAttribute('aria-invalid', 'true');
        let err = group.querySelector('.input-error');
        if (!err) {
            err = document.createElement('div');
            err.className = 'input-error';
            group.appendChild(err);
        }
        err.textContent = msg;
    }

    function clearInputError(input) {
        const group = input.closest('.input-group');
        if (group) group.classList.remove('error');
        input.removeAttribute('aria-invalid');
        const err = group.querySelector('.input-error');
        if (err) err.textContent = '';
    }

    // Validation helpers
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        return /^\+?[0-9]{7,15}$/.test(phone.replace(/\s|-/g, ''));
    }

    // Date formatting
    function formatDateTime(dateTimeString) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        };
        return new Date(dateTimeString).toLocaleDateString('en-US', options);
    }

    // Estimate trip (distance/duration/price). Uses simple Haversine formula fallback.
    async function estimateTrip(pickup, destination, dateValue) {
        const useMapbox = document.getElementById('useMapbox') && document.getElementById('useMapbox').checked;
        const token = document.getElementById('mapboxToken') ? document.getElementById('mapboxToken').value.trim() : '';

        if (useMapbox && token) {
            try {
                const mb = await estimateWithMapbox(pickup, destination, token);
                // Update UI
                if (tripDetailsEl) tripDetailsEl.style.display = 'block';
                if (distanceEl) distanceEl.textContent = `${Math.round(mb.kms)} km`;
                if (durationEl) durationEl.textContent = `${Math.round(mb.durationMins)} mins`;
                if (priceEl) priceEl.textContent = `$${mb.price}`;
                return mb;
            } catch (err) {
                console.warn('Mapbox estimate failed, falling back to local estimator', err);
                // continue to fallback
            }
        }

        // Fallback to local estimator
        return estimateTripFallback(pickup, destination, dateValue);
    }

    function estimateTripFallback(pickup, destination, dateValue) {
        // Try to parse coordinates if user typed "lat,lng"; otherwise use fallback mocked distance
        const pickupCoords = parseCoords(pickup);
        const destCoords = parseCoords(destination);

        let kms = 5; // default
        if (pickupCoords && destCoords) {
            kms = haversineDistance(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng);
        } else {
            // Heuristic: length of text difference -> crude proxy
            const len = Math.abs(pickup.length - destination.length) + (pickup.length + destination.length) / 30;
            kms = Math.min(Math.max(Math.round(len * 2), 2), 80);
        }

        const durationMins = Math.max(10, Math.round(kms * 2 + 5));
        const baseRate = 1.2; // per km
        const timeMultiplier = getSurgeMultiplier(dateValue);
        const price = Math.max(3, Math.round(kms * baseRate * timeMultiplier * 100) / 100);

        // Update UI
        if (tripDetailsEl) tripDetailsEl.style.display = 'block';
        if (distanceEl) distanceEl.textContent = `${kms} km`;
        if (durationEl) durationEl.textContent = `${durationMins} mins`;
        if (priceEl) priceEl.textContent = `$${price}`;

        return { kms, durationMins, price };
    }

    // Mapbox estimate: simple geocode+directions (walking/driving profile) — returns {kms, durationMins, price}
    async function estimateWithMapbox(pickup, destination, token) {
        const geocode = async (text) => {
            // If coords look like lat,lng just return it
            const coords = parseCoords(text);
            if (coords) return coords;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${token}&limit=1`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Geocode failed');
            const data = await res.json();
            const f = data.features && data.features[0];
            if (!f) throw new Error('No geocode result');
            return { lat: f.center[1], lng: f.center[0] };
        };

        const p1 = await geocode(pickup);
        const p2 = await geocode(destination);

        // directions
        const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${p1.lng},${p1.lat};${p2.lng},${p2.lat}?access_token=${token}&overview=full&geometries=geojson`;
        const dr = await fetch(directionsUrl);
        if (!dr.ok) throw new Error('Directions failed');
        const drj = await dr.json();
        const route = drj.routes && drj.routes[0];
        if (!route) throw new Error('No route');

        const meters = route.distance || 0;
        const seconds = route.duration || 0;
        const kms = Math.max(1, Math.round(meters / 1000));
        const durationMins = Math.max(5, Math.round(seconds / 60));
        const baseRate = 1.2;
        const timeMultiplier = getSurgeMultiplier(new Date().toISOString());
        const price = Math.max(3, Math.round(kms * baseRate * timeMultiplier * 100) / 100);

        return { kms, durationMins, price };
    }

    function parseCoords(text) {
        const m = text.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
        return null;
    }

    function haversineDistance(lat1, lon1, lat2, lon2) {
        // returns kms rounded
        function toRad(x){return x*Math.PI/180;}
        const R = 6371; // km
        const dLat = toRad(lat2-lat1);
        const dLon = toRad(lon2-lon1);
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
        const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.max(1, Math.round(R * c));
    }

    function getSurgeMultiplier(dateValue) {
        if (!dateValue) return 1;
        const hr = new Date(dateValue).getHours();
        // Simple surge: morning/evening peak
        if (hr >= 7 && hr <= 9) return 1.4;
        if (hr >= 17 && hr <= 20) return 1.5;
        if (hr >= 0 && hr <= 4) return 1.2; // late night
        return 1;
    }

    // Debounce updates
    let updateTimer = null;
    function updateEstimatesDebounced() {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
            const pickup = document.getElementById('pickup').value.trim();
            const destination = document.getElementById('destination').value.trim();
            const dateVal = document.getElementById('date').value;
            if (pickup && destination) estimateTrip(pickup, destination, dateVal);
        }, 500);
    }

    function showLoading(on) {
        const btn = document.querySelector('.submit-btn');
        if (on) {
            btn.disabled = true;
            btn.innerHTML = '<span>Booking...</span> <i class="fas fa-spinner fa-spin"></i>';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<span>Book Now</span> <i class="fas fa-arrow-right"></i>';
        }
    }

    function getBookingHour() {
        const v = document.getElementById('date').value;
        if (!v) return new Date().getHours();
        return new Date(v).getHours();
    }

    function isDriverAvailable(driver, hour) {
        if (!driver) return false;
        return hour >= driver.availableFromHour && hour <= driver.availableToHour;
    }

    // Display confirmation modal
    function displayConfirmation(details) {
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

    // Modal controls
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    okBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
        driverCards.forEach(card => card.classList.remove('selected'));
        selectedDriver = null;
        if (tripDetailsEl) tripDetailsEl.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Real-time validation
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            clearInputError(this);
        });
    });
});