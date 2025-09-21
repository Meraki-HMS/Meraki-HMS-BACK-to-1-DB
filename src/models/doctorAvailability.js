const mongoose = require("mongoose");

const doctorAvailabilitySchema = new mongoose.Schema({
  hospitalId: { type: String, required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  date: { type: String, required: true },  // format: YYYY-MM-DD
  slots: [
    {
      start: { type: String, required: true }, // "10:00"
      end: { type: String, required: true }    // "10:30"
    }
  ]
});

module.exports = mongoose.model("doctorAvailability", doctorAvailabilitySchema);
