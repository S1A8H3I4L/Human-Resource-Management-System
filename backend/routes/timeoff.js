const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads/certificates");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.use(requireAuth);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    const fileName =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_");

    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter(req, file, cb) {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, JPEG and PNG files are allowed."));
    }
  },
});

function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  return Math.round((b - a) / 86400000) + 1;
}

// GET /api/timeoff/balances -> current user's leave balances
router.get("/balances", (req, res) => {
  const rows = db.prepare("SELECT * FROM leave_balances WHERE employee_id = ?").all(req.user.id);
  res.json(rows.map((r) => ({ ...r, remaining_days: r.total_days - r.used_days })));
});

// GET /api/timeoff/me -> employee's own requests
router.get("/me", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM time_off_requests WHERE employee_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json(rows);
});

// GET /api/timeoff/team -> Admin/HR: all requests for the company
router.get("/team", requireRole("admin", "hr"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT t.*, e.name AS employee_name, e.avatar_url FROM time_off_requests t
       JOIN employees e ON e.id = t.employee_id
       WHERE e.company_id = ?
       ORDER BY t.created_at DESC`
    )
    .all(req.user.companyId);
  res.json(rows);
});

// POST /api/timeoff -> apply for time off
router.post(
  "/",
  upload.single("certificate"),
  (req, res) => {
  const { type, startDate, endDate, remarks } = req.body;
  if (!type || !startDate || !endDate) {
    return res.status(400).json({ error: "Time off type and date range are required" });
  }
  const days = daysBetween(startDate, endDate);
let attachmentUrl = null;

if (req.file) {
  attachmentUrl =
    "/uploads/certificates/" + req.file.filename;
}
  if (days <= 0) return res.status(400).json({ error: "End date must be on or after the start date" });

  if (type !== "Unpaid Leave") {
    const balance = db
      .prepare("SELECT * FROM leave_balances WHERE employee_id = ? AND type = ?")
      .get(req.user.id, type);
    if (balance && balance.total_days - balance.used_days < days) {
      return res.status(400).json({ error: `Not enough ${type} balance remaining` });
    }
  }

  const info = db
    .prepare(
      `INSERT INTO time_off_requests (employee_id, type, start_date, end_date, days, remarks, attachment_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, type, startDate, endDate, days, remarks || null, attachmentUrl);

  const created = db.prepare("SELECT * FROM time_off_requests WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(created);
});

// PATCH /api/timeoff/:id/review -> Admin/HR approves or rejects
router.patch("/:id/review", requireRole("admin", "hr"), (req, res) => {
  const { decision, comment } = req.body; // decision: 'approved' | 'rejected'
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
  }
  const request = db.prepare("SELECT * FROM time_off_requests WHERE id = ?").get(req.params.id);
  if (!request) return res.status(404).json({ error: "Time off request not found" });
  if (request.status !== "pending") return res.status(409).json({ error: "This request was already reviewed" });

  db.prepare(
    "UPDATE time_off_requests SET status = ?, reviewed_by = ?, review_comment = ? WHERE id = ?"
  ).run(decision, req.user.id, comment || null, request.id);

  if (decision === "approved") {
    if (request.type !== "Unpaid Leave") {
      db.prepare(
        "UPDATE leave_balances SET used_days = used_days + ? WHERE employee_id = ? AND type = ?"
      ).run(request.days, request.employee_id, request.type);
    }
    // Mark each day of the range as 'leave' in attendance so it feeds payroll/attendance views.
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    const upsert = db.prepare(`
      INSERT INTO attendance (employee_id, work_date, status) VALUES (?, ?, 'leave')
      ON CONFLICT(employee_id, work_date) DO UPDATE SET status = 'leave'
    `);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      upsert.run(request.employee_id, d.toISOString().slice(0, 10));
    }
  }

  const updated = db.prepare("SELECT * FROM time_off_requests WHERE id = ?").get(request.id);
  res.json(updated);
});

module.exports = router;
