const express = require("express");
const { isAutheticated } = require("../middlewares/authMiddleware");
const { createAppointment } = require("../controllers/appointmentController");

const appointmentRouter = express.Router();

appointmentRouter.post("/create", isAutheticated, createAppointment);

module.exports = appointmentRouter;