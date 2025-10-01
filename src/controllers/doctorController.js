const Doctor = require("../models/Doctor");
const bcrypt = require("bcrypt");
const Hospital = require("../models/Hospital");
const generateToken = require("../utils/generateToken");

// ✅ Register Doctor
exports.registerDoctor = async (req, res) => {
  try {
    const { name, email, contact, password, hospital_id, specialization, workingHours, slotSize, breaks } = req.body;

     // ✅ 1. Check if hospital exists by hospital_id
    const hospital = await Hospital.findOne({ hospital_id });
    if (!hospital) {
      return res.status(400).json({ message: "Invalid hospital_id, hospital not found" });
    }

    // Check if doctor exists
    const existingDoctor = await Doctor.findOne({ email });
    if (existingDoctor) {
      return res.status(400).json({ message: "Doctor already exists" });
    }

    const doctor = new Doctor({
      name,
      email,
      contact,
      password: password, 
      hospital_id,
      specialization,
      workingHours,
      slotSize,
      breaks,
    });

    await doctor.save();

    res.status(201).json({
      message: "Doctor registered successfully",
      token: generateToken(doctor._id, "doctor"),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Login Doctor
exports.loginDoctor = async (req, res) => {
  try {
    const { email, password  , hospital_id} = req.body;

    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    const hospital = await Hospital.findOne({ hospital_id });
    if (!hospital) {
      return res.status(400).json({ message: "Invalid hospital_id, hospital not found" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      token: generateToken(doctor._id, "doctor"),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
