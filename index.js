const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

// 🔐 Rate limit store
let requestTracker = {};

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
    res.json({ status: "RailEats OTP Server Running 🚀" });
});

// ================= SEND OTP =================
app.post("/send-otp", async (req, res) => {
    const { phone } = req.body;

    if (!phone || phone.length !== 10) {
        return res.status(400).json({
            success: false,
            message: "Invalid phone number"
        });
    }

    // ⛔ Rate limit (30 sec)
    const now = Date.now();
    if (requestTracker[phone] && now - requestTracker[phone] < 30000) {
        return res.json({
            success: false,
            message: "Wait 30 seconds before retry"
        });
    }
    requestTracker[phone] = now;

    try {
        const response = await axios.get(
   `https://2factor.in/API/V1/${API_KEY}/SMS/${phone}/AUTOGEN`
);

        console.log("SEND OTP Response:", response.data);

        if (response.data.Status === "Success") {
            return res.json({
                success: true,
                sessionId: response.data.Details,
                message: "OTP sent successfully"
            });
        } else {
            return res.json({
                success: false,
                message: response.data.Details || "OTP send failed"
            });
        }

    } catch (err) {
        console.error("SEND ERROR:", err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            message: "OTP send failed"
        });
    }
});

// ================= VERIFY OTP =================
app.post("/verify-otp", async (req, res) => {
    const { sessionId, otp } = req.body;

    if (!sessionId || !otp) {
        return res.status(400).json({
            success: false,
            message: "Missing sessionId or otp"
        });
    }

    try {
        const response = await axios.get(
            `https://2factor.in/API/V1/${API_KEY}/SMS/VERIFY/${sessionId}/${otp}`
        );

        console.log("VERIFY OTP Response:", response.data);

        if (response.data.Status === "Success") {
            return res.json({
                success: true,
                message: "OTP verified successfully"
            });
        } else {
            return res.json({
                success: false,
                message: response.data.Details || "Invalid OTP"
            });
        }

    } catch (err) {
        console.error("VERIFY ERROR:", err.response?.data || err.message);
        return res.status(500).json({
            success: false,
            message: "OTP verification failed"
        });
    }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});