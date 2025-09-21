const express = require("express");
const router = express.Router();
const appointmentsController = require("../controllers/appointmentsController");

// Receptionist registers patient
router.post("/appointments/register-patient", appointmentsController.registerPatient);

// Receptionist sets doctor availability
router.post("/appointments/availability", appointmentsController.setDoctorAvailability);

// Fetch available slots for doctor by date
router.get("/appointments/availability/:doctorId/:date", appointmentsController.getAvailableSlots);

// Book an appointment
router.post("/appointments/book", appointmentsController.bookAppointment);

// Get all appointments by hospital
router.get("/appointments/hospital/:hospitalId", appointmentsController.getAppointmentsByHospital);

// Get doctor appointments by date
router.get("/appointments/doctor/:doctorId/:date", appointmentsController.getDoctorAppointmentsByDate);

module.exports = router;
