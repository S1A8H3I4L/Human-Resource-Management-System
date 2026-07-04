# Shiftwork — HRMS
### Every workday, perfectly aligned.

A full-stack Human Resource Management System: authentication with
auto-generated employee IDs, role-based dashboards, employee profiles,
attendance check-in/out, and a time-off request + approval workflow —
styled as a clean, functional neo-brutalist product.

Built directly from the wireframes/spec you shared (sign in/up, employee
grid, profile tabs, salary breakdown, attendance list, time-off calendar
and approvals).

---

## 1. Stack

| Layer     | Choice                                                            |
|-----------|--------------------------------------------------------------------|
| Frontend  | React 18 + Vite, React Router, plain CSS design system (no UI kit) |
| Backend   | Node.js + Express, JWT auth, bcrypt password hashing               |
| Database  | SQLite via Node's built-in `node:sqlite` module — **zero native build**, one file (`hrms.sqlite`) |

Because it uses Node's built-in SQLite, there is **no compiler/toolchain
needed** to install the database driver — just `npm install` and go.
Requires **Node.js 22.5+**.

---

## 2. Project structure

```
hrms/
  backend/
    server.js          Express app + route mounting
    db.js               Schema (companies, employees, attendance, time_off_requests, salary_structures, ...)
    seed.js             Demo company + 7 employees + attendance + leave history
    utils/loginId.js    Auto-generates login IDs, e.g. OIJODO20260001
    middleware/auth.js  JWT verification + role guard
    routes/
      auth.js           signup / login / me / change-password
      employees.js      list / create / view / edit / skills
      attendance.js     check-in / check-out / my month view / team day view
      timeoff.js        apply / list / balances / approve-reject
      salary.js         view + auto-calculated salary components (admin only)
  frontend/
    src/
      api/client.js         fetch wrapper for the REST API
      context/AuthContext.jsx
      components/            Navbar, Stamp (status badge), ProtectedRoute
      pages/
        SignIn.jsx / SignUp.jsx
        Dashboard.jsx        employee grid, clickable cards, "+ New Employee"
        Profile.jsx          Resume / Private Info / Salary Info (admin) / Security tabs
        Attendance.jsx       my month view + admin team day view
        TimeOff.jsx          balances, mini calendar, request modal, admin approvals
      styles/global.css      neo-brutalist design tokens & components
```

---

## 3. Running it locally

### Backend

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET for anything beyond local demo use
npm run seed               # creates a demo company with 7 employees
npm start                  # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :4000)
```

Open **http://localhost:5173**.

### Demo accounts (all passwords: `password123`)

| Role     | Login              |
|----------|---------------------|
| Admin    | admin@odoo.com       |
| HR       | hr@odoo.com          |
| Employee | jodo@odoo.com, meera@odoo.com, kabir@odoo.com, sana@odoo.com, rohan@odoo.com |

Or click **Sign Up** to spin up a brand-new company + admin from scratch —
this matches the spec's rule that normal employees can't self-register;
only the founding admin signs up, and every later employee is created
*by* that admin (with an auto-generated login ID and a system password
they change on first login).

---

## 4. How the spec's key rules are implemented

- **Login ID format** `[Company initials][First2+Last2 of name][Year][Serial]`
  → `backend/utils/loginId.js`, e.g. `OIJODO20260001`.
- **Admin/HR create employees**, never self-registration for regular staff
  → `POST /api/employees` is `admin`/`hr`-only and returns a system-generated
  temporary password; `must_change_password` gates a forced reset (see
  `changePassword` in `auth.js`).
- **Status dot** (present / absent / on leave) on each employee card
  → computed live from today's attendance row (`todayStatus` field).
- **Check-in/out systray** in the navbar, with the live green/red LED
  → `components/Navbar.jsx` + `POST /api/attendance/check-in|check-out`.
- **View-only profile in form view** when opened from the grid, editable
  for the owner or an admin → `Profile.jsx`'s `canEdit` check.
- **Salary Info tab visible to Admin only**, auto-calculated components
  from a single **Wage** value (Basic %, HRA % of Basic, Standard
  Allowance, Performance Bonus, Leave Travel Allowance, with **Fixed
  Allowance = Wage − sum of the rest**) → `routes/salary.js`.
- **Attendance** feeds payroll: approving a time-off request marks each
  day of that range as `leave` in the attendance table, so absences net
  out of "days present" automatically → see the approval handler in
  `routes/timeoff.js`.
- **Leave balances** (Paid Time Off / Sick Leave / Unpaid Leave) tracked
  per employee and decremented on approval → `leave_balances` table.
- **Role-based visibility**: employees only ever see their own
  attendance/time-off; `admin`/`hr` get the team-wide views and the
  approve/reject actions.

---

## 5. Design direction — "Shiftwork" neo-brutalism

- **Palette** — bone paper (`#EFEBE0`) background, ink black borders,
  electric indigo (`#5B3DF6`) as the single accent brand color, with
  lime / sun / coral / sky reserved purely as *functional* status colors
  (present, pending, rejected, on-leave).
- **Type** — Space Grotesk for headings/buttons, Archivo for body copy,
  JetBrains Mono for anything that reads like data: login IDs, dates,
  timestamps, currency.
- **Signature element** — status badges are styled as slightly-rotated
  **ink stamps** (mono type, thick border, pill shape) — a nod to the
  physical time-card this system replaces. Buttons and cards use a hard,
  un-blurred offset shadow that flattens on click, like a stamp hitting
  paper.
- Every interactive surface has a visible focus ring and the layout
  collapses cleanly down to mobile widths.

---

## 6. Notes & next steps

- SQLite is file-based, so the whole company's data lives in
  `backend/hrms.sqlite` — trivial to back up, inspect (`sqlite3
  hrms.sqlite`), or swap for Postgres later by re-pointing `db.js`.
- File/photo uploads (avatars, sick-leave attachments) are stubbed as
  URL fields (`avatar_url`, `attachment_url`) — wire up your storage of
  choice (S3, Cloudinary, etc.) and just save the resulting URL.
- Email verification is intentionally out of scope for this build; the
  `must_change_password` flag on system-created accounts stands in for
  the "first login forces a real password" requirement instead.
