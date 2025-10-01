const express = require("express");
const Bed = require("../models/Bed");
const Hospital = require("../models/Hospital");

const router = express.Router();

// ➕ Add a new bed
router.post("/add", async (req, res) => {
  try {
    const { bed_id, ward, hospital_id } = req.body;

    // Check if hospital exists
    const hospital = await Hospital.findOne({ hospital_id });
    if (!hospital) {
      return res.status(400).json({ message: "Invalid hospital_id" });
    }

    const bed = new Bed({
      bed_id,
      ward,
      hospital_id,
    });

    await bed.save();
    res.status(201).json({ message: "Bed added successfully", bed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 📋 Get all beds for a hospital
router.get("/:hospital_id", async (req, res) => {
  try {
    const { hospital_id } = req.params;
    const hospital = await Hospital.findOne({ hospital_id});
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const beds = await Bed.find({ hospital_id});
    res.json(beds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// ❌ Delete a bed (by bed_id + hospital_id)
router.delete("/:hospital_id/:bed_id", async (req, res) => {
  try {
    const { hospital_id, bed_id } = req.params;

    const hospital = await Hospital.findOne({ hospital_id });
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const deletedBed = await Bed.findOneAndDelete({ bed_id, hospital_id });
    if (!deletedBed) {
      return res.status(404).json({ message: "Bed not found" });
    }

    res.json({ message: "Bed deleted successfully", deletedBed });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
