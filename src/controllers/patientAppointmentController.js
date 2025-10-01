// src/controllers/patientAppointmentController.js
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const Patient = require("../models/Patient");
const DoctorAvailability = require("../models/DoctorAvailability"); // ✅ added
const { cancelAppointment, rescheduleAppointment } = require("../services/appointmentService");
const mongoose = require("mongoose");

/* ---------- Helpers ---------- */
const parseTimeToMinutes = (t) => {
  if (!/^\d{2}:\d{2}$/.test(t))
    throw new Error("Invalid time format, expected HH:mm");
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
};

const minutesToTimeString = (mins) => {
  const hh = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const mm = (mins % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
};

const overlaps = (aStart, aEnd, bStart, bEnd) => {
  return !(aEnd <= bStart || bEnd <= aStart);
};

const isSameDate = (dateObj, yyyyMMdd) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}` === yyyyMMdd;
};

/* ---------- Controllers ---------- */

// GET departments by hospital
const getDepartments = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    if (!hospitalId)
      return res.status(400).json({ message: "hospitalId required" });

    const hospital = await Hospital.findOne({ hospital_id: hospitalId });
    if (!hospital)
      return res.status(404).json({ message: "Hospital not found" });

    const specializations = await Doctor.find({
      hospital_id: hospitalId,
    }).distinct("specialization");
    res.json({ hospitalId, departments: specializations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET doctors by department
const getDoctorsByDepartment = async (req, res) => {
  try {
    const { hospitalId, department, search } = req.query;
    if (!hospitalId || !department)
      return res
        .status(400)
        .json({ message: "hospitalId and department required" });

    const hospital = await Hospital.findOne({ hospital_id: hospitalId });
    if (!hospital)
      return res.status(404).json({ message: "Hospital not found" });

    const q = {
      hospital_id: hospitalId,
      specialization: department,
    };
    if (search) {
      q.name = { $regex: search, $options: "i" };
    }

    const doctors = await Doctor.find(q).select(
      "_id name specialization workingHours slotSize isAvailable"
    );
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ GET available slots (now using DoctorAvailability schema)
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      return res.status(400).json({ message: "doctorId and date required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: "date must be YYYY-MM-DD" });
    }

    // 1. Check doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (!doctor.isAvailable)
      return res.status(400).json({ message: "Doctor is not available" });

    // 2. Find availability entry for doctor & date
    const availability = await DoctorAvailability.findOne({ doctorId, date });
    if (!availability) {
      return res.json({ doctorId, date, slots: [] });
    }

    // 3. Get already booked appointments
    // const bookedAppointments = await Appointment.find({ doctorId, date });
    const bookedAppointments = await Appointment.find({ doctorId, date, status: "Scheduled" });

    const bookedSlots = bookedAppointments.map((ap) => ({
      start: ap.slotStart,
      end: ap.slotEnd,
    }));

    // 4. Build 30-min slots from availability.slots
    const allCandidateSlots = [];
    for (const slot of availability.slots) {
      let start = parseTimeToMinutes(slot.start);
      const end = parseTimeToMinutes(slot.end);
      while (start + 30 <= end) {
        allCandidateSlots.push({
          start: minutesToTimeString(start),
          end: minutesToTimeString(start + 30),
        });
        start += 30;
      }
    }

    // 5. Filter out booked ones
    const freeSlots = allCandidateSlots.filter(
      (slot) =>
        !bookedSlots.some((b) => b.start === slot.start && b.end === slot.end)
    );

    res.json({
      doctorId,
      date,
      slots: freeSlots,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST book appointment
const bookAppointment = async (req, res) => {
  try {
    const {
      hospitalId,
      doctorId,
      patientId,
      patientName,
      date,
      slotStart,
      appointmentType,
      sessionType,
      reason,
      slotDuration: bodySlotDuration,
    } = req.body;

    if (
      !hospitalId ||
      !doctorId ||
      !patientId ||
      !date ||
      !slotStart ||
      !sessionType
    ) {
      return res.status(400).json({
        message:
          "hospitalId, doctorId, patientId, date, slotStart and sessionType are required",
      });
    }

    const allowedSessions = ["checkup", "followup", "therapy", "consultation"];
    if (!allowedSessions.includes(sessionType)) {
      return res.status(400).json({ message: "Invalid sessionType" });
    }

    const allowedAppointmentTypes = ["manual", "virtual"];
    if (appointmentType && !allowedAppointmentTypes.includes(appointmentType)) {
      return res.status(400).json({ message: "Invalid appointmentType" });
    }

    const hospital = await Hospital.findOne({ hospital_id: hospitalId });
    if (!hospital)
      return res.status(404).json({ message: "Hospital not found" });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (!doctor.hospital_id || doctor.hospital_id !== hospitalId) {
      return res
        .status(400)
        .json({ message: "Doctor does not belong to the provided hospital" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const slotDuration = Number(bodySlotDuration) || doctor.slotSize || 30;
    const startMin = parseTimeToMinutes(slotStart);
    const endMin = startMin + Number(slotDuration);

    // Check for conflicts
    const existing = await Appointment.find({ doctorId: doctor._id, date });
    for (const ap of existing) {
      const aStart = parseTimeToMinutes(ap.slotStart);
      const aEnd = parseTimeToMinutes(ap.slotEnd);
      if (overlaps(startMin, endMin, aStart, aEnd)) {
        return res
          .status(409)
          .json({ message: "Slot conflict with existing appointment" });
      }
    }

    const appointment = new Appointment({
      hospitalId,
      doctorId: doctor._id,
      patientId: patient._id,
      date,
      slotStart,
      slotEnd: minutesToTimeString(endMin),
      patientName: patientName || patient.name || "",
      department: doctor.specialization,
      appointmentType: appointmentType || "manual",
      sessionType,
      reason: reason || "",
      slotDuration,
    });

    await appointment.save();

    res
      .status(201)
      .json({ message: "Appointment booked successfully", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all appointments of hospital
const getHospitalAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!patientId) {
      return res.status(400).json({ message: "patientId required" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const appointments = await Appointment.find({ patientId })
      .populate({ path: "doctorId", select: "name specialization" })
      .populate({ path: "hospitalId", select: "name" })
      .sort({ date: 1, slotStart: 1 });

    const result = appointments.map((ap) => ({
      appointmentId: ap._id,
      hospitalName: ap.hospitalId ? ap.hospitalId.name : null,
      doctorName: ap.doctorId ? ap.doctorId.name : null,
      specialization: ap.doctorId ? ap.doctorId.specialization : null,
      date: ap.date,
      time: `${ap.slotStart} - ${ap.slotEnd}`,
      sessionType: ap.sessionType,
      appointmentType: ap.appointmentType,
      reason: ap.reason || null,
      status: ap.status,
    }));

    res.json({ patientId, appointments: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cancel
const cancelAppointmentController = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const result = await cancelAppointment(appointmentId);
    res.json({ message: "Appointment cancelled successfully", appointment: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Reschedule
const rescheduleAppointmentController = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newSlotStart, newSlotDuration } = req.body;
    const result = await rescheduleAppointment(appointmentId, newSlotStart, newSlotDuration);
    res.json({ message: "Appointment rescheduled successfully", appointment: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


module.exports = {
  getDepartments,
  getDoctorsByDepartment,
  getAvailableSlots, // ✅ updated to use DoctorAvailability
  bookAppointment,
  getHospitalAppointments,
  cancelAppointment: cancelAppointmentController,
  rescheduleAppointment: rescheduleAppointmentController,
};