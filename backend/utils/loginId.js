const db = require("../db");

/**
 * Login ID format: [Company initials][First 2 letters of first+last name][Year of joining][Serial no for that year]
 * Example: OIJODO20220001  ->  OI (Odoo India) + JO (Jo..) + DO (Do..) + 2022 + 0001
 * We take the first two letters of first name + first two letters of last name.
 */
function companyInitials(companyName) {
  return companyName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
    .padEnd(2, "X");
}

function nameInitials(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] || "XX";
  const last = parts[parts.length - 1] || first;
  return (first.slice(0, 2) + last.slice(0, 2)).toUpperCase();
}

function generateLoginId(companyName, fullName, joinDate = new Date()) {
  const year = joinDate.getFullYear();
  const prefix = companyInitials(companyName) + nameInitials(fullName) + year;

  const row = db
    .prepare(`SELECT login_id FROM employees WHERE login_id LIKE ? ORDER BY login_id DESC LIMIT 1`)
    .get(`${prefix}%`);

  let serial = 1;
  if (row) {
    const lastSerial = parseInt(row.login_id.slice(prefix.length), 10);
    serial = (isNaN(lastSerial) ? 0 : lastSerial) + 1;
  }
  const serialStr = String(serial).padStart(4, "0");
  return `${prefix}${serialStr}`;
}

module.exports = { generateLoginId };
