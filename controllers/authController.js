const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const Lesson = require("../models/Lesson");

const register = async (req, res) => {
  try {
    const { name, email, phone, school, alYear, district, password } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !school ||
      !alYear ||
      !district ||
      !password
    ) {
      return res.status(400).json({
        message: "Please fill all required fields",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      school,
      alYear,
      district,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Student account created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "Your account has been disabled",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "-password -resetPasswordToken -resetPasswordExpires",
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        school: user.school,
        alYear: user.alYear,
        district: user.district,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Please enter your email address",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    // Don't reveal whether an email exists
    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token before storing it
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;

    // Token valid for 15 minutes
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Doctor Sir's Biology" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Password - Doctor Sir's Biology",
      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 30px;
          background: #022c22;
          color: white;
          border-radius: 12px;
        ">

          <h2 style="color: #a3e635;">
            Password Reset
          </h2>

          <p>
            Hello ${user.name},
          </p>

          <p>
            We received a request to reset your password
            for your Doctor Sir's Biology student account.
          </p>

          <p>
            Click the button below to create a new password.
          </p>

          <a
            href="${resetURL}"
            style="
              display: inline-block;
              padding: 14px 25px;
              background: #84cc16;
              color: #022c22;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
            "
          >
            Reset Password
          </a>

          <p style="margin-top: 25px; color: #9ca3af;">
            This link will expire in 15 minutes.
          </p>

          <p style="color: #9ca3af;">
            If you didn't request this password reset,
            you can safely ignore this email.
          </p>

        </div>
      `,
    });

    res.status(200).json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "Please enter a new password",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    // Hash token from URL
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or has expired",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    user.password = hashedPassword;

    // Invalidate reset token
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      message: "Something went wrong. Please try again later.",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { search, role, alYear, district, school, isActive } = req.query;

    const filter = {};

    // Search by name, email, or phone
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by role
    if (role) {
      filter.role = role;
    }

    // Filter by A/L year
    if (alYear) {
      filter.alYear = alYear;
    }

    // Filter by district
    if (district) {
      filter.district = district;
    }

    // Filter by school
    if (school) {
      filter.school = school;
    }

    // Filter by account status
    if (isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const users = await User.find(filter)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .sort({ createdAt: -1 });

    res.status(200).json({
      users,
      totalUsers: users.length,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select("name email phone");

    if (!user) {
      return res.status(404).json({
        message: "No user found with this email",
      });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Get user by email error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getALYears = async (req, res) => {
  try {
    const years = await User.distinct("alYear", {
      role: "student",
      alYear: { $exists: true, $ne: "" },
    });

    const sortedYears = years
      .filter(Boolean)
      .sort((a, b) => Number(a) - Number(b));

    res.status(200).json({
      years: sortedYears,
    });
  } catch (error) {
    console.error("Get A/L years error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getUserFilterOptions = async (req, res) => {
  try {
    const [years, districts, schools] = await Promise.all([
      User.distinct("alYear", {
        role: "student",
        alYear: { $exists: true, $ne: "" },
      }),

      User.distinct("district", {
        role: "student",
        district: { $exists: true, $ne: "" },
      }),

      User.distinct("school", {
        role: "student",
        school: { $exists: true, $ne: "" },
      }),
    ]);

    res.status(200).json({
      years: years.filter(Boolean).sort((a, b) => Number(a) - Number(b)),

      districts: districts.filter(Boolean).sort(),

      schools: schools.filter(Boolean).sort(),
    });
  } catch (error) {
    console.error("Get user filter options error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Optional: prevent deleting another admin
    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin users cannot be deleted",
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getAdminDashboardStats = async (req, res) => {
  try {
    const [
      totalStudents,
      freeLessons,
      premiumLessons,
      studentsByDistrict,
      studentsBySchool,
    ] = await Promise.all([
      // Total students
      User.countDocuments({
        role: "student",
      }),

      // Free lessons
      Lesson.countDocuments({
        accessType: "free",
      }),

      // Premium lessons
      Lesson.countDocuments({
        accessType: "premium",
      }),

      // Students by district
      User.aggregate([
        {
          $match: {
            role: "student",
            district: {
              $exists: true,
              $ne: "",
            },
          },
        },
        {
          $group: {
            _id: "$district",
            students: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            students: -1,
          },
        },
      ]),

      // Students by school
      User.aggregate([
        {
          $match: {
            role: "student",
            school: {
              $exists: true,
              $ne: "",
            },
          },
        },
        {
          $group: {
            _id: "$school",
            students: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            students: -1,
          },
        },
      ]),
    ]);

    res.status(200).json({
      stats: {
        totalStudents,
        freeLessons,
        premiumLessons,
        studentsByDistrict,
        studentsBySchool,
      },
    });
  } catch (error) {
    console.error("Get admin dashboard stats error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const changeEmail = async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;

    if (!newEmail || !currentPassword) {
      return res.status(400).json({
        message: "New email and current password are required",
      });
    }

    const email = newEmail.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // Get logged-in user
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    // Check if new email is same as current email
    if (user.email.toLowerCase() === email) {
      return res.status(400).json({
        message: "This is already your current email",
      });
    }

    // Check whether email is already being used
    const existingUser = await User.findOne({
      email,
      _id: { $ne: user._id },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email address is already in use",
      });
    }

    // Update email
    user.email = email;

    await user.save();

    res.status(200).json({
      message: "Email changed successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Change email error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    // Get logged-in user
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    // Prevent using same password
    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        message: "New password must be different from your current password",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    user.password = hashedPassword;

    await user.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
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
};
