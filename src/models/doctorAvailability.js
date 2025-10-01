const mongoose = require("mongoose");

const doctorAvailabilitySchema = new mongoose.Schema({
  hospitalId: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  date: { type: String, required: true }, // format: YYYY-MM-DD
  slots: [
    {
      start: { type: String, required: true }, // e.g. "10:00"
      end: { type: String, required: true }    // e.g. "10:30"
    }
  ]
});

// ✅ Prevent OverwriteModelError by reusing existing model if it exists
module.exports =
  mongoose.models.DoctorAvailability ||
  mongoose.model("DoctorAvailability", doctorAvailabilitySchema);
