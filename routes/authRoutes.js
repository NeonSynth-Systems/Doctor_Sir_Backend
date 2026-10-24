const express = require("express");

const {
  register,
  login,
  getCurrentUser,
  logout,
  forgotPassword,
  resetPassword,
  getAllUsers,
  getUserByEmail,
  getALYears,
  getUserFilterOptions,
  deleteUser,
  getAdminDashboardStats,
  changeEmail,
  changePassword,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

router.post("/logout", logout);

router.get("/me", protect, getCurrentUser);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password/:token",resetPassword);

router.get("/users", protect, adminOnly, getAllUsers);

router.get("/user-by-email", protect, adminOnly, getUserByEmail);

router.get("/al-years", protect, adminOnly, getALYears);

router.get(
  "/filter-options", protect, adminOnly, getUserFilterOptions);

router.delete( "/users/:id", protect, adminOnly, deleteUser);

router.get(
  "/dashboard-stats", protect, adminOnly, getAdminDashboardStats);

  router.put(
  "/change-email",
  protect,
  changeEmail
);

router.put(
  "/change-password",
  protect,
  changePassword
);

module.exports = router;