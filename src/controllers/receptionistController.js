const Receptionist = require("../models/Receptionist");
const generateToken = require("../utils/generateToken");
const Hospital = require("../models/Hospital");

// 📌 Register Receptionist
exports.registerReceptionist = async (req, res) => {
  try {
    const { name, email, mobile, password, hospital_id } = req.body;

    // check existing
    const existing = await Receptionist.findOne({ email });
    if (existing) return res.status(400).json({ message: "Receptionist already exists" });

    const hospital = await Hospital.findOne({ hospital_id });
    if (!hospital) {
      return res.status(400).json({ message: "Invalid hospital_id, hospital not found" });
    }
    
    const receptionist = await Receptionist.create({
      name, email, mobile, password, hospital_id
    });

    res.status(201).json({
      message: "Receptionist registered successfully",
      receptionist: {
        id: receptionist._id,
        name: receptionist.name,
        email: receptionist.email,
        mobile: receptionist.mobile,
        hospital_id: receptionist.hospital_id
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error registering receptionist", error: error.message });
  }
};

// 📌 Login Receptionist
exports.loginReceptionist = async (req, res) => {
  try {
    const { email, password , hospital_id } = req.body;

    const receptionist = await Receptionist.findOne({ email });
    if (!receptionist) return res.status(400).json({ message: "Receptionist not found" });

    const hospital = await Hospital.findOne({ hospital_id });
    if (!hospital) {
      return res.status(400).json({ message: "Invalid hospital_id, hospital not found" });
    }

    const isMatch = await receptionist.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
    const token = generateToken(receptionist._id, "receptionist");

    res.status(200).json({
        message: "Logged in successfully",
        token : token,
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};
