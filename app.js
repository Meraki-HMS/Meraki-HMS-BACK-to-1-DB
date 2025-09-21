const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./src/config/ConnectToMongoDb');
const dotenv = require('dotenv');

// Route imports
const patientRoutes = require('./src/routes/patientRoutes');
const receptionistRoutes = require('./src/routes/receptionistRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const hospitalRoutes = require('./src/routes/hospitalRoutes');
const authRoutes = require('./src/routes/authRoutes');
const appointmentRoutes = require('./src/routes/appointmentsRoutes'); // Added appointments routes

dotenv.config(); 

// Initialize the app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Welcome to the Hospital Management System API");
});

app.use("/api/auth", authRoutes);
app.use("/patients", patientRoutes);
app.use("/receptionists", receptionistRoutes);
app.use("/doctors", doctorRoutes);
app.use("/hospitals", hospitalRoutes);
app.use("/appointments", appointmentRoutes); // Added appointments route

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
