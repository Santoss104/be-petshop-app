const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter pet name"],
    },
    breed: {
      type: String,
      required: [true, "Please enter pet breed"],
    },
    type: {
      type: String,
      required: [true, "Please enter pet type"],
      enum: ["Cat", "Dog"],
    },
    gender: {
      type: String,
      required: [true, "Please enter pet gender"],
      enum: ["Male", "Female"],
    },
    age: {
      value: {
        type: Number,
        required: [true, "Please enter pet age"],
      },
      category: {
        type: String,
        enum: ["Kitten", "Young", "Adult", "Senior"],
      },
    },
    color: {
      type: String,
      required: [true, "Please enter pet color"],
    },
    weight: {
      type: Number,
      required: [true, "Please enter pet weight"],
    },
    health: {
      vaccinated: {
        type: Boolean,
        default: false,
      },
      neutered: {
        type: Boolean,
        default: false,
      },
    },
    characteristics: [
      {
        type: String,
      },
    ],
    goodWith: {
      kids: {
        type: Boolean,
        default: false,
      },
      otherPets: {
        type: Boolean,
        default: false,
      },
    },
    location: {
      city: {
        type: String,
        required: [true, "Please enter city"],
      },
    },
    images: [
      {
        public_id: String,
        url: String,
        isMain: {
          type: Boolean,
          default: false,
        },
      },
    ],
    status: {
      type: String,
      enum: ["Available", "Pending", "Adopted"],
      default: "Available",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const petModel = mongoose.model("Pet", petSchema);

module.exports = petModel;