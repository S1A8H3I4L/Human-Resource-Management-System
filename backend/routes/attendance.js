const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function nowTime() {
  return new Date().toTimeString().slice(0, 5); // HH:MM
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function hoursBetween(inTime, outTime) {
  if (!inTime || !outTime) return 0;
  const [ih, im] = inTime.split(":").map(Number);
  const [oh, om] = outTime.split(":").map(Number);
  return Math.max(0, (oh * 60 + om - (ih * 60 + im)) / 60);
}

// POST /api/attendance/check-in
router.post("/check-in", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?")
    .get(req.user.id, today());
  if (existing && existing.check_in) {
    return res.status(409).json({ error: "You've already checked in today" });
  }
  if (existing) {
    db.prepare("UPDATE attendance SET check_in = ?, status = 'present' WHERE id = ?").run(nowTime(), existing.id);
  } else {
    db.prepare(
      "INSERT INTO attendance (employee_id, work_date, check_in, status) VALUES (?, ?, ?, 'present')"
    ).run(req.user.id, today(), nowTime());
  }
  const row = db.prepare("SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?").get(req.user.id, today());
  res.json(row);
});

// POST /api/attendance/check-out
router.post("/check-out", (req, res) => {
  const existing = db
    .prepare("SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?")
    .get(req.user.id, today());
  if (!existing || !existing.check_in) return res.status(400).json({ error: "You haven't checked in yet today" });
  if (existing.check_out) return res.status(409).json({ error: "You've already checked out today" });

  db.prepare("UPDATE attendance SET check_out = ? WHERE id = ?").run(nowTime(), existing.id);
  const row = db.prepare("SELECT * FROM attendance WHERE id = ?").get(existing.id);
  res.json(row);
});

// GET /api/attendance/me?month=2026-07  -> employee's own month view
router.get("/me", (req, res) => {
  const month = req.query.month || today().slice(0, 7);
  const rows = db
    .prepare("SELECT * FROM attendance WHERE employee_id = ? AND work_date LIKE ? ORDER BY work_date ASC")
    .all(req.user.id, `${month}%`);
  const enriched = rows.map((r) => ({ ...r, work_hours: hoursBetween(r.check_in, r.check_out) }));

  const daysPresent = rows.filter((r) => r.status === "present" && r.check_in).length;
  const totalDaysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();

  res.json({
    records: enriched,
    summary: { daysPresent, totalDaysInMonth, todayStatus: db.prepare(
      "SELECT check_in, check_out FROM attendance WHERE employee_id = ? AND work_date = ?"
    ).get(req.user.id, today()) },
  });
});

// GET /api/attendance/team?date=2026-07-04 -> Admin/HR view of everyone for a given day
router.get("/team", requireRole("admin", "hr"), (req, res) => {
  const date = req.query.date || today();
  const rows = db
    .prepare(
      `SELECT a.*, e.name, e.avatar_url FROM attendance a
       JOIN employees e ON e.id = a.employee_id
       WHERE e.company_id = ? AND a.work_date = ?
       ORDER BY e.name ASC`
    )
    .all(req.user.companyId, date);
  const enriched = rows.map((r) => ({ ...r, work_hours: hoursBetween(r.check_in, r.check_out) }));
  res.json({ date, records: enriched });
});

module.exports = router;
