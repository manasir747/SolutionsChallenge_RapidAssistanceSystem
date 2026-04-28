# Rapid Crisis Response System

IoT-ready, agentic AI emergency orchestration for hotels and resorts. Guests trigger incidents instantly, staff coordinate in real time, and admins receive Gemini-powered insights backed by Firebase.

## Stack

- **Next.js 14** with the App Router and TypeScript
- **Firebase** Authentication, Firestore, Cloud Functions
- **Google Gemini** for agentic AI chat, admin suggestions, and automatic incident summaries
- **Google Maps API** for live responder routing
- **IoT-ready data model** to connect sensors, wearables, and panic devices

## Prerequisites

- Node.js 18+
- Firebase project with Authentication + Firestore enabled
- Google Maps API key (Maps JavaScript)
- Gemini API key (Google AI Studio)

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Copy environment template**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill every `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, and `GEMINI_API_KEY`.
3. **Start the Next.js app**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000.

## Firebase Setup

1. **Login & initialize**
   ```bash
   npx firebase login
   npx firebase use <your-project-id>
   ```
2. **Deploy security rules**
   ```bash
   npx firebase deploy --only firestore:rules
   ```
3. **Configure Gemini for Cloud Functions**
   ```bash
   cd functions
   npm run build
   cd ..
   npx firebase functions:config:set gemini.key="YOUR_KEY"
   ```
4. **Run all emulators**
   ```bash
   npm run firebase:emulators
   ```

## Cloud Functions

Located in `functions/src/index.ts`:

- `incidentSummaryGenerator` – Listens for incidents marked resolved and stores a Gemini-generated summary.
- `smartSuggestions` – Callable function delivering admin action cards from Gemini.

Deploy both after configuring environment variables:

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Key Features

- **Role-based dashboards**: Guest emergency pad, staff response console, admin command board.
- **Realtime Firestore listeners**: Live incident feeds and chat sync.
- **Agentic AI copilots**: Ask-AI chat, action suggestions, and automated incident summaries that adapt to live updates.
- **Google Maps integration**: Plot guests, staff, and safe exits with styled map overlays.
- **Accessibility friendly**: Large tap targets, high-contrast palette, and responsive layout.
- **IoT ingestion ready**: Incident schema supports sensor events, panic buttons, and wearable telemetry as first-class triggers.

## IoT + Agentic AI Focus

- **IoT signals as triggers**: Designed to ingest fire alarms, smoke sensors, door access anomalies, and wearable SOS taps.
- **Agentic orchestration**: AI suggests next-best actions and updates recommendations as the situation evolves.
- **Human-in-the-loop**: Staff can accept, reject, or override AI guidance, keeping control with operators.

## Real-World Impact

- **Faster response times**: Automated triage reduces the time from incident detection to staff assignment.
- **Better situational awareness**: Live maps, chat, and summaries reduce information gaps across teams.
- **Consistent post-incident reports**: AI summaries help with compliance, audits, and training.
- **Scalable safety**: One platform supports multiple properties without duplicating processes.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js locally |
| `npm run build` | Production build |
| `npm run start` | Serve the built app |
| `npm run lint` | Lint with ESLint + Next config |
| `npm run firebase:emulators` | Build Cloud Functions then start Firebase emulators |

## Testing Checklist

- Create guest/staff/admin accounts via `/login` and verify redirect to `/dashboard`.
- Trigger guest emergency, confirm record appears for staff/admin.
- Assign incident as staff and chat with guest from the Conversation panel.
- Refresh Gemini suggestions for admins and ensure action cards populate.
- Resolve an incident and verify a summary appears (via API route or Cloud Function emulator).

## Deployment Notes

- Use Vercel or Firebase Hosting for the Next.js frontend.
- Store secrets (`GEMINI_API_KEY`, Firebase service creds) in platform-specific secret stores.
- Enable HTTPS for callable functions and restrict invocation via App Check for production.
