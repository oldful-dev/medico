<p align="center">
  <img src="./assets/images/icon.png" alt="Oldful Logo" width="120" />
</p>

<h1 align="center">Oldful — Elder Care, Simplified</h1>

<p align="center">
  A cross-platform mobile application providing on-demand home healthcare, transportation, and insurance services tailored for senior citizens.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react&logoColor=white" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Platform-Android_|_iOS-green" alt="Platform" />
  <img src="https://img.shields.io/badge/Version-1.0.0-blue" alt="Version" />
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [App Screens & Navigation](#app-screens--navigation)
- [Core Modules](#core-modules)
- [Services Architecture](#services-architecture)
- [State Management](#state-management)
- [Type System](#type-system)
- [Utilities](#utilities)
- [Constants & Configuration](#constants--configuration)
- [Assets](#assets)
- [Available Scripts](#available-scripts)
- [Development Guidelines](#development-guidelines)
- [Business Logic & Policies](#business-logic--policies)
- [Roadmap](#roadmap)

---

## Overview

**Oldful** is an elder care management platform that connects senior citizens with home healthcare professionals, transportation services, and insurance plans — all from a single mobile app. Currently launching in **Bangalore**, with planned expansion to **Chennai** and **Hyderabad**.

> **Note:** Oldful acts as a care management company, not a medical facility. It uses both internal staff and independent third-party vendors (physiotherapists, labs, etc.).

---

## Key Features

| Feature | Description |
|---|---|
| 🆘 **Safety SOS** | Emergency button with 3-second countdown / slide-to-call to prevent accidental triggers. Shares GPS location via WhatsApp/SMS and calls emergency hotline. |
| 🏥 **Doctor Home Visit** | Book General Physicians (MBBS) or Physiotherapists for non-emergency visits. Smart symptom-to-doctor routing. |
| 👩‍⚕️ **Home Nurse & Caretaker** | Hire Qualified Nurses (medical procedures) or Bedside Attendants (daily living). Supports short visits, 12h, and 24h shifts. |
| 🚗 **Transportation** | Request assisted trips for seniors with specialized vehicle support. |
| 🛡️ **Insurance** | Senior-focused insurance plans with pre-existing condition tracking (Diabetes, BP, Heart) and premium calculation. |
| 📋 **Service Plans** | Subscription plans for recurring doctor visits, nurse care, and combo packages. |
| 💚 **Wellness** | Health tips, wellness advice, and activity tracking for elders. |
| 🛒 **Cart & Payments** | Service cart with coupon support, multiple payment methods, and comprehensive refund policy. |
| 🔔 **Notifications** | Push notifications for booking updates, SOS alerts, and "Coming Soon" city alerts. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.81.5 |
| **Platform** | Expo SDK 54 (Managed Workflow) |
| **Language** | TypeScript 5.9 |
| **Routing** | Expo Router 6 (File-based) |
| **Navigation** | React Navigation 7 (Bottom Tabs + Stack) |
| **Animations** | React Native Reanimated 4 |
| **Gestures** | React Native Gesture Handler 2 |
| **Icons** | @expo/vector-icons (Ionicons) |
| **State** | React Context API |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Android Studio](https://developer.android.com/studio) (for Android emulator) or [Xcode](https://developer.apple.com/xcode/) (for iOS simulator)
- [Expo Go](https://expo.dev/go) app on your physical device (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medico
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the project root:
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on a device/emulator**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Scan QR code with Expo Go for physical device

---

## Project Structure

```
medico/
│
├── app/                                 # 📱 Screens & Routing (Expo Router)
│   ├── _layout.tsx                      #    Root layout — Context Providers + Stack Navigator
│   ├── modal.tsx                        #    Generic modal screen
│   ├── sos-emergency.tsx                #    🆘 SOS Emergency (fullscreen modal)
│   ├── notifications.tsx                #    🔔 Notification center
│   ├── search.tsx                       #    🔍 Global search
│   │
│   ├── (auth)/                          #    🔐 Onboarding & Authentication
│   │   ├── _layout.tsx                  #       Auth stack navigator
│   │   ├── splash.tsx                   #       Splash screen with branding
│   │   ├── login.tsx                    #       Phone number input
│   │   ├── otp-verification.tsx         #       6-digit OTP verification
│   │   ├── profile-setup.tsx            #       Name, Gender, Emergency Contact (mandatory)
│   │   ├── city-selection.tsx           #       Bangalore (active) / Chennai, Hyderabad (coming soon)
│   │   └── language-selection.tsx       #       App language preference
│   │
│   ├── (tabs)/                          #    📱 Bottom Tab Navigation
│   │   ├── _layout.tsx                  #       Tab bar config (Home, Plans, Wellness, Account, Cart)
│   │   ├── index.tsx                    #       🏠 Home — service grid, SOS button, location header
│   │   ├── plans.tsx                    #       📋 Plans — subscriptions & packages
│   │   ├── wellness.tsx                 #       💚 Wellness — health content & tips
│   │   ├── account.tsx                  #       👤 Account — profile, settings, emergency contacts
│   │   └── cart.tsx                     #       🛒 Cart — service checkout
│   │
│   ├── doctor-visit/                    #    🏥 Doctor Home Visit Flow
│   │   ├── _layout.tsx                  #       Stack navigator
│   │   ├── index.tsx                    #       Landing page
│   │   ├── symptom-selection.tsx        #       Symptom grid (Fever, BP, Sugar, Rehab...)
│   │   ├── doctor-type.tsx              #       GP vs Physiotherapist (auto-suggested)
│   │   ├── schedule.tsx                 #       Date & time slot picker
│   │   ├── confirmation.tsx             #       Booking confirmation
│   │   └── tracking.tsx                 #       Real-time doctor tracking
│   │
│   ├── nurse-care/                      #    👩‍⚕️ Home Nurse & Caretaker Flow
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── staff-type.tsx               #       Qualified Nurse vs Bedside Attendant
│   │   ├── shift-selection.tsx          #       Short visit / 12h / 24h
│   │   ├── requirements.tsx             #       Specific care needs
│   │   ├── schedule.tsx
│   │   └── confirmation.tsx
│   │
│   ├── transportation/                  #    🚗 Transportation / Trips Flow
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── request-trip.tsx             #       Pickup, drop, date, requirements
│   │   ├── trip-details.tsx
│   │   └── tracking.tsx                 #       Real-time vehicle tracking
│   │
│   ├── insurance/                       #    🛡️ Insurance Flow
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── health-assessment.tsx        #       Initial health survey
│   │   ├── pre-existing-conditions.tsx  #       Diabetes, BP, Heart, etc.
│   │   ├── plan-comparison.tsx          #       Side-by-side comparison
│   │   ├── plan-details.tsx
│   │   └── application.tsx              #       Submit with documents
│   │
│   └── payment/                         #    💳 Payment & Refunds Flow
│       ├── _layout.tsx
│       ├── checkout.tsx                 #       Order summary
│       ├── payment-method.tsx           #       UPI, Card, Net Banking, Wallet
│       ├── payment-success.tsx
│       ├── refund-request.tsx           #       SLA breach / Compassionate Clause
│       └── refund-status.tsx
│
├── components/                          # 🧩 Reusable UI Components
│   ├── common/                          #    Shared components
│   │   ├── OTPInput.tsx                 #       6-digit OTP entry
│   │   ├── AddressPicker.tsx            #       Address input with maps
│   │   ├── CustomButton.tsx             #       Themed button (primary/secondary/danger)
│   │   ├── LoadingSpinner.tsx           #       Full-screen & inline loader
│   │   ├── EmptyState.tsx               #       No-data placeholder
│   │   ├── NotificationBadge.tsx        #       Unread count badge
│   │   └── index.ts
│   ├── home/                            #    Home screen components
│   │   ├── HomeHeader.tsx               #       Location, Search, Notifications, SOS
│   │   ├── ServiceCard.tsx              #       Service grid item
│   │   ├── ServiceGrid.tsx              #       Grid layout container
│   │   ├── LocationPicker.tsx           #       City/area selector
│   │   ├── PromotionsBanner.tsx         #       Offers carousel
│   │   └── index.ts
│   ├── booking/                         #    Booking components
│   │   ├── SymptomCard.tsx              #       Individual symptom selector
│   │   ├── StaffSelectionCard.tsx       #       Doctor/Nurse profile card
│   │   ├── DateTimePicker.tsx           #       Reusable date/time selector
│   │   ├── BookingSummaryCard.tsx       #       Booking overview card
│   │   ├── ShiftDurationCard.tsx        #       Shift option card
│   │   └── index.ts
│   ├── sos/                             #    SOS components
│   │   ├── SOSButton.tsx                #       Main trigger (slide/countdown modes)
│   │   ├── SOSCountdown.tsx             #       3-second countdown overlay
│   │   ├── SlideToCall.tsx              #       Swipeable activation
│   │   └── index.ts
│   ├── insurance/                       #    Insurance components
│   │   ├── InsurancePlanCard.tsx         #       Plan summary card
│   │   ├── ConditionCheckbox.tsx        #       Pre-existing condition toggle
│   │   └── index.ts
│   └── ui/                              #    Base UI primitives (existing)
│       ├── collapsible.tsx
│       ├── icon-symbol.ios.tsx
│       └── icon-symbol.tsx
│
├── services/                            # 🔌 Service Layer (API + Device)
│   ├── api/                             #    Backend API services
│   │   ├── apiClient.ts                 #       Base HTTP client with auth interceptors
│   │   ├── authService.ts               #       OTP request, verify, logout, refresh
│   │   ├── userService.ts               #       Profile CRUD, emergency contacts, addresses
│   │   ├── bookingService.ts            #       Doctor visit, nurse care, trip bookings
│   │   ├── insuranceService.ts          #       Plans, premium calculation, applications
│   │   ├── paymentService.ts            #       Payments, refunds, coupons
│   │   └── index.ts
│   └── device/                          #    Device/platform services
│       ├── locationService.ts           #       GPS coordinates, permissions, geocoding
│       ├── notificationService.ts       #       Push registration, history, local alerts
│       ├── storageService.ts            #       AsyncStorage wrapper with typed keys
│       ├── sosService.ts                #       GPS + WhatsApp/SMS + hotline call
│       └── index.ts
│
├── context/                             # 🌐 React Context (State Management)
│   ├── AuthContext.tsx                   #    Authentication state (login/logout/token)
│   ├── UserContext.tsx                   #    User profile, city, language preferences
│   ├── BookingContext.tsx                #    Active bookings state
│   ├── CartContext.tsx                   #    Service cart (items, total, coupons)
│   └── index.ts
│
├── types/                               # 📝 TypeScript Definitions
│   ├── navigation.ts                    #    Route parameter types (RootStack, AuthStack, Tabs)
│   ├── user.ts                          #    User, EmergencyContact, Address
│   ├── booking.ts                       #    DoctorVisit, NurseCare, Trip, Symptom, Status
│   ├── insurance.ts                     #    InsurancePlan, PreExistingCondition, Application
│   ├── api.ts                           #    ApiResponse, PaginatedResponse, ApiError
│   └── index.ts
│
├── utils/                               # 🔧 Utility Functions
│   ├── validation.ts                    #    Phone (Indian), OTP, email, pincode validators
│   ├── formatters.ts                    #    ₹ currency, +91 phone, dates, relative time
│   ├── symptomMapper.ts                 #    Symptom → Doctor type smart routing logic
│   └── index.ts
│
├── hooks/                               # 🪝 Custom React Hooks
│   ├── useAuth.ts                       #    Authentication state & actions
│   ├── useLocation.ts                   #    GPS location with permission handling
│   ├── useBooking.ts                    #    Booking CRUD operations
│   ├── useNotifications.ts              #    Push notification management
│   ├── use-color-scheme.ts              #    System theme detection
│   └── use-theme-color.ts              #    Theme-aware color hook
│
├── constants/                           # ⚙️ App Constants
│   ├── theme.ts                         #    Colors, Typography, Spacing, BorderRadius
│   ├── appConstants.ts                  #    Cities, Languages, Symptoms, Shifts, SOS config
│   └── index.ts
│
├── assets/                              # 🖼️ Static Assets
│   ├── images/                          #    App icons, splash screen, onboarding images
│   ├── icons/                           #    Service & navigation SVG/PNG icons
│   ├── fonts/                           #    Custom font files (.ttf, .otf)
│   └── animations/                      #    Lottie JSON animations (SOS, loading, success)
│
├── app.json                             # Expo app configuration
├── package.json                         # Dependencies & scripts
├── tsconfig.json                        # TypeScript configuration
└── eslint.config.js                     # ESLint rules
```

---

## App Screens & Navigation

### Navigation Flow

```
┌─────────────┐
│   Splash     │
└──────┬───────┘
       ▼
┌─────────────┐    ┌──────────────────┐
│    Login     │───▶│  OTP Verify      │
└──────────────┘    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │  Profile Setup   │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │  City Selection  │
                    └────────┬─────────┘
                             ▼
              ┌──────────────────────────────┐
              │     MAIN APP (Tab Navigator) │
              ├──────┬───────┬───────┬───────┤
              │ Home │ Plans │Wellness│Account│Cart│
              └──┬───┴───────┴───────┴───────┴────┘
                 │
    ┌────────────┼────────────┬────────────┬──────────────┐
    ▼            ▼            ▼            ▼              ▼
 Doctor       Nurse      Transport    Insurance      SOS Emergency
 Visit        Care                                   (Full Modal)
```

### Bottom Tab Bar

| Tab | Screen | Description |
|-----|--------|-------------|
| 🏠 Home | `(tabs)/index.tsx` | Dashboard with service cards, SOS button, promotions |
| 📋 Plans | `(tabs)/plans.tsx` | Service subscription plans & packages |
| 💚 Wellness | `(tabs)/wellness.tsx` | Health tips & wellness content |
| 👤 Account | `(tabs)/account.tsx` | Profile management, emergency contacts, settings |
| 🛒 Cart | `(tabs)/cart.tsx` | Service cart & checkout flow |

---

## Core Modules

### 🆘 Safety SOS

The most critical feature — designed to prevent accidental triggers while remaining fast in real emergencies.

**Activation Modes:**
- **Slide to Call** — User swipes a slider to confirm
- **3-Second Countdown** — Press and hold with visible countdown; can cancel anytime

**Emergency Flow:**
1. User activates SOS
2. App fetches GPS coordinates
3. Backend sends WhatsApp/SMS with location to admin & emergency contacts
4. App initiates call to emergency hotline

**Files:** `app/sos-emergency.tsx` · `components/sos/` · `services/device/sosService.ts`

---

### 🏥 Doctor Home Visit

Book MBBS General Physicians or Physiotherapists for home visits.

**Smart Routing Logic:**
- Symptoms like *Fever, BP Check, Sugar* → **General Physician**
- Symptoms like *Post-Surgery Rehab, Physiotherapy* → **Physiotherapist**
- Implemented in `utils/symptomMapper.ts`

**Booking Flow:** Symptom Selection → Doctor Type → Schedule → Confirmation → Tracking

**Files:** `app/doctor-visit/` · `components/booking/SymptomCard.tsx` · `utils/symptomMapper.ts`

---

### 👩‍⚕️ Home Nurse & Caretaker

Two tiers of home care staff:

| Tier | Role | Examples |
|------|------|----------|
| **Qualified Nurse** | Medical procedures | IV drip, tracheostomy care, injections, wound care |
| **Bedside Attendant** | Daily living assistance | Bathing, feeding, mobility help, companionship |

**Shift Options:** Short Visit (1-2hrs) · 12-Hour Shift · 24-Hour Live-in

**Files:** `app/nurse-care/` · `components/booking/ShiftDurationCard.tsx`

---

### 🚗 Transportation

Assisted transportation for seniors who need help getting to appointments, temples, family visits, etc.

**Files:** `app/transportation/`

---

### 🛡️ Insurance

Senior-focused insurance with pre-existing condition awareness.

**Flow:** Health Assessment → Pre-existing Conditions (Diabetes, BP, Heart) → Premium Calculation → Plan Comparison → Application

**Files:** `app/insurance/` · `components/insurance/` · `services/api/insuranceService.ts`

---

### 💳 Payments & Refunds

**Payment Methods:** UPI · Credit/Debit Card · Net Banking · Wallet

**Refund Policy (per PRD):**
- **SLA Breach** — Full/partial refund if service provider misses the visit
- **Compassionate Clause** — 100% refund in case of customer's demise or long-term hospitalization
- **Cancellation** — Standard cancellation policy applies

**Files:** `app/payment/` · `services/api/paymentService.ts`

---

## Services Architecture

The service layer is split into two domains:

### API Services (`services/api/`)

| Service | Responsibility |
|---------|---------------|
| `apiClient.ts` | Base HTTP client with auth token interceptors |
| `authService.ts` | OTP request/verify, token management, logout |
| `userService.ts` | Profile CRUD, emergency contacts, address management |
| `bookingService.ts` | Doctor visit, nurse care, and trip bookings |
| `insuranceService.ts` | Plans, premium calculation, applications |
| `paymentService.ts` | Payment initiation, verification, refunds, coupons |

### Device Services (`services/device/`)

| Service | Responsibility |
|---------|---------------|
| `locationService.ts` | GPS coordinates, permissions, reverse geocoding |
| `notificationService.ts` | Push notification registration, history, local alerts |
| `storageService.ts` | AsyncStorage wrapper with typed keys |
| `sosService.ts` | Emergency: GPS fetch + WhatsApp/SMS + hotline call |

---

## State Management

State is managed via **React Context API** with four providers, all composed in `app/_layout.tsx`:

```
AuthProvider          →  Authentication (token, userId, login/logout)
  └─ UserProvider     →  Profile, city, language preferences
      └─ BookingProvider  →  Active & current bookings
          └─ CartProvider →  Cart items, totals, coupon state
```

| Context | Hook | Purpose |
|---------|------|---------|
| `AuthContext` | `useAuth()` | Login state, token, userId |
| `UserContext` | `useUser()` | Profile, selected city, language |
| `BookingContext` | `useBooking()` | Active bookings list |
| `CartContext` | `useCart()` | Cart items, total, item count |

---

## Type System

All TypeScript types live in `types/` with full barrel exports:

```typescript
// User types
User, EmergencyContact, Address

// Booking types
DoctorVisit, NurseCare, Trip, Symptom, DoctorType, StaffType, ShiftDuration, BookingStatus

// Insurance types
InsurancePlan, PreExistingCondition, InsuranceApplication

// API types
ApiResponse<T>, PaginatedResponse<T>, ApiError

// Navigation types
RootStackParamList, AuthStackParamList, TabParamList
```

---

## Utilities

| Utility | Purpose | Key Functions |
|---------|---------|---------------|
| `validation.ts` | Form validation | `validators.phoneNumber()`, `validators.otp()`, `validators.email()`, `validators.pincode()` |
| `formatters.ts` | Display formatting | `formatters.currency()` (₹), `formatters.phoneNumber()` (+91), `formatters.relativeTime()` |
| `symptomMapper.ts` | Smart routing | `getDoctorTypeForSymptoms()` — maps symptoms to GP or Physiotherapist |

---

## Constants & Configuration

### Theme (`constants/theme.ts`)
- **Colors** — Primary blue, SOS red, status colors, dark mode support
- **Typography** — Font sizes from `xs` (10) to `4xl` (36)
- **Spacing** — Consistent spacing scale from `xs` (4) to `4xl` (48)

### App Constants (`constants/appConstants.ts`)
- **Cities** — Bangalore (active), Chennai & Hyderabad (coming soon)
- **Languages** — English, Hindi, Kannada, Tamil, Telugu
- **Symptoms** — 10 symptom types with icons and doctor type mapping
- **Shift Durations** — Short visit, 12h, 24h with descriptions
- **Pre-existing Conditions** — 9 conditions for insurance assessment
- **SOS Config** — Countdown duration, activation mode
- **Refund Reasons** — SLA breach, compassionate, cancellation, quality

---

## Assets

| Directory | Contents |
|-----------|----------|
| `assets/images/` | App icon, splash screen, onboarding illustrations |
| `assets/icons/` | Service icons (doctor, nurse, transport, insurance), navigation icons |
| `assets/fonts/` | Custom typography files (.ttf, .otf) |
| `assets/animations/` | Lottie JSON files (SOS countdown, loading, success/failure) |

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Start** | `npm start` | Start Expo dev server |
| **Android** | `npm run android` | Launch on Android emulator |
| **iOS** | `npm run ios` | Launch on iOS simulator |
| **Web** | `npm run web` | Launch in web browser |
| **Lint** | `npm run lint` | Run ESLint checks |
| **Reset** | `npm run reset-project` | Reset to blank project |

---

## Development Guidelines

### File Naming
- **Screens** — `kebab-case.tsx` (e.g., `symptom-selection.tsx`)
- **Components** — `PascalCase.tsx` (e.g., `SOSButton.tsx`)
- **Services** — `camelCase.ts` (e.g., `bookingService.ts`)
- **Types** — `camelCase.ts` (e.g., `booking.ts`)
- **Utils** — `camelCase.ts` (e.g., `formatters.ts`)

### Import Aliases
Use the `@/` alias for clean imports:
```typescript
import { useAuth } from '@/context/AuthContext';
import { bookingService } from '@/services/api/bookingService';
import { Colors } from '@/constants/theme';
```

### Adding a New Screen
1. Create the `.tsx` file inside the appropriate `app/` subdirectory
2. Register it in the parent `_layout.tsx` (if using Stack navigator)
3. Add route params to `types/navigation.ts`

### Adding a New Component
1. Create in the appropriate `components/` subdirectory
2. Export from the directory's `index.ts` barrel file
3. Define props interface with TypeScript

### Adding a New API Service
1. Create in `services/api/`
2. Export from `services/api/index.ts`
3. Add corresponding types in `types/`

---

## Business Logic & Policies

### Service Model
- Oldful is a **care management company**, not a medical facility
- Uses a mix of internal staff and **independent third-party vendors**
- All medical decisions are made by qualified professionals, not the app

### Refund Policy
| Reason | Refund |
|--------|--------|
| SLA Breach (missed visit) | Full/partial refund |
| Compassionate Clause (demise/hospitalization) | 100% refund |
| User cancellation | Per cancellation policy |
| Quality issues | Reviewed case-by-case |

### City Availability
| City | Status |
|------|--------|
| Bangalore | ✅ Active |
| Chennai | 🔜 Coming Soon |
| Hyderabad | 🔜 Coming Soon |

Users in non-active cities can sign up for "Coming Soon" notifications.

---

## Roadmap

- [ ] Complete UI implementation for all screens
- [ ] Integrate backend API endpoints
- [ ] Implement OTP authentication flow
- [ ] Build SOS emergency flow with GPS + WhatsApp/SMS
- [ ] Add Razorpay/Paytm payment gateway integration
- [ ] Implement push notifications via Firebase Cloud Messaging
- [ ] Add multi-language support (i18n)
- [ ] Build admin panel for operations management
- [ ] Add real-time tracking (doctor/driver location)
- [ ] Implement analytics and crash reporting
- [ ] Beta testing in Bangalore
- [ ] Launch on Google Play Store & Apple App Store

---

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Navigation](https://reactnavigation.org/)

---

<p align="center">
  Built with ❤️ for India's elders
</p>
