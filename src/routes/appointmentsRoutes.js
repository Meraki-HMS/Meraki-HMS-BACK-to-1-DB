const express = require("express");
const router = express.Router();
const appointmentsController = require("../controllers/appointmentsController");

// Receptionist registers patient
router.post("/register-patient", appointmentsController.registerPatient);

// Receptionist sets doctor availability
router.post("/availability", appointmentsController.setDoctorAvailability);

// Fetch available slots for doctor by date
router.get("/availability/:doctorId/:date", appointmentsController.getAvailableSlots);

// Book an appointment (with new fields)
router.post("/book", appointmentsController.bookAppointment);

// Get all appointments by hospital
router.get("/hospital/:hospitalId", appointmentsController.getAppointmentsByHospital);

// Get doctor appointments by date
router.get("/doctor/:doctorId/:date", appointmentsController.getDoctorAppointmentsByDate);

module.exports = router;
