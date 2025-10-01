// src/utils/email.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // ✅ important for Gmail on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendCancellationEmail(to, patientName, doctorName, hospitalName, date, slotStart, slotEnd) {
  if (!to) return; // no email to send

  const subject = `Appointment Cancelled — ${hospitalName || ""}`;
  const text = `Dear ${patientName || "Patient"},\n\n` +
    `Your appointment with Dr. ${doctorName || ""} on ${date} at ${slotStart} - ${slotEnd} has been cancelled due to doctor's unavailability.\n\n` +
    `Please contact the hospital or use the booking portal to reschedule. We apologize for the inconvenience.\n\n` +
    `Regards,\n${hospitalName || "Hospital"}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || "no-reply@meraki-hms.com",
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error("Failed to send cancellation email:", err);
    return false;
  }
}
console.log("SMTP Config:", process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS);


module.exports = { sendCancellationEmail };
