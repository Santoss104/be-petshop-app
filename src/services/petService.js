const { redis } = require("../utils/redis");
const petModel = require("../models/petModel");

exports.getPetById = async (id, res) => {
  const petJson = await redis.get(id);

  if (petJson) {
    const pet = JSON.parse(petJson);
    res.status(201).json({
      success: true,
      pet,
    });
  }
};

exports.getAllPetsService = async (res) => {
  const pets = await petModel.find().sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    pets,
  });
};