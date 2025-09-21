const express = require("express");
const {
  registerHospital,
  getAllHospitals,
  getHospitalById,
  getHospitalByName, // ✅ added
} = require("../controllers/hospitalController");

const { isLoggedIn } = require("../middleware/authMiddleware"); // ✅ auth check
const router = express.Router();

// Register hospital
router.post("/register", registerHospital);

// Get all hospitals
router.get("/", getAllHospitals);

// Get hospital by ID (e.g., HOSP01)
router.get("/:hospital_id", getHospitalById);

// ✅ NEW: Get hospital by name (requires token)
// Example: GET /hospitals/by-name?name=City%20Hospital
router.get("/by-name/search", isLoggedIn, getHospitalByName);

module.exports = router;
