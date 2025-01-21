const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    consultationType: {
      type: String,
      enum: ["video", "chat"],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    adminFee: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  { timestamps: true }
);

bookingSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await this.constructor.countDocuments();
    this.orderNumber = `BK${Date.now()}${count + 1}`;
  }
  next();
});

const bookingModel = mongoose.model("Booking", bookingSchema);

module.exports = bookingModel;