const petModel = require("../models/petModel");
const ErrorHandler = require("../utils/errorHandler");
const { CatchAsyncError } = require("../middlewares/catchAsyncError");
const cloudinary = require("cloudinary");
const { redis } = require("../utils/redis");
const { getPetById, getAllPetsService } = require("../services/petService");

const createPet = CatchAsyncError(async (req, res, next) => {
  try {
    const {
      name,
      breed,
      type,
      gender,
      age,
      color,
      weight,
      characteristics,
      goodWith,
      location,
      images,
    } = req.body;

    const petData = {
      name,
      breed,
      type,
      gender,
      age,
      color,
      weight,
      characteristics,
      goodWith,
      location: location,
      user: req.user._id,
    };

    if (images && images.length > 0) {
      const imagesLinks = [];
      for (let i = 0; i < images.length; i++) {
        const result = await cloudinary.v2.uploader.upload(images[i], {
          folder: "pets",
          width: 1000,
          crop: "scale",
        });

        imagesLinks.push({
          public_id: result.public_id,
          url: result.secure_url,
          isMain: i === 0,
        });
      }
      petData.images = imagesLinks;
    }

    const pet = await petModel.create(petData);
    await redis.set(pet._id, JSON.stringify(pet));

    res.status(201).json({
      success: true,
      message: "Pet created successfully",
      pet,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getAllPets = CatchAsyncError(async (req, res, next) => {
  try {
    const {
      type,
      breed,
      gender,
      age,
      goodWith,
      location,
      sort = "-createdAt",
      page = 1,
      limit = 12,
    } = req.query;

    const queryObject = { status: "Available" };

    if (type) queryObject.type = type;
    if (breed) queryObject.breed = breed;
    if (gender) queryObject.gender = gender;
    if (age) queryObject["age.category"] = age;
    if (goodWith === "kids") queryObject["goodWith.kids"] = true;
    if (goodWith === "otherPets") queryObject["goodWith.otherPets"] = true;
    if (location) queryObject.location = location;

    const sortOptions = {};
    const sortField = sort.replace("-", "");
    sortOptions[sortField] = sort.startsWith("-") ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    await getAllPetsService(
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

const getPetDetail = CatchAsyncError(async (req, res, next) => {
  try {
    const petId = req.params.id;
    
    const cachedPet = await redis.get(petId);
    if (cachedPet) {
      return res.status(200).json({
        success: true,
        pet: JSON.parse(cachedPet)
      });
    }

    const pet = await petModel.findById(petId);
    
    if (!pet) {
      return next(new ErrorHandler("Pet not found", 404));
    }

    await redis.set(petId, JSON.stringify(pet));

    res.status(200).json({
      success: true,
      pet
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getPetsByCategory = CatchAsyncError(async (req, res, next) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 12 } = req.query;

    if (!["Cat", "Dog"].includes(type)) {
      return next(new ErrorHandler("Invalid pet type", 400));
    }

    const totalPets = await petModel.countDocuments({
      status: "Available",
      type: type,
    });

    const pets = await petModel
      .find({
        status: "Available",
        type: type,
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = Math.ceil(totalPets / limit);

    res.status(200).json({
      success: true,
      pets,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPets,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

const getPetCategories = CatchAsyncError(async (req, res, next) => {
  try {
    const cats = await petModel.countDocuments({
      status: "Available",
      type: "Cat",
    });

    const dogs = await petModel.countDocuments({
      status: "Available",
      type: "Dog",
    });

    res.status(200).json({
      success: true,
      categories: [
        {
          type: "Cat",
          count: cats,
        },
        {
          type: "Dog",
          count: dogs,
        },
      ],
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

module.exports = {
  createPet,
  getAllPets,
  getPetDetail,
  getPetsByCategory,
  getPetCategories,
};