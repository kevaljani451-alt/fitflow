# GymMate – Smart Gym Crowd & Booking System

React + Vite + Tailwind + Recharts + Lucide (client) · Node + Express + Mongoose + MongoDB (server) · JWT auth, bcryptjs hashing.

## Setup
1. Install Node 18+ and MongoDB (local, or an Atlas URI).
2. `cp server/.env.example server/.env` and set `JWT_SECRET` (and `MONGO_URI` if not local).
3. `npm install` then `npm run setup`
4. `npm run seed`  (creates gyms, equipment, classes, trainers, 14 days of demo history, 2 users)
5. `npm run dev`  → app at http://localhost:5173, API at http://localhost:5000

## Demo logins
- Member: member@fitflow.demo / Member@123
- Admin: admin@fitflow.demo / Admin@123

## Demo mode
`DEMO_MODE=true` simulates occupancy every 20 s and labels it "Demo data" in the UI. Set `DEMO_MODE=false` to rely only on admin check-ins/check-outs.

## Models
User, Gym, Equipment, Trainer, Class, Booking, Checkin, Occupancy (server/models.js)

## API (all under /api)
- Public: POST auth/register, POST auth/login, GET gyms, GET gyms/:id/live, GET gyms/:id/analytics
- Logged in: GET/PUT me, GET equipment|classes|trainers, GET slots, POST/GET bookings, DELETE bookings/:id (cancel, up to 1 h before)
- Admin only (checked on the server): PUT admin/gyms/:id, POST admin/checkin, CRUD admin/equipment|classes|trainers, GET admin/bookings, PATCH admin/bookings/:id/cancel, GET admin/users, GET admin/stats

## Rules
Traffic light is computed from occupancy ÷ capacity: green < 40%, yellow 40–74%, red ≥ 75%. Bookings enforce slot capacity, block overlapping bookings by the same user, and reject past times.
