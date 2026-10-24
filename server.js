
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const apiLimiter = require("./middleware/rateLimiter");
const lessonRoutes = require("./routes/lessonRoutes");
const weeklyWorkRoutes = require("./routes/weeklyWorkRoutes");

dotenv.config();

const app = express();

// Middleware
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
    })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Health check for Render
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Doctor Sir LMS API is running",
    });
});

app.get("/", (req, res) => {
    res.json({
        message: "Doctor Sir LMS API is running",
    });
});

// API rate limiting
app.use("/api", apiLimiter);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/weekly-works", weeklyWorkRoutes);

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to database:", error);
        process.exit(1);
    }
}

startServer();
