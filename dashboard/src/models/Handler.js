import mongoose from "mongoose";

const HandlerSchema = new mongoose.Schema(
  {
    handlerName: {
      type: String,
      required: [true, "Handler name is required"],
      trim: true,
    },
    countryCode: {
      type: String,
      default: "+91",
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    accounts: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one Instagram account is required",
      },
    },
    monthlyPay: {
      type: Number,
      required: [true, "Monthly pay is required"],
      min: [0, "Monthly pay cannot be negative"],
    },
    currency: {
      type: String,
      enum: ["₹", "$"],
      default: "₹",
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// Prevent model recompilation during hot-reload in development.
export default mongoose.models.Handler ||
  mongoose.model("Handler", HandlerSchema);
