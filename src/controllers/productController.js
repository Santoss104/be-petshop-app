const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const cloudinary = require("cloudinary");
const {
  getProductById,
  getAllProductsService,
  updateProductCache,
  clearProductCache,
} = require("../services/productService");

const createProduct = CatchAsyncError(async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      weight,
      dimensions,
      variants,
      images,
    } = req.body;

    const productData = {
      name,
      description,
      price,
      category,
      stock,
      user: req.user._id,
      weight,
      dimensions,
      variants,
    };

    if (images && images.length > 0) {
      const imagesLinks = [];
      for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.v2.uploader.upload(images[i], {
          folder: "products",
          width: 1000,
          crop: "scale",
        });

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
          isMain: i === 0,
        });
      }
      productData.images = imagesLinks;
    }

    const product = await productModel.create(productData);
    await updateProductCache(product);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getAllProducts = CatchAsyncError(async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      inStock,
      isActive = true,
      sort = "-createdAt",
      page = 1,
      limit = 12,
    } = req.query;

    const queryObject = { isActive };

    if (search) queryObject.search = search;
    
    if (category) {
      const categoryDoc = await categoryModel.findOne({ 
        name: { $regex: new RegExp(category, 'i') }
      });
      
      if (!categoryDoc) {
        return next(new ErrorHandler("Category not found", 404));
      }
      
      queryObject.category = categoryDoc._id;
    }

    if (minPrice || maxPrice) {
      queryObject.price = {};
      if (minPrice) queryObject.price.$gte = parseFloat(minPrice);
      if (maxPrice) queryObject.price.$lte = parseFloat(maxPrice);
    }
    if (inStock === "true") queryObject.stock = { $gt: 0 };

    const sortOrder = sort.startsWith("-") ? -1 : 1;
    const sortField = sort.replace("-", "");
    const sortOptions = { [sortField]: sortOrder };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    await getAllProductsService(
      res,
      queryObject,
      sortOptions,
      skip,
      parseInt(limit)
    );
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getProduct = CatchAsyncError(async (req, res, next) => {
  try {
    await getProductById(req.params.id, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const updateProduct = CatchAsyncError(async (req, res, next) => {
  try {
    let product = await productModel.findById(req.params.id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    if (req.body.images) {
      for (const image of product.images) {
        await cloudinary.v2.uploader.destroy(image.public_id);
      }

      const imagesLinks = [];
      const imagesArray = Array.isArray(req.body.images)
        ? req.body.images
        : [req.body.images];

      for (let i = 0; i < imagesArray.length; i++) {
        const result = await cloudinary.v2.uploader.upload(imagesArray[i], {
          folder: "products",
          width: 1000,
          crop: "scale",
        });

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
          isMain: i === 0,
        });
      }

      req.body.images = imagesLinks;
    }

    product = await productModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await updateProductCache(product);

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const deleteProduct = CatchAsyncError(async (req, res, next) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    for (const image of product.images) {
      await cloudinary.v2.uploader.destroy(image.public_id);
    }

    await product.deleteOne();
    await clearProductCache(product._id);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const searchProducts = CatchAsyncError(async (req, res, next) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return next(new ErrorHandler("Please enter a keyword", 400));
    }

    const products = await productModel
      .find({
        name: { $regex: keyword, $options: "i" },
        isActive: true,
      })
      .populate("category", "name")
      .select("name price images category stock");

    res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  createProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
};