const ReceptionistPatient = require("../models/receptionist_patient");
const DoctorAvailability = require("../models/DoctorAvailability");
const Appointment = require("../models/Appointment");
const Hospital = require("../models/Hospital");   // 🆕 make sure Hospital model is imported
const Doctor = require("../models/Doctor");       // 🆕 import Doctor model
const { cancelAppointment, rescheduleAppointment } = require("../services/appointmentService");

// ==============================
// Register patient by receptionist
// ==============================
exports.registerPatient = async (req, res) => {
  try {
    const patient = new ReceptionistPatient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ==============================
// Set doctor availability (multiple slots)
// ==============================
exports.setDoctorAvailability = async (req, res) => {
  try {
    const { hospitalId, doctorId, date, slots } = req.body;

    let availability = await DoctorAvailability.findOne({ doctorId, date });
    if (availability) {
      availability.slots = slots;
      await availability.save();
    } else {
      availability = new DoctorAvailability({ hospitalId, doctorId, date, slots });
      await availability.save();
    }

    res.status(201).json(availability);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ==============================
// Fetch available slots for a doctor on a date (split into 30-min intervals)
// ==============================
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    const availability = await DoctorAvailability.findOne({ doctorId, date });
    if (!availability) {
      return res.status(404).json({ message: "No availability found" });
    }

    // Get booked slots
    // const bookedAppointments = await Appointment.find({ doctorId, date });
    const bookedAppointments = await Appointment.find({ doctorId, date, status: "Scheduled" });

    const bookedSet = new Set(bookedAppointments.map(a => `${a.slotStart}-${a.slotEnd}`));

    // Helpers
    const parseTimeToMinutes = (t) => {
      const [hh, mm] = t.split(":").map(Number);
      return hh * 60 + mm;
    };
    const minutesToTimeString = (mins) => {
      const hh = Math.floor(mins / 60).toString().padStart(2, "0");
      const mm = (mins % 60).toString().padStart(2, "0");
      return `${hh}:${mm}`;
    };

    // 🔑 Split availability slots into 30-minute sub-slots
    const allCandidateSlots = [];
    for (const slot of availability.slots) {
      let start = parseTimeToMinutes(slot.start);
      const end = parseTimeToMinutes(slot.end);

      while (start + 30 <= end) {
        const sStr = minutesToTimeString(start);
        const eStr = minutesToTimeString(start + 30);
        const key = `${sStr}-${eStr}`;

        // push only if not already added
        if (!allCandidateSlots.some(x => x.start === sStr && x.end === eStr)) {
          allCandidateSlots.push({ start: sStr, end: eStr, key });
        }

        start += 30;
      }
    }

    // Remove booked ones
    const freeSlots = allCandidateSlots
      .filter(slot => !bookedSet.has(`${slot.start}-${slot.end}`))
      .map(({ start, end }) => ({ start, end }));

    res.json(freeSlots);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ==============================
// Book an appointment
// ==============================
exports.bookAppointment = async (req, res) => {
  try {
    const {
      patientId,
      doctorId,
      hospitalId,
      date,
      slot,
      patientName,
      department,
      appointmentType,
      sessionType,
      reason,
      slotDuration
    } = req.body;

    // Check if slot already booked
    const existing = await Appointment.findOne({
      doctorId,
      date,
      slotStart: slot.start,
      slotEnd: slot.end
    });

    if (existing) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    const appointment = new Appointment({
      patientId,
      doctorId,
      hospitalId,
      date,
      slotStart: slot.start,
      slotEnd: slot.end,
      patientName,
      department,
      appointmentType,
      sessionType,
      reason,
      slotDuration
    });

    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ==============================
// Get all appointments by hospital
// ==============================
exports.getAppointmentsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const appointments = await Appointment.find({ hospitalId })
      // .populate("patientId")
      // .populate("doctorId");

    res.json(appointments);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ==============================
// Get doctor’s appointments by date
// ==============================
exports.getDoctorAppointmentsByDate = async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const appointments = await Appointment.find({ doctorId, date })
      // .populate("patientId")
      // .populate("doctorId");

    res.json(appointments);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ==============================
// Get departments by hospital (using hospital custom id)
// ==============================
exports.getDepartmentsByHospital = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    if (!hospitalId) {
      return res.status(400).json({ message: "hospitalId required" });
    }

    // ✅ Directly query doctors using hospitalId string (since Doctor.hospital_id is String)
    const specializations = await Doctor.find({
      hospital_id: hospitalId
    }).distinct("specialization");

    if (!specializations || specializations.length === 0) {
      return res.json({ hospitalId, departments: [] }); // clean empty response
    }

    res.json({ hospitalId, departments: specializations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// Get doctors by department & hospitalId
// ==============================
exports.getDoctorsByDepartment = async (req, res) => {
  try {
    const { hospitalId, department } = req.query;
    if (!hospitalId || !department) {
      return res.status(400).json({ message: "hospitalId and department required" });
    }

    // ✅ Fetch doctors where hospital_id = hospitalId (string) and specialization = department
    const doctors = await Doctor.find({
      hospital_id: hospitalId,
      specialization: department
    }).select("doctor_id name specialization contact email isAvailable");

    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: "No doctors found for this department in hospital" });
    }

    res.json({
      hospitalId,
      department,
      doctors
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel
exports.cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const result = await cancelAppointment(appointmentId);
    res.json({ message: "Appointment cancelled successfully", appointment: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Reschedule
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newSlotStart, newSlotDuration } = req.body;
    const result = await rescheduleAppointment(appointmentId, newSlotStart, newSlotDuration);
    res.json({ message: "Appointment rescheduled successfully", appointment: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};