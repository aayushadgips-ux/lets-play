export function validateForm(formData, selectedDriver) {
  const errors = {};
  if (!formData.name) errors.name = 'Name is required';
  if (!formData.phone) errors.phone = 'Phone is required';
  else if (!/^\+?[0-9]{7,15}$/.test(formData.phone.replace(/\s|-/g, ''))) errors.phone = 'Invalid phone';
  if (!formData.email) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email';
  if (!formData.pickup) errors.pickup = 'Pickup is required';
  if (!formData.destination) errors.destination = 'Destination is required';
  if (!formData.date) errors.date = 'Date & time required';
  else {
    const selected = new Date(formData.date);
    const min = new Date(Date.now() + 1000 * 60 * 60);
    if (selected < min) errors.date = 'Choose a time at least 1 hour from now';
  }
  if (!selectedDriver) errors.driver = 'Select a driver';
  return errors;
}
