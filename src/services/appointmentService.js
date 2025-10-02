// src/services/appointmentService.js
const Appointment = require("../models/Appointment");
const DoctorAvailability = require("../models/DoctorAvailability"); // ✅ added

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

// src/services/appointmentService.js

const cancelAppointment = async (appointmentId) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new Error("Appointment not found");

  if (appointment.status === "Cancelled") {
    throw new Error("Appointment is already cancelled");
  }

  // 1. Mark appointment as cancelled
  appointment.status = "Cancelled";
  await appointment.save();

  // 2. Restore slot into DoctorAvailability
  const availability = await DoctorAvailability.findOne({
    doctorId: appointment.doctorId,
    date: appointment.date,
  });

  if (availability) {
    // Ensure we always work in 30-min slots
    const start = appointment.slotStart;
    const end = appointment.slotEnd;

    const alreadyExists = availability.slots.some(
      (s) => s.start === start && s.end === end
    );

    if (!alreadyExists) {
      availability.slots.push({ start, end });
      // Sort slots for clean order
      availability.slots.sort((a, b) => a.start.localeCompare(b.start));
      await availability.save();
    }
  } else {
    // If no availability exists for that date, create new entry
    await DoctorAvailability.create({
      hospitalId: appointment.hospitalId,
      doctorId: appointment.doctorId,
      date: appointment.date,
      slots: [{ start: appointment.slotStart, end: appointment.slotEnd }],
    });
  }

  return appointment;
};

/* -------------------- Reschedule Appointment -------------------- */
const rescheduleAppointment = async (appointmentId, newSlotStart, newSlotDuration) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw new Error("Appointment not found");

  if (appointment.status === "Cancelled") {
    throw new Error("Cancelled appointment cannot be rescheduled");
  }

  const duration = Number(newSlotDuration) || appointment.slotDuration || 30;
  const startMin = parseTimeToMinutes(newSlotStart);
  const newSlotEnd = minutesToTimeString(startMin + duration);

  // Check slot conflicts (ignore cancelled ones)
  const existing = await Appointment.find({
    doctorId: appointment.doctorId,
    date: appointment.date,   // keep same date
    status: "Scheduled",      // ✅ only check active ones
    _id: { $ne: appointment._id }, // exclude current one
  });

  for (const ap of existing) {
    const aStart = parseTimeToMinutes(ap.slotStart);
    const aEnd = parseTimeToMinutes(ap.slotEnd);
    if (!(startMin + duration <= aStart || aEnd <= startMin)) {
      throw new Error("Slot conflict with existing appointment");
    }
  }

  // Update appointment
  appointment.slotStart = newSlotStart;
  appointment.slotEnd = newSlotEnd;
  appointment.slotDuration = duration;
  appointment.status = "Scheduled"; // ensure active
  await appointment.save();

  return appointment;
};

module.exports = { cancelAppointment, rescheduleAppointment };
