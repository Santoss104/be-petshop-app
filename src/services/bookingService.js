const { redis } = require("../utils/redis");
const bookingModel = require("../models/bookingModel");

exports.getBookingById = async (id, res) => {
  const bookingJson = await redis.get(id);

  if (bookingJson) {
    const booking = JSON.parse(bookingJson);
    res.status(201).json({
      success: true,
      booking,
    });
  }
};

exports.getAllBookingsService = async (res) => {
  const bookings = await bookingModel
    .find()
    .populate("user", "name email")
    .populate("doctor", "name specialization")
    .sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    bookings,
  });
};