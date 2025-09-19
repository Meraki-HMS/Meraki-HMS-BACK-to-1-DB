const express = require("express");
const router = express.Router();

const { registerDoctor, loginDoctor } = require("../controllers/doctorController");
const {isLoggedIn}  = require("../middleware/authMiddleware");

// Doctor Register
router.post("/register", registerDoctor);

// Doctor Login
router.post("/login", loginDoctor);

// Example: Protected route (Doctor profile)
router.get("/profile", isLoggedIn, (req, res) => {
  res.json({
    message: "Doctor profile fetched successfully",
    doctor: req.user // 🩺 comes from isLoggedIn middleware
  });
});

module.exports = router;
