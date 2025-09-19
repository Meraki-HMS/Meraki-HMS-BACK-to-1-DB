const express = require("express");
const {
  registerHospital,
  getAllHospitals,
  getHospitalById,
} = require("../controllers/hospitalController");

const router = express.Router();

// Register hospital
router.post("/register", registerHospital);

// Get all hospitals
router.get("/", getAllHospitals);

// Get hospital by ID (e.g., HOSP01)
router.get("/:hospital_id", getHospitalById);

module.exports = router;
