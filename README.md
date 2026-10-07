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

<<<<<<< HEAD
MIT © 2026 EcoSankalan Team
=======
```bash
cd frontend

npm install

cd ..
```

---

# 🔐 Environment Variables

### Backend (.env)

```env
PORT=5000

NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

OPENAI_API_KEY=your_openai_api_key

CLIENT_URL=http://localhost:5173
```

---

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:5000


```

---

# ▶ Running the Project

## Backend

```bash
npm run dev
```

Runs on

```
http://localhost:5000
```

---

## Frontend

```bash
cd frontend

npm run dev
```

Runs on

```
http://localhost:5173
```

---

# 🚀 Deployment

The project is deployed using **Vercel** and **MongoDB Atlas**.

| Service | Purpose |
|----------|----------|
| Vercel | Frontend Hosting |
| Vercel | Backend Hosting |
| MongoDB Atlas | Cloud Database |
| GitHub | Version Control |

Deployment is fully automated through GitHub integration with Vercel.

---

# 📡 API Overview

The backend exposes RESTful APIs secured using JWT Authentication.

| Module | Description |
|----------|-------------|
| Authentication | Registration, Login, Google OAuth |
| Users | User Profile & Statistics |
| Waste | Waste Logging & History |
| AI | AI Waste Classification |
| Bin Locator | Nearby Recycling Bins |
| Challenges | Weekly Challenges |
| Events | Community Cleanup Drives |
| Rewards | Eco Shop & Voucher Redemption |
| Leaderboard | User Rankings |
| Admin | Platform Management |

---

# 🔐 Authentication Flow

```text
          User
            │
            ▼
     Login / Google OAuth
            │
            ▼
     Credential Validation
            │
            ▼
        JWT Generated
            │
            ▼
     Protected API Access
```

---

# 🤖 AI Waste Classification Workflow

```text
Upload Image

      │

      ▼

Image Validation

      │

      ▼

GPT-4o Vision Analysis

      │

      ▼

Waste Classification

      │

      ▼

Material Detection

      │

      ▼

Confidence Score

      │

      ▼

Disposal Recommendation
```

---

# 📍 Smart Bin Locator

Nearby recycling bins are identified using MongoDB's geospatial indexing.

```text
User Location

      │

      ▼

Latitude & Longitude

      │

      ▼

MongoDB 2dsphere Index

      │

      ▼

$near Query

      │

      ▼

Sorted Nearby Bins
```

---

# 🗄 Database Design

EcoSankalan uses MongoDB Atlas with Mongoose ODM.

### Collections

- Users
- WasteLogs
- Bins
- Events
- Challenges
- ChallengeProgress
- Products
- Vouchers
- Orders

---

## Entity Relationship

```text
User
 │
 ├──────────────┐
 │              │
 ▼              ▼

WasteLogs    Challenges

 │              │

 ▼              ▼

EcoPoints   Badges

      │

      ▼

Voucher Redemption

      │

      ▼

Partner Products
```

---

# 🔒 Security

Security has been implemented at multiple layers.

- JWT Authentication
- Google OAuth Verification
- Password Hashing using bcrypt
- Helmet Security Headers
- CORS Protection
- API Rate Limiting
- Secure Environment Variables
- Input Validation
- Role-Based Access Control
- Protected API Routes

---

# ⚡ Performance Optimizations

To ensure a smooth user experience, several optimizations have been implemented.

- MongoDB 2dsphere Geospatial Indexing
- Cached Dashboard Statistics
- Optimized Database Queries
- Response Compression
- Lazy Loading Components
- Efficient API Design
- Atomic Voucher Redemption
- Optimized Image Upload Flow

---

# 📱 Progressive Web App

EcoSankalan is built as a Progressive Web Application.

### Features

- Installable on Android & iOS
- Responsive Design
- Offline Support
- Home Screen Installation
- Fast Loading
- Native App-like Experience

### Installation

**Android**

Chrome → Menu → Add to Home Screen

**iOS**

Safari → Share → Add to Home Screen

---

# 📊 Project Highlights

| Metric | Value |
|---------|------|
| React Components | 30+ |
| Pages | 20+ |
| REST APIs | 15+ |
| MongoDB Collections | 9+ |
| Authentication Methods | 2 |
| AI Integration | GPT-4o Vision |
| Progressive Web App | ✅ |
| Mobile Responsive | ✅ |

---

# 🌱 Sustainability Impact

EcoSankalan encourages environmentally responsible behavior through technology.

Users can:

- Measure Carbon Reduction
- Track Recycling History
- Participate in Community Events
- Earn EcoPoints
- Redeem Sustainable Rewards

The platform aims to bridge the gap between technology and environmental responsibility by making sustainable actions engaging and rewarding.

---

# 🗺️ Roadmap

EcoSankalan is continuously evolving. The following features are planned for future releases.

### Short Term

- Push Notifications
- AI Disposal Recommendations
- Better Reward Marketplace
- QR Code-based Waste Logging
- Community Event Calendar

### Long Term

- Native Android & iOS Applications
- Smart Bin IoT Integration
- AI Voice Assistant
- NGO Management Portal
- Carbon Credit Marketplace
- Multi-language Support
- Municipal Dashboard
- Analytics using Machine Learning

---

# 🧪 Testing

The project has been tested across major browsers and devices to ensure a smooth user experience.

### Functional Testing

- ✅ User Registration
- ✅ User Login
- ✅ Google OAuth
- ✅ JWT Authentication
- ✅ Waste Logging
- ✅ AI Waste Classification
- ✅ Bin Locator
- ✅ EcoPoints System
- ✅ Rewards Redemption
- ✅ Community Events
- ✅ Admin Dashboard

---

### UI Testing

- ✅ Responsive Layout
- ✅ Mobile Friendly
- ✅ Tablet Support
- ✅ Desktop Support
- ✅ Cross Browser Compatibility

---

### Performance Testing

- ✅ Optimized API Responses
- ✅ Lazy Loading
- ✅ Efficient MongoDB Queries
- ✅ Compressed Assets
- ✅ Fast Initial Load

---

# 🤝 Contributing

Contributions are always welcome!

If you would like to contribute to EcoSankalan:

1. Fork the repository.

2. Create a feature branch.

```bash
git checkout -b feature/amazing-feature
```

3. Commit your changes.

```bash
git commit -m "Add amazing feature"
```

4. Push to your branch.

```bash
git push origin feature/amazing-feature
```

5. Open a Pull Request.

Please ensure your code follows the project's coding standards and includes meaningful commit messages.

---

# 💻 Local Development Guidelines

Before creating a Pull Request:

- Follow consistent coding conventions.
- Write reusable components.
- Keep commits small and descriptive.
- Test your changes locally.
- Never commit API keys or secrets.

---

# 📄 License

This project is distributed under the **MIT License**.

You are free to use, modify, and distribute this software under the terms of the MIT License.

See the `LICENSE` file for more details.

---

# 🙏 Acknowledgements

This project would not have been possible without the amazing open-source ecosystem.

Special thanks to:

- OpenAI
- React
- Node.js
- Express.js
- MongoDB Atlas
- Vercel
- Google OAuth
- Vite
- GitHub

We also acknowledge the guidance and support provided by **Netaji Subhas University of Technology (NSUT)** under the **CPVS-STP 2025–26(E)** program.

---

# 👨‍💻 Team

<table>
<tr>
<td align="center">
<b>Vipin Gupta</b><br>
Full Stack Developer
</td>

<td align="center">
<b>Krishna</b><br>
Frontend Lead
</td>

<td align="center">
<b>Atishay Jain</b><br>
Full Stack Developer
</td>

<td align="center">
<b>Bhagya Ranjan Singh</b><br>
Frontend & Research
</td>

<td align="center">
<b>Ayush Jha</b><br>
Full Stack Developer
</td>
</tr>
</table>


---

# 📬 Contact

For suggestions, collaborations, or feedback:

📧 **Email:** ecosankalan@gmail.com

🌐 **Project:** https://ecosankalan.in
📂 **Repository:**(https://github.com/ecosankalan/ecosankalan-codebase)

---

# ⭐ Show Your Support

If you found this project helpful,

⭐ Star the repository

🍴 Fork it

🛠️ Contribute

📢 Share it with others

Every contribution helps us build a more sustainable future.

---

# 🌱 Why EcoSankalan?

> **"Small actions create a greener tomorrow."**

EcoSankalan demonstrates how modern technologies such as **Artificial Intelligence**, **Geospatial Computing**, **Cloud Infrastructure**, and **Progressive Web Applications** can be combined to solve real-world environmental challenges.

The project is more than a waste management application—it's an initiative to encourage sustainable habits, empower communities, and leverage technology for social impact.

---

<div align="center">

## 🌿 EcoSankalan

### AI-Powered Hyperlocal Waste Management Platform

Built with ❤️ using **React • Node.js • MongoDB • OpenAI • Vercel**

**Made at Netaji Subhas University of Technology (NSUT)**

### ♻️ Reduce • Recycle • Reward • Repeat

⭐ **If you like this project, please give it a Star!**

</div>
>>>>>>> 7e04cc1 (feat: implement OAuth2 token flow for Google sign-in and enhance user feedback)
