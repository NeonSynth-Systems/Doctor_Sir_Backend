const express = require("express");

const router = express.Router();

const {
  createWeeklyWork,
  getWeeklyWorks,
  deleteWeeklyWork,
  updateWeeklyWork,
} = require("../controllers/weeklyWorkController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

router.post(
  "/",
  protect,
  adminOnly,
  createWeeklyWork
);

router.get(
  "/",
  protect,
  adminOnly,
  getWeeklyWorks
);

router.put(
  "/:id",
  protect,
  adminOnly,
  updateWeeklyWork
);

router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteWeeklyWork
);

module.exports = router;