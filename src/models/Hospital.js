const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema({
  hospital_id: { type: String, unique: true }, // e.g., HOSP01, HOSP02
  name: { type: String, required: true, maxlength: 150 },
  address: { type: String, required: true, maxlength: 250 },
  contact: { type: String, maxlength: 15 },
  email: { type: String, maxlength: 100 },
  createdAt: { type: Date, default: Date.now },
});

// ✅ Auto-generate hospital_id like HOSP01, HOSP02
hospitalSchema.pre("save", async function (next) {
  if (!this.hospital_id) {
    const lastHospital = await mongoose.model("Hospital").findOne().sort({ createdAt: -1 });

    if (lastHospital && lastHospital.hospital_id) {
      // Extract numeric part from HOSPxx
      const lastNum = parseInt(lastHospital.hospital_id.replace("HOSP", "")) || 0;
      this.hospital_id = "HOSP" + String(lastNum + 1).padStart(2, "0");
    } else {
      this.hospital_id = "HOSP01"; // First hospital
    }
  }
  next();
});

module.exports = mongoose.model("Hospital", hospitalSchema);
