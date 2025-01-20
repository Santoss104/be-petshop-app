const mongoose = require("mongoose");

const priceRegexPattern = /^\d+(\.\d{1,2})?$/;

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter product name"],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Please enter product description"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Please enter product price"],
      validate: {
        validator: function (value) {
          return value > 0 && priceRegexPattern.test(value.toString());
        },
        message: "Please enter a valid price",
      },
      index: true,
    },
    images: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        isMain: {
          type: Boolean,
          default: false,
        },
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Please select a category"],
      index: true,
    },
    stock: {
      type: Number,
      required: [true, "Please enter product stock"],
      default: 0,
      validate: {
        validator: function (value) {
          return value >= 0;
        },
        message: "Stock cannot be negative",
      },
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Tambahan field
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    weight: {
      type: Number,
      required: [true, "Please enter product weight"],
      min: [0, "Weight cannot be negative"],
      default: 0,
    },
    dimensions: {
      length: {
        type: Number,
        min: [0, "Length cannot be negative"],
        default: 0,
      },
      width: {
        type: Number,
        min: [0, "Width cannot be negative"],
        default: 0,
      },
      height: {
        type: Number,
        min: [0, "Height cannot be negative"],
        default: 0,
      },
    },
    variants: [
      {
        name: String,
        options: [String],
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual fields
productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

productSchema.virtual("mainImage").get(function () {
  const mainImage = this.images.find((img) => img.isMain) || this.images[0];
  return mainImage ? mainImage.url : null;
});

productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1, stock: 1 });

productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 8);
  }
  next();
});

productSchema.pre(/^find/, function (next) {
  this.populate({
    path: "category",
    select: "name", // hanya ambil field name dari category
  });
  next();
});

// Methods
productSchema.methods.updateStock = function (quantity) {
  this.stock += quantity;
  return this.save();
};

productSchema.methods.setMainImage = function (imageId) {
  this.images = this.images.map((img) => ({
    ...img,
    isMain: img.public_id === imageId,
  }));
  return this.save();
};

const productModel = mongoose.model("Product", productSchema);

module.exports = productModel;