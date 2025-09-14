const express = require("express");
const {
  registerPatient,
  loginPatient,
  getPatientProfile,
} = require("../controllers/patinetController.js");
const { isLoggedIn } = require("../middleware/authMiddleware.js");
const { resetPassword } = require("../controllers/patinetController");
const router = express.Router();

router.post("/register", registerPatient);
router.post("/login", loginPatient);
router.get("/profile", isLoggedIn, getPatientProfile);
router.post("/reset-password", resetPassword);
module.exports = router;
