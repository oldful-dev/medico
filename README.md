# 🏥 Medico – Healthcare Platform

> A comprehensive eldercare and healthcare management platform built as a MERN-stack monorepo.

---

## 📋 Overview

**Medico** is a full-stack healthcare platform designed to streamline eldercare services — including doctor home visits, nurse care, medical transportation, insurance facilitation, and emergency SOS. The platform consists of three pillars:

| Layer | Path | Tech |
|-------|------|------|
| **Backend API** | `backend/` | Node.js · Express · Prisma · PostgreSQL (Supabase) |
| **Admin Panel** | `admin/` | Next.js 15 · React 19 · Recharts |
| **Mobile App** | `mobile/` | React Native 0.81 · Expo 54 · Expo Router |

---

## ✨ Key Features

- 🩺 **Doctor Home Visits** – Book on-demand or scheduled doctor visits
- 🏠 **Nurse & Caregiver Services** – Hire verified nurses and caregivers
- 🚑 **Medical Transportation** – Non-emergency ambulance & cab booking
- 🛡️ **Insurance Facilitation** – Policy comparison and enrollment
- 🆘 **SOS Emergency System** – One-tap emergency alerts with GPS
- 💊 **Wellness Store** – Medical supplies and health products
- 📊 **Admin Dashboard** – Complete management & analytics panel
- 💳 **Payment Integration** – Razorpay with invoicing and GST
- 🔔 **Smart Notifications** – Push (Firebase), Email (ZeptoMail), SMS/WhatsApp (Fast2SMS)

---

## 🏗️ Project Structure

```
medico/
├── backend/          # REST API server
│   ├── prisma/       #   Database schema & migrations
│   └── src/          #   Controllers, routes, services, utils
├── admin/            # Admin dashboard (Next.js)
│   ├── public/       #   Static assets
│   └── src/          #   Pages, components, styles
├── mobile/           # Mobile app (React Native + Expo)
│   ├── app/          #   Screens (file-based routing)
│   ├── components/   #   Reusable UI components
│   ├── context/      #   React contexts
│   ├── hooks/        #   Custom hooks
│   ├── services/     #   API service layer
│   ├── types/        #   TypeScript types
│   └── utils/        #   Utility functions
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **yarn**
- **PostgreSQL** database (or a [Supabase](https://supabase.com) project)
- **Expo CLI** (for mobile development)

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/medico.git
cd medico
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env        # Fill in your credentials
npx prisma generate
npx prisma migrate dev
npm run dev                  # Starts on http://localhost:5000
```

### 3. Admin Panel Setup

```bash
cd admin
npm install
npm run dev                  # Starts on http://localhost:3000
```

### 4. Mobile App Setup

```bash
cd mobile
npm install
npx expo start               # Scan QR with Expo Go
```

---

## ⚙️ Environment Variables

The backend requires a `.env` file. See [`backend/.env.example`](backend/.env.example) for the full list of required variables, including:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment gateway keys |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 storage credentials |
| `ZEPTOMAIL_API_KEY` | Transactional email delivery |
| `FAST2SMS_API_KEY` | SMS & WhatsApp messaging |

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js |
| **API Framework** | Express.js |
| **ORM** | Prisma |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | JWT (access + refresh tokens) |
| **Payments** | Razorpay |
| **File Storage** | Cloudflare R2 (primary), GCS (fallback) |
| **Email** | ZeptoMail |
| **WhatsApp/SMS** | Fast2SMS |
| **Admin Frontend** | Next.js 15, React 19, Recharts |
| **Mobile** | React Native 0.81, Expo 54, Expo Router |
| **Security** | Helmet, CORS, Rate Limiting, bcrypt |

---

## 📜 Scripts Reference

### Backend (`backend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot-reload (nodemon) |
| `npm start` | Start production server |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |
| `npm run prisma:seed` | Seed the database |

### Admin (`admin/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm start` | Start production server |

### Mobile (`mobile/`)

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Start on Android |
| `npm run ios` | Start on iOS |
| `npm run web` | Start on web |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Made with ❤️ by the <strong>Oldful</strong> team
</p>
