const express = require("express");

const {
  createLesson,
  getLessons,
  getLesson,
  updateLesson,
  deleteLesson,
  getStudentLessons,
  giveLessonAccess,
  addPdfToLesson,
} = require("../controllers/lessonController");

const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

const router = express.Router();


// GET ALL LESSONS
router.get("/", protect, getLessons);

router.get(
  "/student",
  protect,
  getStudentLessons
);

router.post(
  "/give-access",
  protect,
  adminOnly,
  giveLessonAccess
);


// GET ONE LESSON
router.get("/:id", protect, getLesson);


// CREATE LESSON - ADMIN
router.post(
  "/",
  protect,
  adminOnly,
  createLesson
);


// UPDATE LESSON - ADMIN
router.put(
  "/:id",
  protect,
  adminOnly,
  updateLesson
);


// DELETE LESSON - ADMIN
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteLesson
);


module.exports = router;