const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },   // ✅ Add email for login
  mobile: { type: String, required: true, unique: true },  // ✅ Add mobile for login
  password: { type: String, required: true },              // ✅ Add password field
  dob: { type: Date, required: true },    
  gender: String,
  contact: String,
  address: String,
  admitted_on: { type: Date, default: Date.now },
  discharged_on: { type: Date },
  bed_id: { type: String, ref: "Bed" },
  is_discharged: { type: Boolean, default: false },
});

// Hash password before saving
PatientSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password during login
PatientSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Patient", PatientSchema);
