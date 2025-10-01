const express = require("express");
const router = express.Router();
const appointmentsController = require("../controllers/appointmentsController");

const { isLoggedIn } = require("../middleware/authMiddleware");

// Receptionist registers patient
router.post("/register-patient", isLoggedIn,appointmentsController.registerPatient);

// Receptionist sets doctor availability
router.post("/availability", isLoggedIn, appointmentsController.setDoctorAvailability);

// Fetch available slots for doctor by date
router.get("/availability/:doctorId/:date", isLoggedIn,appointmentsController.getAvailableSlots);

// Book an appointment (with new fields)
router.post("/book", isLoggedIn, appointmentsController.bookAppointment);

// Get all appointments by hospital
router.get("/hospital/:hospitalId", isLoggedIn,appointmentsController.getAppointmentsByHospital);

// Get doctor appointments by date
router.get("/doctor/:doctorId/:date", appointmentsController.getDoctorAppointmentsByDate);

// 🆕 New route to fetch departments by hospital custom id
router.get("/departments/:hospitalId", appointmentsController.getDepartmentsByHospital);
//Get doctors by department & hospitalId
router.get("/doctors", appointmentsController.getDoctorsByDepartment);
//Cancel Appointment
router.put("/:appointmentId/cancel", isLoggedIn, appointmentsController.cancelAppointment);
//Reschedule Appointment    
router.put("/:appointmentId/reschedule", isLoggedIn, appointmentsController.rescheduleAppointment);




module.exports = router;
