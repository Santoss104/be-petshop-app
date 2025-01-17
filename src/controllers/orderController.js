const orderModel = require("../models/orderModel");
const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const { redis } = require("../utils/redis");
const {
  processOrder,
  getOrderById,
  getAllOrdersService,
} = require("../services/orderService");

// Create Order
const createOrder = CatchAsyncError(async (req, res, next) => {
  try {
    const { shippingAddress, shippingMethod } = req.body;

    const cart = await cartModel
      .findOne({ user: req.user._id })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return next(new ErrorHandler("Cart is empty", 400));
    }

    const subtotal = cart.totalAmount;
    const shippingFee = shippingMethod === "express" ? 20000 : 10000;
    const adminFee = 10000;
    const total = subtotal + shippingFee + adminFee;

    let order;
    let retries = 3;

    while (retries > 0) {
      try {
        order = new orderModel({
          user: req.user._id,
          items: cart.items.map((item) => ({
            product: item.product._id,
            quantity: item.quantity,
            price: item.price,
            name: item.product.name,
            productSnapshot: {
              images: item.product.images,
            },
          })),
          shippingAddress,
          shippingMethod,
          shippingFee,
          adminFee,
          subtotal,
          total,
        });
        await order.save();
        break;
      } catch (err) {
        console.error("Error creating order:", err);
        if (
          err.code === 11000 &&
          err.keyPattern &&
          err.keyPattern.orderNumber &&
          retries > 1
        ) {
          retries--;
          continue;
        }
        throw err;
      }
    }

    if (!order) {
      return next(new ErrorHandler("Failed to create order", 500));
    }

    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const confirmOrderReceived = CatchAsyncError(async (req, res, next) => {
  try {
    const order = await orderModel.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (order.status !== "processing") {
      return next(
        new ErrorHandler("Order cannot be confirmed at this time", 400)
      );
    }

    order.status = "success";
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order confirmed successfully",
      orderStatus: order.status,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get User Orders
const getUserOrders = CatchAsyncError(async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = "-createdAt" } = req.query;
    const skip = (page - 1) * limit;

    await getAllOrdersService(res, req.user, {}, { [sort]: -1 }, skip, limit);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get Single Order
const getOrder = CatchAsyncError(async (req, res, next) => {
  try {
    await getOrderById(req.params.id, req.user, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Cancel Order
const cancelOrder = CatchAsyncError(async (req, res, next) => {
  try {
    const order = await orderModel.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    if (order.status !== "pending") {
      return next(
        new ErrorHandler("Only pending orders can be cancelled", 400)
      );
    }

    for (const item of order.items) {
      await productModel.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    order.status = "cancelled";
    await order.save();
    await redis.set(order._id, JSON.stringify(order));

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  createOrder,
  confirmOrderReceived,
  getUserOrders,
  getOrder,
  cancelOrder,
};