import axios from "axios";

export const API = "http://localhost:3001/api";

export function getToken() {
  return localStorage.getItem("farm_token");
}

export function getUser() {
  const raw = localStorage.getItem("farm_user");
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(token, name, email) {
  localStorage.setItem("farm_token", token);
  localStorage.setItem("farm_user", JSON.stringify({ name, email }));
}

export function clearSession() {
  localStorage.removeItem("farm_token");
  localStorage.removeItem("farm_user");
}

export function isLoggedIn() {
  return !!getToken();
}

// Attach token to every axios request automatically
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401 (only for non-login requests)
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes("/auth/login");
    if (err.response?.status === 401 && !isLoginRequest) {
      clearSession();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
