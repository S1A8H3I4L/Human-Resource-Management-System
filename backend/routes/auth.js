const multer = require("multer");
const fs = require("fs");
const path = require("path");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { generateLoginId } = require("../utils/loginId");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads/company-logos");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    cb(
      null,
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_")
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 2 * 1024 * 1024,
  },

  fileFilter(req, file, cb) {
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG and JPG images are allowed."));
    }
  },
});

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, companyId: user.company_id, name: user.name, loginId: user.login_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicEmployee(row) {
  if (!row) return row;
  const { password_hash, ...rest } = row;
  return rest;
}

// ---------------------------------------------------------------------------
// POST /api/auth/signup  -> registers a NEW COMPANY and its first Admin user
// (Per spec: normal employees cannot self-register; only the founding admin
// signs up here. All later employees are created by the admin.)
// ---------------------------------------------------------------------------
router.post(
  "/signup",
  upload.single("logo"),
  (req, res) => {

    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    const { companyName, name, email, phone, password } = req.body;

let logoUrl = null;

if (req.file) {
  logoUrl = "/uploads/company-logos/" + req.file.filename;
}
  if (!companyName || !name || !email || !password) {
    return res.status(400).json({ error: "Company name, name, email and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existing = db.prepare("SELECT id FROM employees WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const insertCompany = db.prepare(
  "INSERT INTO companies (name, logo_url) VALUES (?, ?)"
);

const companyInfo = insertCompany.run(
  companyName,
  logoUrl
);
  const companyId = companyInfo.lastInsertRowid;

  const loginId = generateLoginId(companyName, name);
  const hash = bcrypt.hashSync(password, 10);

  const insertEmp = db.prepare(`
    INSERT INTO employees (company_id, login_id, name, email, mobile, password_hash, role, date_of_joining)
    VALUES (?, ?, ?, ?, ?, ?, 'admin', date('now'))
  `);
  const info = insertEmp.run(companyId, loginId, name, email, phone || null, hash);

  db.prepare(
    "INSERT INTO salary_structures (employee_id, monthly_wage) VALUES (?, 0)"
  ).run(info.lastInsertRowid);
  seedLeaveBalances(info.lastInsertRowid);

  const user = db.prepare("SELECT * FROM employees WHERE id = ?").get(info.lastInsertRowid);
  const token = sign(user);
  res.status(201).json({ token, user: publicEmployee(user) });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post("/login", (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) return res.status(400).json({ error: "Login ID/email and password are required" });

  const user = db
  .prepare(`
      SELECT
          e.*,
          c.name AS company_name,
          c.logo_url
      FROM employees e
      JOIN companies c
      ON c.id = e.company_id
      WHERE e.login_id = ?
      OR e.email = ?
  `)
  .get(loginId, loginId);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Incorrect login ID or password" });
  }
  if (user.status === "inactive") {
    return res.status(403).json({ error: "This account has been deactivated" });
  }

  const token = sign(user);
  res.json({ token, user: publicEmployee(user), mustChangePassword: !!user.must_change_password });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get("/me", requireAuth, (req, res) => {
  const user = db
.prepare(`
SELECT
    e.*,
    c.name AS company_name,
    c.logo_url
FROM employees e
JOIN companies c
ON c.id=e.company_id
WHERE e.id=?
`)
.get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicEmployee(user));
});

// ---------------------------------------------------------------------------
// POST /api/auth/change-password
// ---------------------------------------------------------------------------
router.post("/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare("SELECT * FROM employees WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE employees SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(hash, user.id);
  res.json({ ok: true });
});

function seedLeaveBalances(employeeId) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO leave_balances (employee_id, type, total_days) VALUES (?, ?, ?)"
  );
  insert.run(employeeId, "Paid Time Off", 24);
  insert.run(employeeId, "Sick Leave", 7);
  insert.run(employeeId, "Unpaid Leave", 0);
}

module.exports = { router, seedLeaveBalances };
