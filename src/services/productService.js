const { redis } = require("../utils/redis");
const productModel = require("../models/productModel");
const ErrorHandler = require("../utils/errorHandler");

exports.getProductById = async (id, res) => {
  try {
    const cachedProduct = await redis.get(`product:${id}`);
    if (cachedProduct) {
      const product = JSON.parse(cachedProduct);
      return res.status(200).json({
        success: true,
        product,
      });
    }

    const product = await productModel
      .findById(id)
      .populate("category", "name")
      .populate("user", "name");

    if (!product) {
      throw new ErrorHandler("Product not found", 404);
    }

    await redis.set(`product:${id}`, JSON.stringify(product));

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};

exports.getAllProductsService = async (
  res,
  queryObject,
  sortOptions,
  skip,
  limit
) => {
  try {
    const query = productModel.find(queryObject);

    if (queryObject.search) {
      query.find({
        $text: { $search: queryObject.search },
      });
      delete queryObject.search;
    }

    query.find(queryObject);
    query.sort(sortOptions);
    query.skip(skip).limit(limit);

    query.populate("category", "name");

    const [products, total] = await Promise.all([
      query.exec(),
      productModel.countDocuments(queryObject),
    ]);

    const currentPage = Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    const hasMore = currentPage < totalPages;

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        total,
        currentPage,
        totalPages,
        hasMore,
        limit,
      },
    });
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};

exports.updateProductCache = async (product) => {
  try {
    await redis.set(`product:${product._id}`, JSON.stringify(product));
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
};

exports.clearProductCache = async (productId) => {
  try {
    await redis.del(`product:${productId}`);
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
};

exports.validateStock = async (productId, requestedQuantity) => {
  try {
    const product = await productModel.findById(productId);
    if (!product) {
      throw new ErrorHandler("Product not found", 404);
    }
    if (!product.isActive) {
      throw new ErrorHandler("Product is not active", 400);
    }
    if (product.stock < requestedQuantity) {
      throw new ErrorHandler(
        `Insufficient stock. Available: ${product.stock}`,
        400
      );
    }
    return product;
  } catch (error) {
    throw new ErrorHandler(error.message, error.statusCode || 500);
  }
};