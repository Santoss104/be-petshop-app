const { redis } = require("../utils/redis");
const doctorModel = require("../models/doctorModel");

exports.getDoctorById = async (id, res) => {
  const doctorJson = await redis.get(id);

  if (doctorJson) {
    const doctor = JSON.parse(doctorJson);
    res.status(201).json({
      success: true,
      doctor,
    });
  }
};

exports.getAllDoctorsService = async (res) => {
  const doctors = await doctorModel.find().sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    doctors,
  });
};