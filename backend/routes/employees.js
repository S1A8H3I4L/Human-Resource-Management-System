const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../db");
const { generateLoginId } = require("../utils/loginId");
const { requireAuth, requireRole } = require("../middleware/auth");
const { seedLeaveBalances } = require("./auth");

const router = express.Router();
router.use(requireAuth);

function publicEmployee(row) {
  if (!row) return row;
  const { password_hash, ...rest } = row;
  return rest;
}

function attendanceStatusToday(employeeId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare("SELECT check_in, check_out FROM attendance WHERE employee_id = ? AND work_date = ?")
    .get(employeeId, today);
  if (!row) return "not-checked-in";
  if (row.check_in && !row.check_out) return "checked-in";
  return "checked-out";
}

// GET /api/employees  -> list of employees in the caller's company
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM employees WHERE company_id = ? ORDER BY name ASC")
    .all(req.user.companyId);
  const withStatus = rows.map((r) => ({
    ...publicEmployee(r),
    todayStatus: attendanceStatusToday(r.id),
  }));
  res.json(withStatus);
});

// GET /api/employees/:id
router.get("/:id", (req, res) => {
  const row = db
    .prepare("SELECT * FROM employees WHERE id = ? AND company_id = ?")
    .get(req.params.id, req.user.companyId);
  if (!row) return res.status(404).json({ error: "Employee not found" });

  const skills = db.prepare("SELECT * FROM skills WHERE employee_id = ? AND kind = 'skill'").all(row.id);
  const certifications = db
    .prepare("SELECT * FROM skills WHERE employee_id = ? AND kind = 'certification'")
    .all(row.id);

  res.json({ ...publicEmployee(row), skills, certifications });
});

// POST /api/employees  -> Admin/HR creates a new employee. Auto-generates login ID + temp password.
router.post("/", requireRole("admin", "hr"), (req, res) => {
  const { name, email, mobile, jobPosition, department, manager, location, role } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

  const existing = db.prepare("SELECT id FROM employees WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "An employee with this email already exists" });

  const company = db.prepare("SELECT name FROM companies WHERE id = ?").get(req.user.companyId);
  const loginId = generateLoginId(company.name, name);
  const tempPassword = crypto.randomBytes(4).toString("hex"); // system-generated first password
  const hash = bcrypt.hashSync(tempPassword, 10);

  const info = db
    .prepare(
      `INSERT INTO employees
        (company_id, login_id, name, email, mobile, password_hash, role, job_position, department, manager, location, must_change_password, date_of_joining)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, date('now'))`
    )
    .run(
  req.user.companyId,
  loginId,
  name,
  email,
  mobile || null,
  hash,
  role === "admin" || role === "hr" ? role : "employee",
  jobPosition || null,
  department || null,
  manager || null,
  location || null
);

  db.prepare("INSERT INTO salary_structures (employee_id, monthly_wage) VALUES (?, 0)").run(info.lastInsertRowid);
  seedLeaveBalances(info.lastInsertRowid);

  const created = db.prepare("SELECT * FROM employees WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ employee: publicEmployee(created), temporaryPassword: tempPassword });
});

// PATCH /api/employees/:id -> edit profile.
// Employees may only edit a limited set of their own fields; admins may edit any field of anyone.
const EMPLOYEE_EDITABLE_FIELDS = [
  "mobile",
  "personal_email",
  "residing_address",
  "avatar_url",
  "about",
  "what_i_love",
  "interests",
  "nationality",
  "gender",
  "marital_status",
  "date_of_birth",
  "bank_account_number",
  "bank_name",
  "ifsc_code",
  "pan_no",
  "uan_no",
];
const ADMIN_ONLY_FIELDS = [
  "name",
  "job_position",
  "department",
  "manager",
  "location",
  "role",
  "status",
  "emp_code",
];

router.patch("/:id", (req, res) => {
  const targetId = Number(req.params.id);
  const isSelf = targetId === req.user.id;
  const isAdmin = ["admin", "hr"].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: "You can only edit your own profile" });

  const target = db.prepare("SELECT * FROM employees WHERE id = ? AND company_id = ?").get(targetId, req.user.companyId);
  if (!target) return res.status(404).json({ error: "Employee not found" });

  const allowed = isAdmin ? [...EMPLOYEE_EDITABLE_FIELDS, ...ADMIN_ONLY_FIELDS] : EMPLOYEE_EDITABLE_FIELDS;
  const updates = [];
  const values = [];
  for (const [key, value] of Object.entries(req.body)) {
    const column = key.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()); // camelCase -> snake_case
    if (allowed.includes(column)) {
      updates.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (!updates.length) return res.status(400).json({ error: "No editable fields were provided" });

  values.push(targetId);
  db.prepare(`UPDATE employees SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM employees WHERE id = ?").get(targetId);
  res.json(publicEmployee(updated));
});

// PUT /api/employees/:id/skills -> replace skills/certifications list
router.put("/:id/skills", (req, res) => {
  const targetId = Number(req.params.id);
  const isSelf = targetId === req.user.id;
  const isAdmin = ["admin", "hr"].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: "You can only edit your own skills" });

  const { skills = [], certifications = [] } = req.body;
  const del = db.prepare("DELETE FROM skills WHERE employee_id = ? AND kind = ?");
  const ins = db.prepare("INSERT INTO skills (employee_id, kind, label) VALUES (?, ?, ?)");

  const tx = db.transaction(() => {
    del.run(targetId, "skill");
    del.run(targetId, "certification");
    skills.forEach((label) => label && ins.run(targetId, "skill", label));
    certifications.forEach((label) => label && ins.run(targetId, "certification", label));
  });
  tx();
  res.json({ ok: true });
});

module.exports = router;
