const express = require("express");
const router = express.Router();
const { registerReceptionist, loginReceptionist } = require("../controllers/receptionistController");

// Register
router.post("/register", registerReceptionist);

// Login
router.post("/login", loginReceptionist);

module.exports = router;
