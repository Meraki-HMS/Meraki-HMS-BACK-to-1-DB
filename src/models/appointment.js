const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  hospitalId: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "ReceptionistPatient", required: true },
  date: { type: String, required: true },
  slotStart: { type: String, required: true },
  slotEnd: { type: String, required: true },
  status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("appointment", appointmentSchema);
