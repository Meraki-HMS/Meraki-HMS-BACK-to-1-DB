const Otp = require("../models/Otp");
// const User = require("../models/User");
const { sendOtpToMobile } = require("../utils/sendOtp");
const bcrypt = require("bcrypt");
const Patient = require("../models/Patient");
const jwt = require("jsonwebtoken");

// --- Send OTP ---
const sendOtp = async (req, res) => {
  const { mobile } = req.body;
  if (!mobile) return res.status(400).json({ message: "Mobile is required" });

  const otp = await sendOtpToMobile(mobile);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await Otp.findOneAndUpdate(
    { mobile },
    { otp, expiresAt },
    { upsert: true, new: true }
  );

  return res
    .status(200)
    .json({ success: true, message: "OTP sent successfully" });
};

// --- Verify OTP ---
const verifyOtp = async (req, res) => {
  const { mobile, otp } = req.body;

  if (!mobile || !otp)
    return res.status(400).json({ message: "Missing fields" });

  const record = await Otp.findOne({ mobile });

  if (!record)
    return res.status(400).json({ message: "OTP not found or expired" });
  if (record.otp !== otp)
    return res.status(400).json({ message: "Invalid OTP" });
  if (record.expiresAt < Date.now())
    return res.status(400).json({ message: "OTP expired" });

  await Otp.findOneAndUpdate({ mobile }, { verified: true });

  return res
    .status(200)
    .json({ success: true, message: "OTP verified successfully" });
};







module.exports = {
  sendOtp,
  verifyOtp, 
};