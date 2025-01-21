const bookingModel = require("../models/bookingModel");
const doctorModel = require("../models/doctorModel");
const paymentModel = require("../models/paymentModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const { redis } = require("../utils/redis");
const {
  getBookingById,
  getAllBookingsService,
} = require("../services/bookingService");

const createBooking = CatchAsyncError(async (req, res, next) => {
  try {
    const { doctorId, appointmentDate, appointmentTime, consultationType } =
      req.body;

    if (
      !doctorId ||
      !appointmentDate ||
      !appointmentTime ||
      !consultationType
    ) {
      return next(new ErrorHandler("Please enter all required fields", 400));
    }

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return next(new ErrorHandler("Doctor not found", 404));
    }

    if (!["video", "chat"].includes(consultationType)) {
      return next(new ErrorHandler("Invalid consultation type", 400));
    }

    if (!doctor.isAvailable(appointmentDate, appointmentTime)) {
      return next(
        new ErrorHandler("Doctor is not available at this time", 400)
      );
    }

    const subtotal = doctor.consultationFee;
    const adminFee = 1000;
    const total = subtotal + adminFee;

    let booking = await bookingModel.create({
      user: req.user._id,
      doctor: doctorId,
      appointmentDate,
      appointmentTime,
      consultationType,
      subtotal,
      adminFee,
      total,
      status: "pending",
    });

    doctor.totalPatients += 1;
    await doctor.save();

    await redis.set(booking._id, JSON.stringify(booking));

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getUserBookings = CatchAsyncError(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userBookings = await bookingModel
      .find({ user: userId })
      .populate("doctor", "name specialization avatar")
      .populate("payment", "status paymentMethod")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      bookings: userBookings,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getDoctorBookings = CatchAsyncError(async (req, res, next) => {
  try {
    const doctorId = req.params.doctorId;
    const doctorBookings = await bookingModel
      .find({ doctor: doctorId })
      .populate("user", "name avatar")
      .populate("payment", "status paymentMethod")
      .sort("-appointmentDate");

    res.status(200).json({
      success: true,
      bookings: doctorBookings,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getBooking = CatchAsyncError(async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    await getBookingById(bookingId, req.user, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const cancelBooking = CatchAsyncError(async (req, res, next) => {
  try {
    const booking = await bookingModel.findById(req.params.id);
    if (!booking) {
      return next(new ErrorHandler("Booking not found", 404));
    }

    if (booking.status === "completed" || booking.status === "cancelled") {
      return next(new ErrorHandler("Booking cannot be cancelled", 400));
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return next(
        new ErrorHandler("Not authorized to cancel this booking", 403)
      );
    }

    if (booking.payment) {
      const payment = await paymentModel.findById(booking.payment);
      if (payment && payment.status === "pending") {
        payment.status = "cancelled";
        await payment.save();
        await redis.set(`payment:${payment._id}`, JSON.stringify(payment));
      }
    }

    booking.status = "cancelled";
    await booking.save();
    await redis.set(booking._id, JSON.stringify(booking));

    res.status(200).json({
      success: true,
      message: "Booking and payment cancelled successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getAllBookings = CatchAsyncError(async (req, res, next) => {
  try {
    await getAllBookingsService(req.user, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getUpcomingAppointments = CatchAsyncError(async (req, res, next) => {
  try {
    const now = new Date();
    const upcoming = await bookingModel
      .find({
        user: req.user._id,
        appointmentDate: { $gte: now },
        status: { $nin: ["cancelled", "completed"] },
      })
      .populate("doctor", "name specialization avatar")
      .populate("payment", "status paymentMethod")
      .sort("appointmentDate");

    res.status(200).json({
      success: true,
      appointments: upcoming,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const confirmBookingCompleted = CatchAsyncError(async (req, res, next) => {
  try {
    const booking = await bookingModel.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!booking) {
      return next(new ErrorHandler("Booking not found", 404));
    }

    if (booking.status !== "processing") {
      return next(
        new ErrorHandler("Booking cannot be completed at this time", 400)
      );
    }

    booking.status = "completed";
    await booking.save();

    await redis.set(booking._id, JSON.stringify(booking));

    res.status(200).json({
      success: true,
      message: "Booking completed successfully",
      bookingStatus: booking.status,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  createBooking,
  getUserBookings,
  getDoctorBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
  getUpcomingAppointments,
  confirmBookingCompleted,
};