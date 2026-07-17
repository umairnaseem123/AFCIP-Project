const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const FRAUD_API_BASE_URL = import.meta.env.VITE_FRAUD_API_BASE_URL || "/fraud-api";

const STORAGE_KEYS = {
  access: "accessToken",
  refresh: "refreshToken",
  user: "currentUser",
};

function unwrapPayload(payload) {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload;
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.access);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refresh);
}

export function isAuthenticated() {
  return Boolean(getAccessToken() || localStorage.getItem("isAuthenticated") === "true");
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.access);
  localStorage.removeItem(STORAGE_KEYS.refresh);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem("isAuthenticated");
}

export function saveAuth({ accessToken, refreshToken, user }) {
  if (accessToken) localStorage.setItem(STORAGE_KEYS.access, accessToken);
  if (refreshToken) localStorage.setItem(STORAGE_KEYS.refresh, refreshToken);
  if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  localStorage.setItem("isAuthenticated", "true");
}

let refreshPromise = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    })
      .then(async (response) => {
        const payload = await readJson(response);
        if (!response.ok) {
          throw new Error("Refresh failed");
        }
        const newAccess = payload?.access;
        const newRefresh = payload?.refresh;
        if (!newAccess) {
          throw new Error("Refresh response missing access token");
        }
        localStorage.setItem(STORAGE_KEYS.access, newAccess);
        if (newRefresh) {
          localStorage.setItem(STORAGE_KEYS.refresh, newRefresh);
        }
        return newAccess;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}, _retried = false) {
  const token = getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !_retried && getRefreshToken()) {
    try {
      await refreshAccessToken();
      return apiRequest(path, options, true);
    } catch {
      clearAuth();
      throw new Error("Session expired. Please log in again.");
    }
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.detail ||
      (typeof payload === "string" ? payload : null) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return unwrapPayload(payload);
}

export async function login(email, password) {
  const payload = await apiRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveAuth({
    accessToken: payload?.access_token,
    refreshToken: payload?.refresh_token,
    user: payload?.user,
  });
  return payload;
}

export function logout() {
  clearAuth();
}

export function getTransactions() {
  return apiRequest("/transactions/?ordering=-created_at");
}

export function createTransaction({
  transactionType,
  amount,
  description,
  location,
  deviceType,
  isNewLocation,
}) {
  return apiRequest("/transactions/", {
    method: "POST",
    body: JSON.stringify({
      transaction_type: transactionType,
      amount,
      description,
      ...(location && { location }),
      ...(deviceType && { device_type: deviceType }),
      ...(isNewLocation !== undefined && { is_new_location: isNewLocation }),
    }),
  });
}

export async function analyzeTransaction({
  accountNo,
  amount,
  location,
  transactionCount,
  transactionType,
  deviceType,
  isNewLocation,
}) {
  const response = await fetch(`${FRAUD_API_BASE_URL}/analyze-transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_no: accountNo,
      amount,
      location,
      transaction_count: transactionCount,
      transaction_type: transactionType,
      device_type: deviceType,
      is_new_location: isNewLocation,
    }),
  });

  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      payload?.detail || "Fraud analysis service is unavailable.";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }

  return payload;
}

export function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export function getCases() {
  return apiRequest("/cases/?ordering=-created_at");
}

export function createCase({ title, account, priority }) {
  return apiRequest("/cases/", {
    method: "POST",
    body: JSON.stringify({ title, account, priority }),
  });
}

export function updateCaseStatus(caseId, status) {
  return apiRequest(`/cases/${caseId}/`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function addCaseNote(caseId, note) {
  return apiRequest(`/cases/${caseId}/add_note/`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}
