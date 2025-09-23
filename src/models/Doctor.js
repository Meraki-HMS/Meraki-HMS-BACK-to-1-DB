const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const doctorSchema = new mongoose.Schema({
  doctor_id: { type: Number, unique: true, index: true }, // auto increment
  hospital_id: { 
    type: String, 
       
    required: true 
  },
  name: { type: String, required: true, maxlength: 100 },
  specialization: { type: String, required: true, maxlength: 100 },
  contact: { type: String, maxlength: 15 },
  email: { type: String, maxlength: 100, unique: true, required: true },
  password: { type: String, required: true },  // ✅ added for login

  workingHours: {
    start: { type: String, required: true }, // "09:00"
    end: { type: String, required: true }    // "17:00"
  },
  slotSize: { type: Number, default: 30 }, // in minutes
  breaks: [
    {
      start: { type: String, required: true }, // "13:00"
      end: { type: String, required: true }    // "14:00"
    }
  ],
  holidays: [{ type: Date }], // e.g. 2025-08-31

  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Auto-increment doctor_id
doctorSchema.pre("save", async function (next) {
  if (!this.doctor_id) {
    const last = await mongoose.model("Doctor").findOne().sort("-doctor_id");
    this.doctor_id = last ? last.doctor_id + 1 : 1;
  }

  // ✅ Hash password only if modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// ✅ Method to compare passwords during login
doctorSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Doctor", doctorSchema);
