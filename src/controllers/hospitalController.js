const Hospital = require("../models/Hospital");

// Register hospital
exports.registerHospital = async (req, res) => {
  try {
    const { name, address, contact, email } = req.body;

    const hospital = new Hospital({ name, address, contact, email });
    await hospital.save();

    res.status(201).json({
      message: "Hospital registered successfully",
      hospital,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error registering hospital",
      error: error.message,
    });
  }
};

// Get all hospitals
exports.getAllHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json(hospitals);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching hospitals",
      error: error.message,
    });
  }
};

// Get hospital by hospital_id
exports.getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({
      hospital_id: req.params.hospital_id,
    });

    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    res.json(hospital);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching hospital",
      error: error.message,
    });
  }
};
