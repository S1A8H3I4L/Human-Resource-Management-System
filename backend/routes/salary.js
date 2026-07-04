const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

function computeComponents(s) {
  const wage = s.monthly_wage;
  const basic = wage * (s.basic_pct / 100);
  const hra = basic * (s.hra_pct / 100);
  const standardAllowance = wage * (s.standard_allowance_pct / 100);
  const performanceBonus = wage * (s.performance_bonus_pct / 100);
  const leaveTravelAllowance = wage * (s.leave_travel_allowance_pct / 100);
  const definedTotal = basic + hra + standardAllowance + performanceBonus + leaveTravelAllowance;
  const fixedAllowance = Math.max(0, wage - definedTotal);

  return {
    monthlyWage: wage,
    yearlyWage: wage * 12,
    workingDaysPerWeek: s.working_days_per_week,
    breakTimeHrs: s.break_time_hrs,
    components: {
      basic: { amount: round2(basic), pct: s.basic_pct },
      hra: { amount: round2(hra), pct: s.hra_pct },
      standardAllowance: { amount: round2(standardAllowance), pct: s.standard_allowance_pct },
      performanceBonus: { amount: round2(performanceBonus), pct: s.performance_bonus_pct },
      leaveTravelAllowance: { amount: round2(leaveTravelAllowance), pct: s.leave_travel_allowance_pct },
      fixedAllowance: { amount: round2(fixedAllowance), pct: round2((fixedAllowance / (wage || 1)) * 100) },
    },
    providentFund: {
      employee: { amount: round2(basic * (s.employee_pf_pct / 100)), pct: s.employee_pf_pct },
      employer: { amount: round2(basic * (s.employer_pf_pct / 100)), pct: s.employer_pf_pct },
    },
    taxDeductions: { professionalTax: s.professional_tax },
  };
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

// GET /api/salary/:employeeId -> Admin/HR only (per spec, tab only visible to admin)
router.get("/:employeeId", requireRole("admin", "hr"), (req, res) => {
  const s = db.prepare("SELECT * FROM salary_structures WHERE employee_id = ?").get(req.params.employeeId);
  if (!s) return res.status(404).json({ error: "Salary structure not found" });
  res.json(computeComponents(s));
});

// PUT /api/salary/:employeeId -> Admin updates wage / percentages; components recompute automatically
router.put("/:employeeId", requireRole("admin", "hr"), (req, res) => {
  const allowed = [
    "monthly_wage",
    "working_days_per_week",
    "break_time_hrs",
    "basic_pct",
    "hra_pct",
    "standard_allowance_pct",
    "performance_bonus_pct",
    "leave_travel_allowance_pct",
    "employee_pf_pct",
    "employer_pf_pct",
    "professional_tax",
  ];
  const updates = [];
  const values = [];
  for (const [key, value] of Object.entries(req.body)) {
    const column = key.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
    if (allowed.includes(column)) {
      updates.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (!updates.length) return res.status(400).json({ error: "No valid salary fields provided" });
  values.push(req.params.employeeId);
  db.prepare(`UPDATE salary_structures SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?`).run(
    ...values
  );

  const s = db.prepare("SELECT * FROM salary_structures WHERE employee_id = ?").get(req.params.employeeId);
  res.json(computeComponents(s));
});

module.exports = router;
