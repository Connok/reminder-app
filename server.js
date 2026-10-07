require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose"); // Load Mongoose database driver

const app = express();
const PORT = process.env.PORT || 3000; // Render sets process.env.PORT automatically

app.use(express.json());
app.use(express.static("public"));

// 1. OBJECT DICTIONARY TO HOLD LIVE RUNTIME TIMEOUT TIMERS
let activeStreams = {};

// 2. CONNECT TO CLOUD MONGO DATABASE
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("🍃 MongoDB Cloud Database Connected Successfully.");
    // 🚀 FAULT TOLERANCE BOOT-UP: Automatically respawn active loops on boot
    await recoverActiveStreamsOnBoot();
  })
  .catch((err) =>
    console.error("❌ Cloud Database connection failure:", err.message),
  );

// 3. DEFINE THE PORTFOLIO DATA SCHEMA
const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  customText: { type: String, required: true },
  minMinutes: { type: Number, required: true },
  maxMinutes: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Subscriber = mongoose.model("Subscriber", subscriberSchema);

// Configure your secure Gmail transmitter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  porty: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
});

// 4. THE CUSTOM TIMER LOOP INJECTOR
const startCustomAlertStream = (email, textMessage, minMin, maxMin) => {
  const runStreamCycle = async () => {
    // Defensive check: verify they still exist inside the live streaming tracking dictionary
    if (!activeStreams[email]) {
      console.log(
        `🛑 Stream loop execution halted for [${email}] (Unsubscribed).`,
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

      activeStreams[email] = setTimeout(runStreamCycle, randomMs);
    }
  };

  const initialDelay =
    Math.floor(Math.random() * (maxMin - minMin + 1) + minMin) * 60 * 1000;
  console.log(
    `🚀 [STREAM STANDBY] Loop mapped for ${email}. First drop in ${(initialDelay / 1000 / 60).toFixed(1)} mins...`,
  );

  activeStreams[email] = setTimeout(runStreamCycle, initialDelay);
};

// 5. BOOT-UP RECOVERY ENGINE
const recoverActiveStreamsOnBoot = async () => {
  try {
    // Look into the database and pull every single active subscriber record
    const activeUsers = await Subscriber.find({});

    if (activeUsers.length === 0) {
      console.log(
        "ℹ️ Staging Server check: No active subscriber profiles stored in database collections.",
      );
      return;
    }

    console.log(
      `🔄 System Recovery: Found ${activeUsers.length} subscribers in cloud collections. Re-initializing streams...`,
    );

    for (const user of activeUsers) {
      activeStreams[user.email] = true; // Allocate a key inside tracking pointer
      startCustomAlertStream(
        user.email,
        user.customText,
        user.minMinutes,
        user.maxMinutes,
      );
    }
  } catch (error) {
    console.error("❌ Boot recovery routine crashed:", error.message);
  }
};

// 6. WEB API REGISTRATION ROUTE (Writes to Cloud DB)
app.post("/api/register", async (req, res) => {
  const { email, customText, minMinutes, maxMinutes } = req.body;

  if (!email || !customText || !minMinutes || !maxMinutes) {
    return res.status(400).json({
      success: false,
      error: "All configuration inputs are required.",
    });
  }

  if (activeStreams[email]) {
    return res.status(400).json({
      success: false,
      error: "An active alert stream is already running for this email!",
    });
  }

  // Convert text inputs into clean whole numbers before sending them to the timer engine
  const parsedMin = parseInt(minMinutes);
  const parsedMax = parseInt(maxMinutes);

  try {
    console.log(
      `🍃 Database operation: Writing new subscriber record for ${email}`,
    );

    // Save user settings directly into MongoDB Cloud Collections
    await Subscriber.create({
      email,
      customText,
      minMinutes: parsedMin,
      maxMinutes: parsedMax,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "⚙️ Schedule Active!",
      text: `Hello! Your custom tracking stream ("${customText}") has been activated and saved to our database servers.`,
    });

    // Toggle tracking loop and initialize stream instance
    activeStreams[email] = true;
    startCustomAlertStream(email, customText, parsedMin, parsedMax);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Registration routing error:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error:
          "Email configuration constraint violation: Profile already exists.",
      });
    }
    res.status(500).json({
      success: false,
      error: "Database persistence pipeline failure.",
    });
  }
});

// 7. 🟢 CLOUD-OPTIMIZED WEB API UNSUBSCRIBE ROUTE (Removes from Cloud DB & safely kills timers)
app.delete("/api/unsubscribe", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Email address is required." });
  }

  try {
    console.log(`🗑️ Processing cloud unsubscribe pipeline for: ${email}`);

    // 1. DEFENSIVE STEP: Instantly halt any active background clocks in memory first
    if (activeStreams[email]) {
      clearTimeout(activeStreams[email]);
      // Set to false instead of deleting immediately so sleeping functions know to stop
      activeStreams[email] = false;
    }

    // 2. DATABASE STEP: Pull the record completely out of MongoDB Atlas
    const deletedUser = await Subscriber.findOneAndDelete({ email: email });

    if (!deletedUser) {
      // Clean up memory slot if user wasn't in DB
      delete activeStreams[email];
      return res.status(404).json({
        success: false,
        error: "No database record matching that subscriber email found.",
      });
    }

    // 3. FINAL CLEANUP: Safely remove the tracking key from our memory dictionary
    delete activeStreams[email];

    console.log(
      `🚫 Background scheduling loop permanently terminated for [${email}]. Data deleted.`,
    );

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🚫 Alerts Cancelled",
      text: "Hello! This email confirms that your custom reminder scheduling stream has been permanently removed from our active database servers.",
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Unsubscribe database execution error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to process cancel operation inside cloud databanks.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Success! Your server is running at http://localhost:${PORT}`);
});
