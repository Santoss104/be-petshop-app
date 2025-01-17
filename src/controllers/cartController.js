const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const {
  getCartByUserId,
  getCartSummaryService,
  validateCartStock,
  updateCartCache,
} = require("../services/cartService");

// Add to Cart
const addToCart = CatchAsyncError(async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await productModel.findById(productId);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    let cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) {
      cart = new cartModel({ user: req.user._id, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
        productSnapshot: {
          name: product.name,
          images: product.images,
          stock: product.stock,
        },
      });
    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Get Cart
const getCart = CatchAsyncError(async (req, res, next) => {
  try {
    const summary = await getCartSummaryService(req.user._id);

    res.status(200).json({
      success: true,
      cart: summary,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Update Cart Item
const updateCartItem = CatchAsyncError(async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return next(
        new ErrorHandler("Please provide product ID and quantity", 400)
      );
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    if (product.stock < quantity) {
      return next(
        new ErrorHandler(`Insufficient stock. Available: ${product.stock}`, 400)
      );
    }

    const cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) {
      return next(new ErrorHandler("Cart not found", 404));
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return next(new ErrorHandler("Item not found in cart", 404));
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].productSnapshot.stock = product.stock;

    await cart.save();
    await updateCartCache(cart);

    const summary = await getCartSummaryService(req.user._id);

    res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      cart: summary,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Remove Cart Item
const removeCartItem = CatchAsyncError(async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) {
      return next(new ErrorHandler("Cart not found", 404));
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    await updateCartCache(cart);

    const summary = await getCartSummaryService(req.user._id);

    res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      cart: summary,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// Clear Cart
const clearCart = CatchAsyncError(async (req, res, next) => {
  try {
    const cart = await cartModel.findOne({ user: req.user._id });
    if (!cart) {
      return next(new ErrorHandler("Cart not found", 404));
    }

    cart.items = [];
    await cart.save();
    await updateCartCache(cart);

    const summary = await getCartSummaryService(req.user._id);

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart: summary,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};