const express = require("express");
const BedAssignment = require("../models/BedAssignment");
const Bed = require("../models/Bed");

const router = express.Router();

// 🛏️ Assign a bed to a patient
router.post("/assign", async (req, res) => {
  try {
    const { patient_id, bed_id, nurse_id } = req.body;

    const bed = await Bed.findById(bed_id);
    if (!bed) return res.status(404).json({ message: "Bed not found" });

    if (bed.is_occupied) {
      return res.status(400).json({ message: "Bed already occupied" });
    }

    // Create assignment
    const assignment = new BedAssignment({
      patient_id,
      bed_id,
      nurse_id,
    });

    // Mark bed as occupied
    bed.is_occupied = true;
    await bed.save();
    await assignment.save();

    res.status(201).json({ message: "Bed assigned successfully", assignment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🚪 Release bed (discharge)
router.post("/release/:assignmentId", async (req, res) => {
  try {
    const assignment = await BedAssignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    assignment.discharge_date = new Date();
    await assignment.save();

    // Free the bed
    const bed = await Bed.findById(assignment.bed_id);
    if (bed) {
      bed.is_occupied = false;
      await bed.save();
    }

    res.json({ message: "Bed released successfully", assignment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 📋 Get current bed assignments
router.get("/", async (req, res) => {
  try {
    const assignments = await BedAssignment.find()
      .populate("patient_id", "name email")
      .populate("bed_id", "bed_id ward")
      .populate("nurse_id", "name email");
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
