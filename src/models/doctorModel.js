const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter doctor's name"],
    },
    specialization: {
      type: String,
      required: [true, "Please enter specialization"],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    views: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    totalPatients: {
      type: Number,
      default: 0,
    },
    biography: {
      type: String,
      required: [true, "Please enter doctor's biography"],
    },
    workingHours: [
      {
        day: {
          type: String,
          enum: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
        startTime: String,
        endTime: String,
        isFull: {
          type: Boolean,
          default: false,
        },
      },
    ],
    consultationFee: {
      type: Number,
      required: [true, "Please enter consultation fee"],
    },
    applicationFee: {
      type: Number,
      required: [true, "Please enter application fee"],
    },
    avatar: {
      public_id: String,
      url: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

doctorSchema.virtual("fullName").get(function () {
  return `Drh. ${this.name}`;
});

doctorSchema.methods.isAvailable = function (date, time) {
  const dayOfWeek = new Date(date).getDay();
  const workingHour = this.workingHours.find(
    (wh) =>
      wh.day ===
      [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][dayOfWeek]
  );

  if (!workingHour || workingHour.isFull) return false;

  const appointmentTime = new Date(`1970-01-01T${time}`);
  const startTime = new Date(`1970-01-01T${workingHour.startTime}`);
  const endTime = new Date(`1970-01-01T${workingHour.endTime}`);

  return appointmentTime >= startTime && appointmentTime <= endTime;
};

const doctorModel = mongoose.model("Doctor", doctorSchema);

module.exports = doctorModel;