require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

require("./db");

const { router: authRouter } = require("./routes/auth");
const employeesRouter = require("./routes/employees");
const attendanceRouter = require("./routes/attendance");
const timeoffRouter = require("./routes/timeoff");
const salaryRouter = require("./routes/salary");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use(morgan("dev"));

app.get("/api/health", (req, res) =>
  res.json({ ok: true, service: "hrms-backend" })
);

app.use("/api/auth", authRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/timeoff", timeoffRouter);
app.use("/api/salary", salaryRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`HRMS API listening on http://localhost:${PORT}`);
});