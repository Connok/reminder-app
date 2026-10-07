require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { Resend } = require("resend"); // Load the Resend API module

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// Live background loop tracking dictionary
let activeStreams = {};

// Initialize Resend with your secure cloud environment variable key
const resend = new Resend(process.env.RESEND_API_KEY);

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("🍃 MongoDB Cloud Database Connected Successfully.");
    await recoverActiveStreamsOnBoot();
  })
  .catch((err) =>
    console.error("❌ Cloud Database connection failure:", err.message),
  );

// Persistent Subscriber Schema Mappings
const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  customText: { type: String, required: true },
  minMinutes: { type: Number, required: true },
  maxMinutes: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Subscriber = mongoose.model("Subscriber", subscriberSchema);

// Dynamic isolated timer loop cycle controller
const startCustomAlertStream = (email, textMessage, minMin, maxMin) => {
  const runStreamCycle = async () => {
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

      //  Clean, modern API call that passes smoothly over Render's web ports
      await resend.emails.send({
        from: "NudgeFlow <onboarding@resend.dev>", // Free tier default verified testing sender
        to: email,
        subject: "⏰ NudgeFlow Alert!",
        text: `Reminder: ${textMessage}`,
      });

      console.log(`✅ Custom alert successfully received by ${email}`);
    } catch (error) {
      console.error(
        `❌ Failed to deliver custom alert to ${email}:`,
        error.message,
      );
    } finally {
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

// Automatic fault tolerance boot recovery helper
const recoverActiveStreamsOnBoot = async () => {
  try {
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
      activeStreams[user.email] = true;
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

// REGISTER NEW REMINDER (POST)
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

  const parsedMin = parseInt(minMinutes);
  const parsedMax = parseInt(maxMinutes);

  try {
    console.log(
      `🍃 Database operation: Writing new subscriber record for ${email}`,
    );
    await Subscriber.create({
      email,
      customText,
      minMinutes: parsedMin,
      maxMinutes: parsedMax,
    });

    // Welcoming email dispatched over API
    await resend.emails.send({
      from: "NudgeFlow <onboarding@resend.dev>",
      to: email,
      subject: "⚙️ Schedule Active!",
      text: `Hello! Your custom NudgeFlow stream ("${customText}") has been activated and saved securely.`,
    });

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

// CANCEL ACTIVE REMINDER (DELETE)
app.delete("/api/unsubscribe", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Email address is required." });
  }

  try {
    console.log(`🗑️ Processing cloud unsubscribe pipeline for: ${email}`);

    if (activeStreams[email]) {
      clearTimeout(activeStreams[email]);
      activeStreams[email] = false;
    }

    const deletedUser = await Subscriber.findOneAndDelete({ email: email });

    if (!deletedUser) {
      delete activeStreams[email];
      return res.status(404).json({
        success: false,
        error: "No database record matching that subscriber email found.",
      });
    }

    delete activeStreams[email];
    console.log(
      `🚫 Background scheduling loop permanently terminated for [${email}]. Data deleted.`,
    );

    // Cancellation email dispatched over API
    await resend.emails.send({
      from: "NudgeFlow <onboarding@resend.dev>",
      to: email,
      subject: "🚫 Alerts Cancelled",
      text: "Hello! This email confirms that your custom reminder scheduling stream has been permanently deactivated.",
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
