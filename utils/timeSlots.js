// utils/timeSlots.js
const timeSlots = [];

// Only 5 AM (5) to 10 PM (22)
for (let h = 5; h <= 22; h++) {
  ['00', '15', '30'].forEach(min => {
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    const label = `${hour}:${min} ${ampm}`;
    const value = `${h.toString().padStart(2,'0')}:${min}:00`;
    timeSlots.push({ label, value });
  });
}

module.exports = timeSlots;
