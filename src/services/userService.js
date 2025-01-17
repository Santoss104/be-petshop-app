const { redis } = require("../utils/redis");
const userModel = require("../models/userModel");

// get user by id
exports.getUserById = async (id, res) => {
  const userJson = await redis.get(id);

  if (userJson) {
    const user = JSON.parse(userJson);
    res.status(201).json({
      success: true,
      user,
    });
  }
};

// Get All users
exports.getAllUsersService = async (res) => {
  const users = await userModel.find().sort({ createdAt: -1 });

  res.status(201).json({
    success: true,
    users,
  });
};