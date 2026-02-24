# Attendance Management System
> Last Deployed: 2026-02-12T13:16:00+05:30 (AMS)

A secure, location-based attendance tracking system with real-time verification and time constraints.

## ✨ Features

- **📍 Geo-Fencing**: Automatic location verification using browser Geolocation API.
- **⏰ Smart Constraints**:
  - **Clock In**: Allowed only between 9:00 AM and 11:00 AM IST.
  - **Clock Out**: Enabled 4 hours after Clock In, strictly after 4:00 PM IST.
- **🛡️ Secure Access**: Token-based admin access and roll-number based user login.
- **📊 Admin Dashboard**: Monitor attendance, manage users, and track location violations.
- **🌍 Timezone Aware**: Fully optimized for India Standard Time (IST).

## 🚀 Getting Started

### Backend
1. `cd server`
2. `npm install`
3. Create `.env` with `MONGODB_URI`
4. `npm run dev`

### Frontend
- Open `index.html` in your browser.
- Ensure the API URL in `js/config.js` matches your server address.

## 🛠️ Tech Stack
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)

---
*Deployment Sync: 2026-02-10 14:30 IST*
