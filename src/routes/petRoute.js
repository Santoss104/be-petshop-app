const express = require("express");
const { isAutheticated } = require("../middlewares/authMiddleware");
const {
  createPet,
  getAllPets,
  getPetDetail,
  getPetsByCategory,
  getPetCategories,
} = require("../controllers/petController");

const petRouter = express.Router();

petRouter.get("/categories", getPetCategories);
petRouter.get("/category/:type", getPetsByCategory); 
petRouter.get("/", getAllPets);
petRouter.get("/:id", getPetDetail);
petRouter.post("/create", isAutheticated, createPet);

module.exports = petRouter;