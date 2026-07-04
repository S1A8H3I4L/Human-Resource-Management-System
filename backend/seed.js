require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");
const { generateLoginId } = require("./utils/loginId");

const COMPANY_NAME = "Odoo India";

function upsertLeaveBalances(employeeId) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO leave_balances (employee_id, type, total_days) VALUES (?, ?, ?)"
  );
  insert.run(employeeId, "Paid Time Off", 24);
  insert.run(employeeId, "Sick Leave", 7);
  insert.run(employeeId, "Unpaid Leave", 0);
}

function createEmployee({ name, email, role, jobPosition, department, manager, password, wage }) {
  const loginId = generateLoginId(COMPANY_NAME, name);
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO employees
        (company_id, login_id, name, email, mobile, password_hash, role, job_position, department, manager, location, date_of_joining, about, what_i_love, interests)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ahmedabad, IN', date('now', '-' || (abs(random()) % 700) || ' days'), ?, ?, ?)`
    )
    .run(
      companyId,
      loginId,
      name,
      email,
      "+91 90000 000" + String(Math.floor(Math.random() * 90) + 10),
      hash,
      role,
      jobPosition,
      department,
      manager || null,
      "Focused on shipping clean, reliable software and helping the team move faster.",
      "The variety, the people, and solving problems that actually matter to users.",
      "Reading, cycling, and weekend hackathons."
    );
  const id = info.lastInsertRowid;
  db.prepare("INSERT INTO salary_structures (employee_id, monthly_wage) VALUES (?, ?)").run(id, wage);
  upsertLeaveBalances(id);
  db.prepare("INSERT INTO skills (employee_id, kind, label) VALUES (?, 'skill', ?)").run(id, "Communication");
  db.prepare("INSERT INTO skills (employee_id, kind, label) VALUES (?, 'skill', ?)").run(id, "Problem Solving");
  return id;
}

function seedAttendance(employeeId, days = 14) {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO attendance (employee_id, work_date, check_in, check_out, status) VALUES (?, ?, ?, ?, 'present')"
  );
  const today = new Date();
  for (let i = 1; i <= days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const day = d.getDay();
    if (day === 0 || day === 6) continue; // skip weekends
    const dateStr = d.toISOString().slice(0, 10);
    stmt.run(employeeId, dateStr, "10:00", "19:00");
  }
}

console.log(`Seeding demo data for "${COMPANY_NAME}"...`);

const existingCompany = db.prepare("SELECT id FROM companies WHERE name = ?").get(COMPANY_NAME);
let companyId;
if (existingCompany) {
  companyId = existingCompany.id;
  console.log("Company already exists, reusing it. Delete backend/hrms.sqlite to start fresh.");
} else {
  companyId = db.prepare("INSERT INTO companies (name) VALUES (?)").run(COMPANY_NAME).lastInsertRowid;

  const adminId = createEmployee({
    name: "Aarav Shah",
    email: "admin@odoo.com",
    role: "admin",
    jobPosition: "HR Director",
    department: "People Ops",
    password: "password123",
    wage: 120000,
  });
  seedAttendance(adminId);

  const hrId = createEmployee({
    name: "Priya Nair",
    email: "hr@odoo.com",
    role: "hr",
    jobPosition: "HR Officer",
    department: "People Ops",
    manager: "Aarav Shah",
    password: "password123",
    wage: 70000,
  });
  seedAttendance(hrId);

  const employees = [
    ["Jodo Doshi", "jodo@odoo.com", "Software Engineer", "Engineering", "Aarav Shah", 65000],
    ["Meera Iyer", "meera@odoo.com", "Product Designer", "Design", "Aarav Shah", 60000],
    ["Kabir Mehta", "kabir@odoo.com", "QA Engineer", "Engineering", "Jodo Doshi", 50000],
    ["Sana Sheikh", "sana@odoo.com", "Sales Executive", "Sales", "Priya Nair", 45000],
    ["Rohan Verma", "rohan@odoo.com", "Backend Engineer", "Engineering", "Jodo Doshi", 68000],
  ];
  const ids = [];
  for (const [name, email, jobPosition, department, manager, wage] of employees) {
    const id = createEmployee({ name, email, role: "employee", jobPosition, department, manager, password: "password123", wage });
    seedAttendance(id);
    ids.push(id);
  }

  // A couple of sample time off requests
  db.prepare(
    `INSERT INTO time_off_requests (employee_id, type, start_date, end_date, days, remarks, status)
     VALUES (?, 'Paid Time Off', date('now','+3 day'), date('now','+4 day'), 2, 'Family function', 'pending')`
  ).run(ids[0]);
  db.prepare(
    `INSERT INTO time_off_requests (employee_id, type, start_date, end_date, days, remarks, status, reviewed_by)
     VALUES (?, 'Sick Leave', date('now','-5 day'), date('now','-5 day'), 1, 'Fever', 'approved', ?)`
  ).run(ids[1], adminId);

  console.log("\nDemo accounts (all passwords: password123):");
  console.log("  Admin -> login: admin@odoo.com");
  console.log("  HR    -> login: hr@odoo.com");
  console.log("  Employee -> login: jodo@odoo.com (and meera/kabir/sana/rohan @odoo.com)");
}

console.log("\nDone.");
