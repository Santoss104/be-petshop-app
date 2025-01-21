const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["order", "booking"],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "referenceType",
    },
    amount: {
      type: Number,
      required: true,
    },
    applicationFee: {
      type: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["credit_card"],
    },
    transactionId: {
      type: String,
      unique: true,
    },
    cardDetails: {
      cardNumber: {
        type: String,
        required: true,
      },
      cardName: {
        type: String,
        required: true,
      },
      expireDate: {
        type: String,
        required: true,
      },
      cvv: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);


paymentSchema.pre("validate", async function (next) {
  if (!this.transactionId) {
    this.transactionId =
      "TRX" + Date.now() + Math.random().toString(36).substring(7);
  }
  next();
});

const paymentModel = mongoose.model("Payment", paymentSchema);

module.exports = paymentModel;