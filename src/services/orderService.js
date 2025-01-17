const { redis } = require("../utils/redis");
const orderModel = require("../models/orderModel");
const ErrorHandler = require("../utils/errorHandler");

// Get order by id
exports.getOrderById = async (orderId, user, res) => {
  try {
    const cachedOrder = await redis.get(orderId);
    if (cachedOrder) {
      const order = JSON.parse(cachedOrder);
      if (order.user.toString() !== user._id.toString()) {
        throw new ErrorHandler("Not authorized to access this order", 403);
      }
      return res.status(200).json({
        success: true,
        order,
      });
    }

    const order = await orderModel
      .findById(orderId)
      .populate("items.product", "name images price")
      .populate("payment", "status paymentMethod");

    if (!order) {
      throw new ErrorHandler("Order not found", 404);
    }

    if (order.user.toString() !== user._id.toString()) {
      throw new ErrorHandler("Not authorized to access this order", 403);
    }

    await redis.set(orderId, JSON.stringify(order));

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};

// Get user orders with filtering and pagination
exports.getAllOrdersService = async (
  res,
  user,
  queryObject = {},
  sortOptions = {},
  skip = 0,
  limit = 10
) => {
  try {
    queryObject.user = user._id;

    const orders = await orderModel
      .find(queryObject)
      .populate("items.product", "name images price")
      .populate("payment", "status paymentMethod")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await orderModel.countDocuments(queryObject);

    return res.status(200).json({
      success: true,
      orders,
      total,
      page: Math.ceil(skip / limit) + 1,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};