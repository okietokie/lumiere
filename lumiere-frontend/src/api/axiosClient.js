import axios from "axios";
import { clearAuthSession, getAccessToken } from "../utils/authStorage.js";
import { API_ORIGIN } from "../utils/apiBase.js";

const axiosClient = axios.create({
  baseURL: API_ORIGIN,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const currentPath = window.location.pathname;
    const isAuthRequest = requestUrl.includes("/api/auth/login");
    const isAuthScreen =
      currentPath === "/login" ||
      currentPath === "/register" ||
      currentPath === "/reset-password";

    if (error.response?.status === 401 && !isAuthRequest && !isAuthScreen) {
      clearAuthSession();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
