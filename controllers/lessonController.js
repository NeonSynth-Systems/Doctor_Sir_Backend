const Lesson = require("../models/Lesson");
const User = require("../models/User");
const LessonAccess = require("../models/LessonAccess");

const createLesson = async (req, res) => {
  try {
    const {
      name,
      description,
      imageUrl,
      accessType,
      price,
      videoUrl,
      code,
      pdfs,
      published,
    } = req.body;

    // Check required fields
    if (!name || !description || !videoUrl || !code) {
      return res.status(400).json({
        message: "Please provide all required fields.",
      });
    }

    // Check duplicate lesson code
    const existingLesson = await Lesson.findOne({
      code: code.toUpperCase(),
    });

    if (existingLesson) {
      return res.status(409).json({
        message: "A lesson with this code already exists.",
      });
    }

    const lesson = await Lesson.create({
      name,
      description,
      imageUrl,
      accessType: accessType || "free",
      price: price ?? 0,
      videoUrl,
      code: code.toUpperCase(),
      pdfs: pdfs || [],
      published: published !== undefined ? published : true,
    });

    return res.status(201).json({
      message: "Lesson created successfully.",
      lesson,
    });
  } catch (error) {
    console.error("Create lesson error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

const giveLessonAccess = async (req, res) => {
  try {
    const { email, lessonCode } = req.body;

    // Validate input
    if (!email?.trim() || !lessonCode?.trim()) {
      return res.status(400).json({
        message: "Student email and lesson code are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedLessonCode = lessonCode.toUpperCase().trim();

    // Find student
    const student = await User.findOne({
      email: normalizedEmail,
    });

    if (!student) {
      return res.status(404).json({
        message: "Student with this email was not found.",
      });
    }

    // Make sure the account is a student
    if (student.role !== "student") {
      return res.status(400).json({
        message: "This email does not belong to a student account.",
      });
    }

    // Find lesson
    const lesson = await Lesson.findOne({
      code: normalizedLessonCode,
    });

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson with this code was not found.",
      });
    }

    // Free lessons don't need manual assignment
    if (lesson.accessType !== "premium") {
      return res.status(400).json({
        message:
          "This is a free lesson. Manual access is not required.",
      });
    }

    // Check existing access
    const existingAccess = await LessonAccess.findOne({
      student: student._id,
      lesson: lesson._id,
    });

    // Already active
    if (existingAccess?.status === "active") {
      return res.status(409).json({
        message: "This student already has access to this lesson.",
      });
    }

    // Previously revoked → restore access
    if (existingAccess) {
      existingAccess.status = "active";
      existingAccess.assignedBy = req.userId;
      existingAccess.assignedAt = new Date();

      await existingAccess.save();

      return res.status(200).json({
        message: "Lesson access restored successfully.",
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          phone: student.phone,
        },
        lesson: {
          id: lesson._id,
          name: lesson.name,
          code: lesson.code,
        },
      });
    }

    // Create new access
    const access = await LessonAccess.create({
      student: student._id,
      lesson: lesson._id,
      assignedBy: req.userId,
      status: "active",
    });

    return res.status(201).json({
      message: "Lesson access granted successfully.",
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
      lesson: {
        id: lesson._id,
        name: lesson.name,
        code: lesson.code,
      },
      access: {
        id: access._id,
        status: access.status,
        assignedAt: access.assignedAt,
      },
    });
  } catch (error) {
    console.error("Give lesson access error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

const getLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find().sort({ createdAt: -1 });

    return res.status(200).json({
      lessons,
    });
  } catch (error) {
    console.error("Get lessons error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

const getLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    // Admin can access every lesson
    const user = await User.findById(req.userId).select("role");

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    // Admin bypasses premium access check
    if (user.role === "admin") {
      return res.status(200).json({
        lesson,
      });
    }

    // Free lessons are accessible to students
    if (lesson.accessType === "free") {
      return res.status(200).json({
        lesson,
      });
    }

    // Premium student access
    const access = await LessonAccess.findOne({
      student: req.userId,
      lesson: lesson._id,
      status: "active",
    });

    if (!access) {
      return res.status(403).json({
        message: "You do not have access to this premium lesson.",
      });
    }

    return res.status(200).json({
      lesson,
    });
  } catch (error) {
    console.error("Get lesson error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};
const updateLesson = async (req, res) => {
  try {
    const {
      name,
      description,
      imageUrl,
      accessType,
      price,
      videoUrl,
      code,
      published,
      pdfs,
    } = req.body;

    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    // Check duplicate code if code is being changed
    if (code && code.toUpperCase() !== lesson.code) {
      const existingLesson = await Lesson.findOne({
        code: code.toUpperCase(),
        _id: { $ne: lesson._id },
      });

      if (existingLesson) {
        return res.status(409).json({
          message: "Another lesson already uses this code.",
        });
      }
    }

    // Update lesson details
    lesson.name = name ?? lesson.name;
    lesson.description = description ?? lesson.description;
    lesson.imageUrl = imageUrl ?? lesson.imageUrl;
    lesson.accessType = accessType ?? lesson.accessType;
    lesson.price = price ?? lesson.price;
    lesson.videoUrl = videoUrl ?? lesson.videoUrl;

    if (code) {
      lesson.code = code.toUpperCase();
    }

    if (published !== undefined) {
      lesson.published = published;
    }

    // Update PDFs
    if (pdfs !== undefined) {
      lesson.pdfs = pdfs;
    }

    await lesson.save();

    return res.status(200).json({
      message: "Lesson updated successfully.",
      lesson,
    });
  } catch (error) {
    console.error("Update lesson error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    await lesson.deleteOne();

    return res.status(200).json({
      message: "Lesson deleted successfully.",
    });
  } catch (error) {
    console.error("Delete lesson error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

const getStudentLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find({
      published: true,
    }).sort({ createdAt: -1 });

    const accesses = await LessonAccess.find({
      student: req.userId,
      status: "active",
    }).select("lesson");

    const accessSet = new Set(
      accesses.map((access) => access.lesson.toString()),
    );

    const formattedLessons = lessons.map((lesson) => ({
      _id: lesson._id,
      name: lesson.name,
      description: lesson.description,
      imageUrl: lesson.imageUrl,
      accessType: lesson.accessType,
      price: lesson.price,
      code: lesson.code,

      hasAccess:
        lesson.accessType === "free" || accessSet.has(lesson._id.toString()),
    }));

    // Count lessons
    const freeLessonsCount = lessons.filter(
      (lesson) => lesson.accessType === "free",
    ).length;

    const premiumLessonsCount = lessons.filter(
      (lesson) => lesson.accessType === "premium",
    ).length;

    return res.status(200).json({
      lessons: formattedLessons,
      counts: {
        free: freeLessonsCount,
        premium: premiumLessonsCount,
        total: lessons.length,
      },
    });
  } catch (error) {
    console.error("Get student lessons error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

const addPdfToLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { name, url } = req.body;

    if (!name || !url) {
      return res.status(400).json({
        message: "PDF name and URL are required.",
      });
    }

    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found.",
      });
    }

    lesson.pdfs.push({
      name: name.trim(),
      url: url.trim(),
    });

    await lesson.save();

    return res.status(201).json({
      message: "PDF added successfully.",
      lesson,
    });
  } catch (error) {
    console.error("Add PDF error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

module.exports = {
  createLesson,
  getLessons,
  getLesson,
  updateLesson,
  deleteLesson,
  getStudentLessons,
  giveLessonAccess,
  addPdfToLesson,
};
