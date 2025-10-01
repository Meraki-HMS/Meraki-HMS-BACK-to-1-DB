const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const ReceptionistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },   // ✅ for login
  mobile: { type: String, required: true, unique: true },  // ✅ for login
  password: { type: String, required: true },              // ✅ Hashed
  hospital_id: { type: String, required: true },           // ✅ Reference hospital
  joined_on: { type: Date, default: Date.now },
});

// ✅ Hash password before savingx`
ReceptionistSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Method to compare password
ReceptionistSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Receptionist", ReceptionistSchema);
