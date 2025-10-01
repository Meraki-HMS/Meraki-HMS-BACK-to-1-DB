const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  // === original fields (kept) ===
  hospitalId: { type: String, required: true }, 
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "ReceptionistPatient", required: true },
  date: { type: String, required: true },       // "YYYY-MM-DD"
  slotStart: { type: String, required: true },  // "HH:mm"
  slotEnd: { type: String, required: true },    // "HH:mm"
  status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" },
  createdAt: { type: Date, default: Date.now },

  // === new fields ===
  patientName: { type: String },
  department: { type: String },
  appointmentType: { type: String, enum: ["manual", "virtual"], default: "manual" },
  sessionType: { type: String, enum: ["checkup", "followup", "therapy", "consultation"], required: true },
  reason: { type: String },
  slotDuration: { type: Number, default: 30 }
});

// index for conflict detection
appointmentSchema.index({ doctorId: 1, date: 1, slotStart: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
