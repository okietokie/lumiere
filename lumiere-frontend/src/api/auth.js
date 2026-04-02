import axiosClient from "./axiosClient.js";

export const authApi = {
  signup: (data) => axiosClient.post("/api/auth/register", data),
  login: (data) => axiosClient.post("/api/auth/login", data),
  forgotPassword: (data) => axiosClient.post("/api/auth/forgot-password", data),
  resetPassword: (data) => axiosClient.post("/api/auth/reset-password-confirm", data),
};