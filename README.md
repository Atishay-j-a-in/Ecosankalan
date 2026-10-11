# EcoSankalan

> An AI-assisted, hyperlocal waste-management platform that helps people log waste, discover nearby collection points, participate in community activities, and earn eco-points.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js: 18+](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org/)
[![Frontend: React + Vite](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-646CFF.svg)](https://vitejs.dev/)
[![Database: MongoDB](https://img.shields.io/badge/Database-MongoDB%20%2B%20Mongoose-47A248.svg)](https://www.mongodb.com/)

## Overview

EcoSankalan combines a React single-page application with an Express/MongoDB API. The product is designed around a simple loop:

1. A resident records a waste item manually or uploads an image for AI classification.
2. The API stores the waste log and calculates eco-points and estimated CO₂ savings.
3. The resident tracks impact, discovers nearby bins and events, and completes challenges.
4. Eco-points can be used to unlock available partner vouchers.

The repository also contains administration routes for bins, events, vouchers, and platform statistics.

## Features

### User-facing features

- Email/password and OTP authentication through Appwrite.
- Google sign-in through Appwrite OAuth.
- Appwrite JWT-based protected API access.
- Waste logging by category, quantity, unit, description, and logging method.
- Waste history with pagination and category filtering.
- Waste statistics for week, month, or all-time ranges.
- AI waste-image analysis using OpenAI vision models.
- Nearby recycling-bin discovery using geospatial MongoDB queries.
- Map-marker browsing with viewport and category filters.
- Community event listing, upcoming-event discovery, and RSVP.
- Weekly challenges with per-task progress and reward issuance.
- Eco-points and CO₂-saved tracking.
- Partner-product browsing and redirect links.
- Voucher inventory, user voucher history, and point-based voucher unlocking.
- Profile retrieval, profile updates, points, badges, and avatar upload endpoints.
- Admin statistics and management endpoints for vouchers, bins, and events.
- Guest judge access with a controlled demo admin account.

### Frontend surfaces

The React application includes route-level screens for authentication, dashboard, waste logging, impact, shop and product details, community, profile, learning and quiz flows, AI scan results, waste history, challenges, events, vouchers, and administration.

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ React + Vite SPA                                             │
│ frontend/src                                                  │
│                                                              │
│ Pages → shared components → services/api.js                  │
│   │              │                    │                       │
│   └── Router     └── Auth/UI state    └── HTTP requests       │
└──────────────────────────────┬───────────────────────────────┘
                               │ REST / JSON
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ Express API                                                   │
│ src/app.js                                                    │
│                                                              │
│ Helmet → CORS → parsers → compression → logging              │
│       → rate limiting → versioned routes                      │
│       → 404 handler → error handler                           │
└───────────────┬───────────────────────┬──────────────────────┘
                │                       │
                ▼                       ▼
       Appwrite JWT/RBAC middleware  Controllers/services
                │                       │
                └───────────────┬───────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│ MongoDB Atlas via Mongoose                                    │
│ Users, waste logs, bins, events, challenges, progress,        │
│ products, vouchers, orders, and partner products              │
└──────────────────────────────────────────────────────────────┘

External integrations:
  Appwrite Auth · OpenAI vision · Cloudinary · OpenStreetMap/Overpass
```

### Request flow

```text
Browser
  │
  ├─ public auth request ───────────────► /api/v1/auth/*
  │
  └─ authenticated request
       │
       ▼
    global rate limiter
       │
       ▼
    protect middleware ──► authorize(role...) where required
       │
       ▼
    route handler
       │
       ├─ Mongoose model queries
       ├─ rewardEngine for challenge rewards
       └─ OpenAI/Cloudinary integration for media workflows
       │
       ▼
    JSON response
```

### Backend responsibilities

- `src/server.js` loads environment variables, connects to MongoDB, starts the HTTP listener, and handles graceful shutdown.
- `src/app.js` creates the testable Express application and wires middleware and routes.
- `src/routes/` defines the HTTP API surface.
- `src/middleware/` provides JWT/RBAC, upload, validation, and error handling.
- `src/controllers/` contains larger request workflows such as AI scanning and profile management.
- `src/services/` contains cross-route business logic such as challenge rewards.
- `src/models/` defines MongoDB collections and indexes.
- `src/config/` owns database, logging, AI, Cloudinary, and prompt/schema configuration.
- `src/utils/` contains response, async, and AI-input helpers.

### Data relationships

```text
User
 ├── WasteLog[] ──► points and CO₂ statistics
 ├── ChallengeProgress[] ──► Challenge
 ├── Voucher[] assigned to the user
 ├── Event[] RSVP membership
 └── Order[] ──► cart and checkout workflows

PartnerProduct[] ──► product catalogue and external redirect
Bin[] ─────────────► geospatial nearby-bin queries
```

## Repository structure

```text
ecosankalan-codebase/
├── frontend/
│   ├── public/                 Static assets and service-worker file
│   ├── src/
│   │   ├── components/         Auth, navigation, map, and shared UI
│   │   ├── context/            Notification and application state
│   │   ├── hooks/              Reusable React hooks
│   │   ├── lib/                Geocoding, Overpass, parsing, and location helpers
│   │   ├── pages/              Route-level React screens
│   │   ├── services/api.js     Axios API client
│   │   └── styles/             Page and global styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js                  Express application factory
│   ├── seedProducts.js         Product seeding script
│   └── server.js               Production/development entry point
├── tests/                      Jest + Supertest backend tests
├── .env.example                Backend environment template
├── MOBILE_TESTING.md           Mobile testing notes
├── package.json                Backend manifest
└── README.md
```

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router, Vite, Axios |
| Styling | CSS files under `frontend/src/styles` |
| Backend | Node.js 18+, Express 4 |
| Database | MongoDB with Mongoose 8 |
| Authentication | Appwrite Auth, Appwrite JWT verification, legacy bcryptjs compatibility |
| AI | OpenAI vision API with structured JSON output |
| Maps | Leaflet, OpenStreetMap/Overpass helpers |
| Media | Multer uploads and optional Cloudinary storage |
| API hardening | Helmet, CORS, compression, Morgan, express-rate-limit |
| Testing | Jest and Supertest |
| Deployment | GitHub Actions → EC2 over SSH → PM2 |

## API surface

All versioned routes are mounted below `/api/v1`. Routes marked **stub** currently return `501 Not Implemented`.

| Area | Endpoints | Status |
|---|---|---|
| Health | `GET /health`, `GET /` | Implemented |
| Auth | `POST /auth/sync`, `GET /auth/me` (Appwrite JWT verified server-side) | Implemented |
| Users | `GET/PUT /users/profile`, `PUT /users/profile/avatar` | Implemented |
| Users | `GET /users/points`, `/badges` | Implemented |
| Waste | `POST /waste/log`, `GET /waste/history`, `GET /waste/stats` | Implemented |
| Waste/AI | `POST /waste/scan`, `POST /ai/analyze` | Implemented; multipart key is `images` |
| Bins | `GET /bins`, admin create/update/delete | Implemented |
| Events | list, upcoming, create, RSVP, update, delete | Implemented |
| Challenges | active, progress, history | Implemented |
| Challenges (admin) | `GET /challenges/admin`, `POST /challenges`, `PUT /challenges/:id`, `DELETE /challenges/:id` (deactivate) | Implemented |
| Products | list, detail, redirect, admin/seller mutations | Implemented |
| Vouchers | `GET /vouchers/my`, `POST /vouchers/unlock` | Implemented |
| Admin | voucher creation/stats and platform stats | Implemented |
| Orders | cart, checkout, history, detail | Stub |

Protected routes require an Appwrite JWT (frontend creates one per request via `account.createJWT()`):

```http
Authorization: Bearer <appwrite-jwt>
```

## Guest judge login

Judges can explore everything (including admin screens) without signing up via the **Continue as Guest** button on the login page. It signs in with a shared demo account that the backend promotes to admin on `/auth/sync` (see `ADMIN_EMAILS`).

One-time setup:

1. Appwrite console → Auth → Create user: email `guest@ecosankalan.app`, name `Guest Judge`, password = `VITE_GUEST_PASSWORD` from `frontend/.env`. Mark the email verified.
2. Backend `.env`: ensure `ADMIN_EMAILS` includes `guest@ecosankalan.app` (restart the API).
3. Frontend `.env`: ensure `VITE_GUEST_EMAIL` / `VITE_GUEST_PASSWORD` match step 1 (rebuild).

Treat the guest password as public — anyone with the bundle can read it. Rotate it after judging, and note the guest admin can create events, approve bins, and import vouchers.

## Local setup

### Prerequisites

- Node.js 18 or newer.
- npm.
- A MongoDB database (MongoDB Atlas is supported).
- Provider credentials for the integrations you intend to use.

### Backend

```bash
npm install
copy .env.example .env
npm run dev
```

The API defaults to `http://localhost:5000`.

Useful commands:

```bash
npm start                 # Start the API
npm run dev               # Start with nodemon
npm test -- --runInBand   # Run backend tests
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`.

Create `frontend/.env.local` with the API origin:

```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
```

## Environment variables

The backend reads the following values. Optional integrations can remain empty until their features are enabled.

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://...
APPWRITE_ENDPOINT=https://<REGION>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-appwrite-project-id
APPWRITE_API_KEY=your-server-api-key
ADMIN_EMAILS=teammate1@nsut.ac.in,teammate2@nsut.ac.in
OPENAI_API_KEY=your_openai_api_key
OPENAI_VISION_MODEL=gpt-4o-mini
MAX_AI_FILES=5
MAX_AI_FILE_SIZE=10485760
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_AVATAR_FOLDER=ecosankalan/avatars
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
ALLOWED_ORIGINS=http://localhost:5173
ALLOWED_REDIRECT_DOMAINS=
```

Never commit `.env`, API keys, database credentials, or provider secrets.

## Production deployment

The backend is deployed to an EC2 instance through
[`.github/workflows/backend.yml`](.github/workflows/backend.yml). A push to
`main` that changes the backend triggers the workflow, which:

1. Connects to EC2 over SSH.
2. Fetches and checks out the latest `origin/main`.
3. Installs production dependencies with `npm ci --omit=dev`.
4. Starts or reloads the `ecosankalan-backend` PM2 process.
5. Saves the PM2 process list.

Configure these GitHub Actions repository secrets:

| Secret | Description |
|---|---|
| `EC2_HOST` | EC2 public IP address or DNS name |
| `EC2_USERNAME` | SSH user, such as `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key used to access the instance |
| `EC2_APP_PATH` | Absolute path to the cloned repository on EC2, such as `/home/ubuntu/Ecosankalan` |

Before the first deployment, clone the repository into `EC2_APP_PATH`, install
Node.js and npm, and create the production `.env` file on EC2. The `.env` file
is intentionally not stored in Git and is preserved by the deployment reset.
PM2 keeps the backend running after an SSH session closes and restarts it when
the process crashes. The EC2 instance itself must remain running; stopping the
instance stops the application.

To restore PM2 processes automatically after an EC2 reboot, run once on the
instance as the deployment user:

```bash
pm2 startup
pm2 save
```

## Testing and verification

Backend tests are in `tests/` and cover health, authentication, bins, challenges, events, models, products, rewards, vouchers, waste, and waste statistics.

The recommended verification sequence is:

```bash
npm install
npm test -- --runInBand
cd frontend
npm install
npm run build
```

## Security model

- Auth lives in Appwrite (email/password + Google OAuth); the backend verifies Appwrite JWTs per request via `node-appwrite` and links/creates the MongoDB user by `appwriteUserId` (email fallback for legacy accounts).
- Legacy local passwords (bcryptjs) are retained read-only for old rows; new users have no local password.
- `protect` verifies the Appwrite JWT and attaches `{ userId, email, role, appwriteUserId }`; `authorize` enforces role-based access.
- Helmet adds security headers.
- CORS is configurable through `ALLOWED_ORIGINS`.
- API requests are rate-limited under `/api` (60/min default).
- Multer limits AI upload count and file size.
- Secrets are supplied through environment variables.

## License

EcoSankalan is distributed under the [MIT License](LICENSE).

## Team

| Member | Role |
|---|---|
| Ayush Kumar Jha | Team Lead, backend APIs, and database schema |
| Krishna | UI/UX design and prototypes |
| Vipin Gupta | Frontend React development |
| Atishay Jain | Backend infrastructure, MongoDB Atlas, and deployment |

- Website: `https://your-project-website.example`

> Reduce • Recycle • Reward • Repeat
