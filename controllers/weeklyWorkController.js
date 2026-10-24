const WeeklyWork = require("../models/WeeklyWork");

const createWeeklyWork = async (req, res) => {
  try {
    const {
      week,
      title,
      description,
      weekStart,
      weekEnd,
    } = req.body;

    if (!week || !title || !description || !weekStart || !weekEnd) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const weeklyWork = await WeeklyWork.create({
      week,
      title,
      description,
      weekStart,
      weekEnd,
    });

    res.status(201).json({
      message: "Weekly work added successfully",
      weeklyWork,
    });
  } catch (error) {
    console.error("Create weekly work error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const getWeeklyWorks = async (req, res) => {
  try {
    const weeklyWorks = await WeeklyWork.find()
      .sort({ weekStart: -1, createdAt: -1 });

    res.status(200).json({
      weeklyWorks,
    });
  } catch (error) {
    console.error("Get weekly works error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const deleteWeeklyWork = async (req, res) => {
  try {
    const { id } = req.params;

    const weeklyWork = await WeeklyWork.findById(id);

    if (!weeklyWork) {
      return res.status(404).json({
        message: "Weekly work not found",
      });
    }

    await WeeklyWork.findByIdAndDelete(id);

    res.status(200).json({
      message: "Weekly work deleted successfully",
    });
  } catch (error) {
    console.error("Delete weekly work error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

const updateWeeklyWork = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      week,
      title,
      description,
      weekStart,
      weekEnd,
    } = req.body;

    if (
      !week ||
      !title ||
      !description ||
      !weekStart ||
      !weekEnd
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const weeklyWork = await WeeklyWork.findByIdAndUpdate(
      id,
      {
        week,
        title,
        description,
        weekStart,
        weekEnd,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!weeklyWork) {
      return res.status(404).json({
        message: "Weekly work not found",
      });
    }

    res.status(200).json({
      message: "Weekly work updated successfully",
      weeklyWork,
    });
  } catch (error) {
    console.error("Update weekly work error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  createWeeklyWork,
  getWeeklyWorks,
  deleteWeeklyWork,
  updateWeeklyWork,
};