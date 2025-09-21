const mongoose = require("mongoose");

const ReceptionistPatientSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },
    firstName: { type: String, required: true },
    lastName: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    dob: { type: Date },
    phone: { type: String, required: true },
    email: { type: String },
    address: { type: String },

    guardianName: { type: String },
    guardianPhone: { type: String },

    createdAt: { type: Date, default: Date.now },
  },
  { collection: "receptionist_patients" }
);

module.exports = mongoose.model("ReceptionistPatient", ReceptionistPatientSchema);
