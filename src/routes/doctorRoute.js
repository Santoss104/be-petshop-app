const express = require("express");
const { isAutheticated } = require("../middlewares/authMiddleware");
const {
  createDoctor,
  searchDoctors,
  getAllDoctors,
  getDoctor,
  updateDoctorProfile,
  updateWorkingHours,
  toggleOnlineStatus,
  deleteDoctor,
} = require("../controllers/doctorController");

const doctorRouter = express.Router();

doctorRouter.get("/", getAllDoctors);
doctorRouter.get("/:id", getDoctor);
doctorRouter.get("/search", searchDoctors);
doctorRouter.post("/create", isAutheticated, createDoctor);
doctorRouter.put("/update/:id", isAutheticated, updateDoctorProfile);
doctorRouter.put(
  "/working-hours/:id",
  isAutheticated,
  updateWorkingHours
);
doctorRouter.put(
  "/toggle-status/:id",
  isAutheticated,
  toggleOnlineStatus
);
doctorRouter.delete("/:id", isAutheticated, deleteDoctor);

module.exports = doctorRouter;