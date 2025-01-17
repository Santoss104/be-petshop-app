const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity cannot be less than 1"],
        },
        price: {
          type: Number,
          required: true,
        },
        name: String,
        productSnapshot: {
          images: [
            {
              public_id: String,
              url: String,
            },
          ],
        },
      },
    ],
    shippingAddress: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      postalCode: {
        type: String,
        required: true,
        trim: true,
      },
    },
    shippingMethod: {
      type: String,
      enum: ["regular", "express"],
      default: "regular",
    },
    shippingFee: {
      type: Number,
      required: true,
      default: 10000,
    },
    adminFee: {
      type: Number,
      required: true,
      default: 10000,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "success", "cancelled"],
      default: "pending",
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("validate", async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const lastOrder = await this.constructor.findOne(
      {
        orderNumber: new RegExp(`^${year}${month}${day}`),
      },
      {},
      { sort: { orderNumber: -1 } }
    );

    let sequence = "001";
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-3));
      sequence = (lastSequence + 1).toString().padStart(3, "0");
    }

    this.orderNumber = `${year}${month}${day}${sequence}`;
  }
  next();
});

const orderModel = mongoose.model("Order", orderSchema);

module.exports = orderModel;