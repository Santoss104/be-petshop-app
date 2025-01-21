const { redis } = require("../utils/redis");
const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const ErrorHandler = require("../utils/errorHandler");

exports.getCartByUserId = async (userId) => {
  try {
    const cachedCart = await redis.get(`cart:${userId}`);
    if (cachedCart) {
      return JSON.parse(cachedCart);
    }

    const cart = await cartModel
      .findOne({ user: userId })
      .populate("items.product", "name images price stock");

    if (cart) {
      await redis.set(`cart:${userId}`, JSON.stringify(cart));
      return cart;
    }

    return null;
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
};

exports.getCartSummaryService = async (userId) => {
  try {
    const cart = await cartModel
      .findOne({ user: userId })
      .populate("items.product", "name images price stock");

    if (!cart || cart.items.length === 0) {
      return {
        items: [],
        totalItems: 0,
        subtotal: 0,
        shippingFee: 0,
        adminFee: 0,
        total: 0,
      };
    }

    const subtotal = cart.totalAmount;
    const shippingFee = 10000;
    const adminFee = 10000;
    const total = subtotal + shippingFee + adminFee;

    return {
      items: cart.items,
      totalItems: cart.totalItems,
      subtotal,
      shippingFee,
      adminFee,
      total,
      lastUpdated: cart.lastUpdated,
    };
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
};

exports.validateCartStock = async (cart) => {
  try {
    for (const item of cart.items) {
      const product = await productModel.findById(item.product);
      if (!product) {
        throw new ErrorHandler(
          `Product ${item.productSnapshot.name} not found`,
          404
        );
      }
      if (product.stock < item.quantity) {
        throw new ErrorHandler(
          `Insufficient stock for ${product.name}. Available: ${product.stock}`,
          400
        );
      }
    }
    return true;
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode);
  }
};

exports.updateCartCache = async (cart) => {
  try {
    await redis.set(`cart:${cart.user}`, JSON.stringify(cart));
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
};