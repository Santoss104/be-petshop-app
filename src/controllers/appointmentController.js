const petModel = require("../models/petModel");
const appointmentModel = require("../models/appointmentModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const { redis } = require("../utils/redis");

const createAppointment = CatchAsyncError(async (req, res, next) => {
  try {
    const { petId, appointmentDate } = req.body;

    const pet = await petModel.findById(petId);
    if (!pet) {
      return next(new ErrorHandler("Pet not found", 404));
    }

    if (pet.status !== "Available") {
      return next(new ErrorHandler("Pet is not available for adoption", 400));
    }

    const appointment = await appointmentModel.create({
      pet: petId,
      user: req.user._id,
      appointmentDate,
    });

    pet.status = "Pending";
    await pet.save();
    await redis.set(pet._id, JSON.stringify(pet));

    res.status(201).json({
      success: true,
      message: "Appointment created successfully",
      appointment,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = { createAppointment };