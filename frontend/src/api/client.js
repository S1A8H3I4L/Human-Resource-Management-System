const BASE_URL = "/api";

function getToken() {
  return sessionStorage.getItem("hrms_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let requestBody = undefined;

  if (body instanceof FormData) {
    requestBody = body;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: requestBody,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }

  return data;
}
export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),
  changePassword: (payload) => request("/auth/change-password", { method: "POST", body: payload }),

  listEmployees: () => request("/employees"),
  getEmployee: (id) => request(`/employees/${id}`),
  createEmployee: (payload) => request("/employees", { method: "POST", body: payload }),
  updateEmployee: (id, payload) => request(`/employees/${id}`, { method: "PATCH", body: payload }),
  updateSkills: (id, payload) => request(`/employees/${id}/skills`, { method: "PUT", body: payload }),

  checkIn: () => request("/attendance/check-in", { method: "POST" }),
  checkOut: () => request("/attendance/check-out", { method: "POST" }),
  myAttendance: (month) => request(`/attendance/me?month=${month}`),
  teamAttendance: (date) => request(`/attendance/team?date=${date}`),

  myTimeOff: () => request("/timeoff/me"),
  teamTimeOff: () => request("/timeoff/team"),
  leaveBalances: () => request("/timeoff/balances"),
  applyTimeOff: (payload) =>
    request("/timeoff", {
        method: "POST",
        body: payload,
    }),
  reviewTimeOff: (id, payload) => request(`/timeoff/${id}/review`, { method: "PATCH", body: payload }),

  getSalary: (employeeId) => request(`/salary/${employeeId}`),
  updateSalary: (employeeId, payload) => request(`/salary/${employeeId}`, { method: "PUT", body: payload }),
};

export function saveToken(token) {
  sessionStorage.setItem("hrms_token", token);
}
export function clearToken() {
  sessionStorage.removeItem("hrms_token");
}
export { getToken };
