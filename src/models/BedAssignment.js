const mongoose = require("mongoose");

const BedAssignmentSchema = new mongoose.Schema({
  patient_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Patient", 
    required: true 
  },
  bed_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Bed", 
    required: true 
  },
  nurse_id: { type: mongoose.Schema.Types.ObjectId, ref: "Receptionist" },

  assigned_date: { type: Date, default: Date.now },
  discharge_date: { type: Date, default: null },
});

module.exports = mongoose.model("BedAssignment", BedAssignmentSchema);
