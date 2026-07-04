// Uses Node's built-in SQLite module (available in Node 22.5+) so the project
// runs with zero native-build dependencies. It's marked experimental by Node,
// but the SQL surface we use here is stable and simple.
const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "hrms.sqlite"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Small helper so route files can keep using db.transaction(fn)() like better-sqlite3.
db.transaction = (fn) => {
  return (...args) => {
    db.exec("BEGIN");
    try {
      const result = fn(...args);
      db.exec("COMMIT");
      return result;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  };
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  login_id TEXT UNIQUE NOT NULL,       -- e.g. OIJODO20220001
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  personal_email TEXT,
  mobile TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,   -- 'admin' | 'hr' | 'employee'
  job_position TEXT,
  department TEXT,
  manager TEXT,
  location TEXT,
  avatar_url TEXT,
  date_of_birth TEXT,
  residing_address TEXT,
  nationality TEXT,
  gender TEXT,
  marital_status TEXT,
  date_of_joining TEXT DEFAULT (date('now')),
  bank_account_number TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  pan_no TEXT,
  uan_no TEXT,
  emp_code TEXT,
  about TEXT,
  what_i_love TEXT,
  interests TEXT,
  status TEXT NOT NULL DEFAULT 'active',   -- active | inactive
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'skill', -- 'skill' | 'certification'
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS salary_structures (
  employee_id INTEGER PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  monthly_wage REAL NOT NULL DEFAULT 0,
  working_days_per_week REAL DEFAULT 5,
  break_time_hrs REAL DEFAULT 1,
  basic_pct REAL DEFAULT 50,
  hra_pct REAL DEFAULT 50,        -- % of basic
  standard_allowance_pct REAL DEFAULT 16.67,
  performance_bonus_pct REAL DEFAULT 8.33,
  leave_travel_allowance_pct REAL DEFAULT 8.33,
  employee_pf_pct REAL DEFAULT 12,
  employer_pf_pct REAL DEFAULT 12,
  professional_tax REAL DEFAULT 200,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  work_date TEXT NOT NULL,          -- YYYY-MM-DD
  check_in TEXT,                    -- HH:MM
  check_out TEXT,
  status TEXT NOT NULL DEFAULT 'present', -- present | absent | half-day | leave
  UNIQUE(employee_id, work_date)
);

CREATE TABLE IF NOT EXISTS time_off_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,               -- 'Paid Time Off' | 'Sick Leave' | 'Unpaid Leave'
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  days REAL NOT NULL DEFAULT 1,
  remarks TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by INTEGER REFERENCES employees(id),
  review_comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_balances (
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  total_days REAL NOT NULL,
  used_days REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (employee_id, type)
);
`);

module.exports = db;
