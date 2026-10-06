require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static("public"));

// 🟢 NEW: Object dictionary to keep track of active background timers by email
// Format looks like: { "connor@email.com": timerIDReference }
let activeStreams = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// THE CUSTOM TIMER ENGINE
const startCustomAlertStream = (email, textMessage, minMin, maxMin) => {
  const runStreamCycle = async () => {
    // Defensive check: If the user unsubscribed while this function was sleeping, stop immediately!
    if (!activeStreams[email]) {
      console.log(
        `🛑 Stream loop execution halted for [${email}] because they unsubscribed.`,
      );
      return;
    }

    try {
      console.log(
        `📡 [ACTIVE TRIGGER] Sending custom alert directly to: ${email}`,
      );
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "⏰ Alert Hub Nudge!",
        text: `Reminder: ${textMessage}`,
      });
      console.log(`✅ Custom alert successfully received by ${email}`);
    } catch (error) {
      console.error(
        `❌ Failed to deliver custom alert to ${email}:`,
        error.message,
      );
    } finally {
      // Check again if they unsubscribed during the email transmission
      if (!activeStreams[email]) return;

      const randomMs =
        Math.floor(Math.random() * (maxMin - minMin + 1) + minMin) * 60 * 1000;
      console.log(
        `⏳ [SNOOZE] Stream for [${email}] sleeping. Next alert: "${textMessage}" in ${(randomMs / 1000 / 60).toFixed(1)} mins...\n`,
      );

      // 🟢 CRITICAL: Overwrite the active tracking pointer with the new timeout ID reference
      activeStreams[email] = setTimeout(runStreamCycle, randomMs);
    }
  };

  const initialDelay =
    Math.floor(Math.random() * (maxMin - minMin + 1) + minMin) * 60 * 1000;
  console.log(
    `🚀 [STREAM INITIALIZED] Custom cycle mapped for ${email}. First drop in ${(initialDelay / 1000 / 60).toFixed(1)} mins...`,
  );

  // 🟢 CRITICAL: Save the initial execution ID timer into our tracking object dictionary
  activeStreams[email] = setTimeout(runStreamCycle, initialDelay);
};

// 1. WEB API REGISTRATION ROUTE
app.post("/api/register", async (req, res) => {
  const { email, customText, minMinutes, maxMinutes } = req.body;

  if (!email || !customText || !minMinutes || !maxMinutes) {
    return res
      .status(400)
      .json({
        success: false,
        error: "All configuration inputs are required.",
      });
  }

  // Check if they are already tracking an active stream
  if (activeStreams[email]) {
    return res
      .status(400)
      .json({
        success: false,
        error: "An active alert stream is already running for this email!",
      });
  }

  try {
    console.log(`➕ Processing registration configuration for: ${email}`);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "⚙️ Schedule Active!",
      text: `Hello! Your custom tracking stream ("${customText}") has been activated.`,
    });

    // Initialize tracking container key to tell our thread it is allowed to run
    activeStreams[email] = true;
    startCustomAlertStream(email, customText, minMinutes, maxMinutes);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Registration stream routing error:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Email backend pipeline failure." });
  }
});

// 2. 🟢 NEW: WEB API UNSUBSCRIBE ROUTE (Kills background loop timers)
app.delete("/api/unsubscribe", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Email address is required." });
  }

  // Check if the email actually exists in our active tracking system
  if (!activeStreams[email]) {
    return res
      .status(404)
      .json({
        success: false,
        error: "No active scheduling stream found for this email address.",
      });
  }

  try {
    console.log(`🗑️ Processing unsubscribe request for: ${email}`);

    // ⚡ THE MAGIC: Pull down the saved timer pointer reference and completely shut off the clock cycle!
    clearTimeout(activeStreams[email]);

    // Delete their reference index out of our active tracking system entirely
    delete activeStreams[email];

    console.log(
      `🚫 Background scheduling loop permanently terminated for [${email}].`,
    );

    // Send a polite text confirmation email letting them know alerts have ended
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🚫 Alerts Cancelled",
      text: "Hello! This email confirms that your custom reminder scheduling stream has been deactivated and removed from our active servers.",
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Unsubscribe pipeline processing error:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to process cancel operation." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Success! Your server is running at http://localhost:${PORT}`);
});
