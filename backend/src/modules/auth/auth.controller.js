import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import { emitAdminRefresh } from "../../common/utils/realtime.js";

const register = async (req, res) => {
  const user = await authService.register(req.body);
  emitAdminRefresh({ type: "user:registered", userId: user._id, role: user.role });
  ApiResponse.created(res, "Registration success", user);
};

const login = async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  ApiResponse.ok(res, "Login successful", { user, accessToken });
};

const refresh = async (req, res) => {
  const { accessToken } = await authService.refresh(req.cookies?.refreshToken);
  ApiResponse.ok(res, "Access token refreshed", { accessToken });
};

const logout = async (req, res) => {
  await authService.logout(req.user.id);
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
  ApiResponse.ok(res, "Logout Success");
};

const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);
  ApiResponse.ok(res, "User Profile", user);
};

const verifyEmail = async (req, res) => {
  const user = await authService.verifyEmail(req.params.token);
  ApiResponse.ok(res, "Email verified", user);
};

export { register, login, refresh, logout, getMe, verifyEmail };
