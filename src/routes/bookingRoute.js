const express = require("express");
const { isAutheticated } = require("../middlewares/authMiddleware");
const {
  createBooking,
  getUserBookings,
  getDoctorBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
  getUpcomingAppointments,
  confirmBookingCompleted,
} = require("../controllers/bookingController");

const bookingRouter = express.Router();

bookingRouter.post("/create", isAutheticated, createBooking);
bookingRouter.get("/user", isAutheticated, getUserBookings);
bookingRouter.get("/doctor/:doctorId", isAutheticated, getDoctorBookings);
bookingRouter.get("/:id", isAutheticated, getBooking);
bookingRouter.put("/cancel/:id", isAutheticated, cancelBooking);
bookingRouter.get("/all", isAutheticated, getAllBookings);
bookingRouter.get("/upcoming", isAutheticated, getUpcomingAppointments);
bookingRouter.put("/confirm/:id", isAutheticated, confirmBookingCompleted);

module.exports = bookingRouter;