const doctorModel = require("../models/doctorModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const cloudinary = require("cloudinary");
const { redis } = require("../utils/redis");
const {
  getDoctorById,
  getAllDoctorsService,
} = require("../services/doctorService");

// Create doctor
const createDoctor = CatchAsyncError(async (req, res, next) => {
  try {
    const {
      name,
      specialization,
      biography,
      consultationFee,
      applicationFee,
      workingHours,
      avatar,
    } = req.body;

    if (
      !name ||
      !specialization ||
      !biography ||
      !consultationFee ||
      !applicationFee
    ) {
      return next(new ErrorHandler("Please enter all required fields", 400));
    }

    // Validate workingHours if provided
    if (workingHours) {
      const validDays = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const isValidSchedule = workingHours.every((schedule) => {
        return (
          validDays.includes(schedule.day) &&
          schedule.startTime &&
          schedule.endTime &&
          new Date(`1970-01-01T${schedule.startTime}`) <
            new Date(`1970-01-01T${schedule.endTime}`)
        );
      });

      if (!isValidSchedule) {
        return next(new ErrorHandler("Invalid working hours format", 400));
      }
    }

    // Upload avatar if provided
    let avatarData = {};
    if (avatar) {
      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "doctors",
        width: 150,
        crop: "scale",
      });

      avatarData = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }

    const doctorData = {
      name,
      specialization,
      biography,
      consultationFee,
      applicationFee,
      workingHours: workingHours || [],
      avatar: avatarData,
      rating: 0,
      totalRatings: 0,
      totalViews: 0,
      totalPatients: 0,
      isOnline: false,
      isVerified: false,
    };

    const doctor = await doctorModel.create(doctorData);
    await redis.set(doctor._id, JSON.stringify(doctor));

    res.status(201).json({
      success: true,
      message: "Doctor profile created successfully",
      doctor: {
        name: doctor.name,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFee,
        applicationFee: doctor.applicationFee,
        workingHours: doctor.workingHours,
        avatar: doctor.avatar,
      },
    });
  } catch (error) {
    if (avatarData?.public_id) {
      await cloudinary.v2.uploader.destroy(avatarData.public_id);
    }
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get All Doctors - Public route, no token needed
const getAllDoctors = CatchAsyncError(async (req, res, next) => {
  try {
    const {
      specialization,
      rating,
      isVerified,
      isOnline,
      sort = "createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    const queryObject = {};

    if (specialization) {
      queryObject.specialization = specialization;
    }
    if (rating) {
      queryObject.rating = { $gte: parseFloat(rating) };
    }
    if (isVerified !== undefined) {
      queryObject.isVerified = isVerified === "true";
    }
    if (isOnline !== undefined) {
      queryObject.isOnline = isOnline === "true";
    }

    const sortOrder = sort.startsWith("-") ? -1 : 1;
    const sortField = sort.replace("-", "");
    const sortOptions = { [sortField]: sortOrder };

    const skip = (page - 1) * limit;

    await getAllDoctorsService(res, queryObject, sortOptions, skip, limit);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get Single Doctor - Public route, no token needed
const getDoctor = CatchAsyncError(async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    await getDoctorById(doctorId, res);

    await doctorModel.findByIdAndUpdate(doctorId, { $inc: { totalViews: 1 } });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Update Doctor Profile
const updateDoctorProfile = CatchAsyncError(async (req, res, next) => {
  try {
    const { avatar, workingHours, ...updateData } = req.body;
    const doctorId = req.params.id;

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return next(new ErrorHandler("Doctor not found", 404));
    }

    if (avatar) {
      if (doctor.avatar?.public_id) {
        await cloudinary.v2.uploader.destroy(doctor.avatar.public_id);
      }

      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "doctors",
        width: 150,
        crop: "scale",
      });

      updateData.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }

    delete updateData.rating;
    delete updateData.totalRatings;
    delete updateData.totalViews;
    delete updateData.totalPatients;
    delete updateData.isVerified;

    Object.assign(doctor, updateData);
    await doctor.save();

    await redis.set(doctorId, JSON.stringify(doctor));

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Update Working Hours
const updateWorkingHours = CatchAsyncError(async (req, res, next) => {
  try {
    const doctorId = req.params.id;
    const { workingHours } = req.body;

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return next(new ErrorHandler("Doctor not found", 404));
    }

    if (!workingHours || !Array.isArray(workingHours)) {
      return next(new ErrorHandler("Invalid working hours data", 400));
    }

    const validDays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const isValid = workingHours.every(
      (wh) => validDays.includes(wh.day) && wh.startTime && wh.endTime
    );

    if (!isValid) {
      return next(new ErrorHandler("Invalid working hours format", 400));
    }

    doctor.workingHours = workingHours;
    await doctor.save();
    await redis.set(doctorId, JSON.stringify(doctor));

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Toggle Online Status
const toggleOnlineStatus = CatchAsyncError(async (req, res, next) => {
  try {
    const doctorId = req.params.id;

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return next(new ErrorHandler("Doctor not found", 404));
    }

    doctor.isOnline = !doctor.isOnline;
    await doctor.save();
    await redis.set(doctorId, JSON.stringify(doctor));

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Delete Doctor
const deleteDoctor = CatchAsyncError(async (req, res, next) => {
  try {
    const doctor = await doctorModel.findById(req.params.id);

    if (!doctor) {
      return next(new ErrorHandler("Doctor not found", 404));
    }

    if (doctor.avatar?.public_id) {
      await cloudinary.v2.uploader.destroy(doctor.avatar.public_id);
    }

    await redis.del(req.params.id);
    await doctor.deleteOne();

    res.status(200).json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Di doctorController.js
const searchDoctors = CatchAsyncError(async (req, res, next) => {
  try {
    const { query } = req.query;
    const doctors = await doctorModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { specialization: { $regex: query, $options: 'i' } }
      ]
    });
    
    res.status(200).json({
      success: true,
      doctors: doctors.map(doc => ({
        id: doc._id,
        name: doc.name,
        specialization: doc.specialization,
        rating: doc.rating,
        avatar: doc.avatar?.url
      }))
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  createDoctor,
  searchDoctors,
  getAllDoctors,
  getDoctor,
  updateDoctorProfile,
  updateWorkingHours,
  toggleOnlineStatus,
  deleteDoctor,
};