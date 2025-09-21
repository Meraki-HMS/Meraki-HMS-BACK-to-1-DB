// src/controllers/patientAppointmentController.js
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Hospital = require("../models/Hospital");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");

/* ---------- Helpers ---------- */
const parseTimeToMinutes = (t) => {
  if (!/^\d{2}:\d{2}$/.test(t)) throw new Error("Invalid time format, expected HH:mm");
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
};

const minutesToTimeString = (mins) => {
  const hh = Math.floor(mins / 60).toString().padStart(2, "0");
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
    if (!hospitalId) return res.status(400).json({ message: "hospitalId required" });

    const hospital = await Hospital.findOne({ hospital_id: hospitalId });
    if (!hospital) return res.status(404).json({ message: "Hospital not found" });

    const specializations = await Doctor.find({ hospital_id: hospital._id }).distinct("specialization");
    res.json({ hospitalId, departments: specializations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET doctors by department
const getDoctorsByDepartment = async (req, res) => {
  try {
    const { hospitalId, department, search } = req.query;
    if (!hospitalId || !department) return res.status(400).json({ message: "hospitalId and department required" });

    const hospital = await Hospital.findOne({ hospital_id: hospitalId });
    if (!hospital) return res.status(404).json({ message: "Hospital not found" });

    const q = {
      hospital_id: hospital._id,
      specialization: department
    };
    if (search) {
      q.name = { $regex: search, $options: "i" };
    }

    const doctors = await Doctor.find(q).select("_id name specialization workingHours slotSize isAvailable");
    res.json({ doctors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET available slots
const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return res.status(400).json({ message: "doctorId and date required" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: "date must be YYYY-MM-DD" });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    if (!doctor.isAvailable) return res.status(400).json({ message: "Doctor is not available" });

    // holiday check
    if (doctor.holidays && doctor.holidays.length > 0) {
      for (const h of doctor.holidays) {
        if (isSameDate(h, date)) {
          return res.json({ date, slots: [] });
        }
      }
    }

    const slotDuration = doctor.slotSize || 30;
    const workStart = parseTimeToMinutes(doctor.workingHours.start);
    const workEnd = parseTimeToMinutes(doctor.workingHours.end);

    const existing = await Appointment.find({ doctorId: doctor._id, date });

    const candidateSlots = [];
    for (let start = workStart; start + slotDuration <= workEnd; start += slotDuration) {
      const end = start + slotDuration;

      let inBreak = false;
      if (doctor.breaks && doctor.breaks.length) {
        for (const br of doctor.breaks) {
          const brStart = parseTimeToMinutes(br.start);
          const brEnd = parseTimeToMinutes(br.end);
          if (overlaps(start, end, brStart, brEnd)) {
            inBreak = true;
            break;
          }
        }
      }
      if (inBreak) continue;

      let conflict = false;
      for (const ap of existing) {
        const aStart = parseTimeToMinutes(ap.slotStart);
        const aEnd = parseTimeToMinutes(ap.slotEnd);
        if (overlaps(start, end, aStart, aEnd)) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      candidateSlots.push({
        slotStart: minutesToTimeString(start),
        slotEnd: minutesToTimeString(end)
      });
    }

    res.json({
      doctorId,
      date,
      slotDuration,
      slots: candidateSlots
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
      slotDuration: bodySlotDuration
    } = req.body;

    if (!hospitalId || !doctorId || !patientId || !date || !slotStart || !sessionType) {
      return res.status(400).json({ message: "hospitalId, doctorId, patientId, date, slotStart and sessionType are required" });
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
    if (!hospital) return res.status(404).json({ message: "Hospital not found" });

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    if (!doctor.hospital_id || !doctor.hospital_id.equals(hospital._id)) {
      return res.status(400).json({ message: "Doctor does not belong to the provided hospital" });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    const slotDuration = Number(bodySlotDuration) || doctor.slotSize || 30;

    const startMin = parseTimeToMinutes(slotStart);
    const endMin = startMin + Number(slotDuration);

    const workStartMin = parseTimeToMinutes(doctor.workingHours.start);
    const workEndMin = parseTimeToMinutes(doctor.workingHours.end);

    if (startMin < workStartMin || endMin > workEndMin) {
      return res.status(400).json({ message: "Slot is outside doctor's working hours" });
    }

    if (doctor.holidays && doctor.holidays.length) {
      for (const h of doctor.holidays) {
        if (isSameDate(h, date)) {
          return res.status(400).json({ message: "Doctor is on holiday" });
        }
      }
    }

    if (doctor.breaks && doctor.breaks.length) {
      for (const br of doctor.breaks) {
        const brStart = parseTimeToMinutes(br.start);
        const brEnd = parseTimeToMinutes(br.end);
        if (overlaps(startMin, endMin, brStart, brEnd)) {
          return res.status(400).json({ message: "Slot overlaps doctor's break" });
        }
      }
    }

    const existing = await Appointment.find({ doctorId: doctor._id, date });
    for (const ap of existing) {
      const aStart = parseTimeToMinutes(ap.slotStart);
      const aEnd = parseTimeToMinutes(ap.slotEnd);
      if (overlaps(startMin, endMin, aStart, aEnd)) {
        return res.status(409).json({ message: "Slot conflict with existing appointment" });
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
      slotDuration
    });

    await appointment.save();

    res.status(201).json({ message: "Appointment booked successfully", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all appointments of hospital
const getHospitalAppointments = async (req, res) => {
  try {
    const { hospitalId } = req.params;
    if (!hospitalId) return res.status(400).json({ message: "hospitalId required" });

    const hospital = await Hospital.findOne({ hospital_id: hospitalId });
    if (!hospital) return res.status(404).json({ message: "Hospital not found" });

    const appointments = await Appointment.find({ hospitalId })
      .populate({ path: "doctorId", select: "name" })
      .sort({ date: 1, slotStart: 1 });

    const result = appointments.map((ap) => ({
      appointmentId: ap._id,
      date: ap.date,
      sessionType: ap.sessionType,
      appointmentType: ap.appointmentType,
      time: `${ap.slotStart} - ${ap.slotEnd}`,
      doctorName: ap.doctorId ? ap.doctorId.name : null,
      patientName: ap.patientName || null,
      status: ap.status
    }));

    res.json({ hospitalId, appointments: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getDepartments,
  getDoctorsByDepartment,
  getAvailableSlots,
  bookAppointment,
  getHospitalAppointments
};
