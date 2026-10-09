# 🌿 EcoSankalan

> A hyperlocal waste management and recycling platform built for the WeMakeDev hackathon.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-green)
![Hackathon](https://img.shields.io/badge/WeMakeDev-Hackathon-blue)

---

## 📋 Project Overview

EcoSankalan is a community-driven mobile + web app that lets urban residents:
- **Log** household waste (manual or AI-powered photo scan via Gemini Vision)
- **Earn** eco-points for waste logging and community event participation
- **Find** nearby recycling bins and community drives on a live map
- **Redeem** eco-points in the Eco-Shop (10 pts = ₹1, max 30% discount)

The project was created during the **WeMakeDev hackathon** to make sustainable waste disposal easier, more rewarding, and more accessible for local communities.

---

## 👥 Team

| Member | Role |
|--------|------|
| Ayush Kumar Jha | Team Lead, backend APIs, database schema |
| Krishna | UI/UX design and prototypes |
| Vipin Gupta | Frontend React development |
| Atishay Jain | Backend infrastructure, MongoDB Atlas, deployment |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Tailwind CSS |
| Mobile | Median.co (Android APK wrapper) |
| Backend | Node.js + Express.js (MVC) |
| Database | MongoDB Atlas (Mongoose ODM) |
| AI | Google Gemini 1.5 Flash (Vision) |
| Maps | OpenStreetMap + Leaflet.js |
| Auth | JWT + bcrypt + OTP (MSG91) |
| Payments | Razorpay |
| Push Notifs | Firebase FCM |
| Hosting | Vercel |

---

## 🚀 Getting Started (Backend)

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free M0 tier)
- Git

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Atishay-j-a-in/Ecosankalan.git

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and fill in your MongoDB URI and JWT secret

# 4. Start development server
npm run dev

# 5. Verify it's working
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "project": "EcoSankalan",
  "server": "running",
  "database": "connected"
}
```

---

## 📁 Project Structure

```
ecosankalan-codebase/
├── src/
│   ├── app.js              # Express app (middleware + routes)
│   ├── server.js           # HTTP server entry point
│   ├── config/
│   │   ├── database.js     # MongoDB Atlas connection
│   │   └── logger.js       # Winston structured logger
│   ├── middleware/
│   │   ├── auth.js         # JWT protect + authorize middleware
│   │   ├── errorHandler.js # Global error + 404 handler
│   │   └── validate.js     # express-validator result checker
│   ├── routes/
│   │   ├── health.js       # GET /health
│   │   ├── auth.js         # /api/v1/auth/*
│   │   ├── users.js        # /api/v1/users/*
│   │   ├── waste.js        # /api/v1/waste/*
│   │   ├── bins.js         # /api/v1/bins/*
│   │   ├── events.js       # /api/v1/events/*
│   │   ├── products.js     # /api/v1/products/*
│   │   └── orders.js       # /api/v1/orders/*
│   ├── controllers/        # Business logic
│   ├── models/             # Mongoose schemas
│   └── utils/              # Shared helpers
├── tests/                  # Jest + Supertest
├── .env.example            # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## 🗺️ API Surface Area

| Method | Route | Status |
|--------|-------|--------|
| GET | `/health` | ✅ Live |
| POST | `/api/v1/auth/register` | 🔧 Stub |
| POST | `/api/v1/auth/verify-otp` | 🔧 Stub |
| POST | `/api/v1/auth/login` | 🔧 Stub |
| GET | `/api/v1/users/profile` | 🔧 Stub |
| POST | `/api/v1/waste/log` | 🔧 Stub |
| GET | `/api/v1/waste/stats` | 🔧 Stub |
| GET | `/api/v1/bins?lat&lng&radius` | 🔧 Stub |
| POST | `/api/v1/events/:id/rsvp` | 🔧 Stub |
| POST | `/api/v1/orders/checkout` | 🔧 Stub |

Full API documentation: [Postman Collection](docs/postman/) _(coming soon)_

---

## 📅 Roadmap

| Phase | Theme | Key Deliverable |
|-------|-------|-----------------|
| 1 | Foundation | Core schema, backend skeleton, and health check |
| 2 | Community | Authentication, waste logging, and eco-points |
| 3 | Discovery | Recycling-bin map and community events |
| 4 | Rewards | Eco-Shop and points redemption |
| 5 | Launch | Android wrapper and production deployment |

---

## 🔐 Responsible Data Use

- Store only the user data required for the app to work.
- Keep authentication tokens limited to the information needed for authorization.
- Use secure environment variables for database credentials, API keys, and other secrets.
- MongoDB Atlas provides encryption in transit and at rest.

---

## 📄 License

MIT © 2026 EcoSankalan Team
