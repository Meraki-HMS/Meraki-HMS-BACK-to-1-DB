// src/routes/patientAppointmentRoutes.js
const express = require("express");
const router = express.Router();
const {
  getDepartments,
  getDoctorsByDepartment,
  getAvailableSlots,
  bookAppointment,
  getHospitalAppointments
} = require("../controllers/patientAppointmentController");

const { isLoggedIn } = require("../middleware/authMiddleware");

router.get("/departments/:hospitalId", getDepartments);
router.get("/doctors", getDoctorsByDepartment);
router.get("/available-slots", getAvailableSlots);
router.post("/book", isLoggedIn, bookAppointment);
router.get("/hospital/:hospitalId", isLoggedIn, getHospitalAppointments);

module.exports = router;
