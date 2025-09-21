const ReceptionistPatient = require("../models/receptionist_patient");
const DoctorAvailability = require("../models/DoctorAvailability");
const Appointment = require("../models/Appointment");

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
// Fetch available slots for a doctor on a date
// ==============================
exports.getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    const availability = await DoctorAvailability.findOne({ doctorId, date });
    if (!availability) {
      return res.status(404).json({ message: "No availability found" });
    }

    // Get booked slots
    const bookedAppointments = await Appointment.find({ doctorId, date });
    const bookedSlots = bookedAppointments.map(a => ({
      start: a.slotStart,
      end: a.slotEnd
    }));

    // Filter only free slots
    const freeSlots = availability.slots.filter(
      slot => !bookedSlots.some(
        booked => booked.start === slot.start && booked.end === slot.end
      )
    );

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
      .populate("patientId")
      .populate("doctorId");

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
      .populate("patientId")
      .populate("doctorId");

    res.json(appointments);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
