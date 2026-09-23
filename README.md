# Ignite_Skylabs

Feedback and client management for **[Ridemap](https://ridemap.in/)** (campus bus tracking) and **[PrintA4](https://printa4.in/home)** (self-service print kiosks).

`feedback-hub/` is a frontend-only React app with three sides:

| Side | Route | Who it's for |
| --- | --- | --- |
| **Client panel** | `/` | Colleges and shops that bought the products |
| **Users panel** | `/feedback` | Students, staff and customers |
| **Admin** | `/admin` | The Ridemap / PrintA4 team |

## Running it

```bash
cd feedback-hub
npm install
npm run dev
```

Vite prints the local address (usually http://localhost:5173).

Demo client login: `CL-25-0003` / `transport@kit.edu.in`

## What each side does

**Users panel** — a feedback form per product with five types (problem, suggestion, question, praise, general), product-specific categories, an emoji rating and an anonymous option. While typing, similar open reports appear so users can add a "me too" instead of filing a duplicate. Every submission returns a reference ID that can be checked at `/track`.

**Client panel** — clients sign in with a Client ID (`CL-26-0014`) and their registered email, or sign up at `/client/join` to get an ID straight away. They can report issues, raise complaints, place orders (extra GPS trackers, a new kiosk, paper refills), send suggestions and opinions, and write star reviews. Each request has a live status and a conversation with the team.

**Admin** — dashboard with stats, trends and topics that are heating up; feedback lists with filters and keyboard triage (`j`/`k`/`Enter`); a client directory with recently joined clients; a client request inbox; a Reviews & ideas board; analytics; and **WhatsApp → Notes**, which turns a pasted or exported WhatsApp chat into tracked client requests, sorted by type, product and priority.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router · Recharts · lucide-react

## Data

There is no backend yet. All data lives in the browser's localStorage, seeded with realistic sample data on first run, and every read and write goes through two files:

- `src/services/feedbackApi.ts` — user feedback
- `src/services/clientApi.ts` — clients and their requests

Swapping those function bodies for `fetch()` calls is the whole backend integration; no page needs to change.

## Before going live

- `/admin` has no authentication. Put it behind a login.
- The client sign-in is a demo check (Client ID + email, no password). Real auth needs the backend.
- WhatsApp import is manual: paste or upload a chat. Automatic capture would need the WhatsApp Business Cloud API plus a server to receive messages; the parsing rules in `src/lib/whatsapp.ts` can be reused as-is.
