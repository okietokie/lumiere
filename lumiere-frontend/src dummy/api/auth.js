import axiosClient from "./axiosClient.js";

export const authApi = {
  signup: (data) => axiosClient.post("/auth/signup", data),
  login: (data) => axiosClient.post("/auth/login", data),
};