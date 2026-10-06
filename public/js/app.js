const form = document.getElementById("registrationForm");
const statusMessage = document.getElementById("statusMessage");
const unsubForm = document.getElementById("unsubscribeForm");
const unsubStatusMessage = document.getElementById("unsubStatusMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("emailInput").value;
  const alertMessage = document.getElementById("messageInput").value;
  const minMinutes = parseInt(document.getElementById("minTimeInput").value);
  const maxMinutes = parseInt(document.getElementById("maxTimeInput").value);

  // Defensive Guard Rails: Make sure Max isn't smaller than Min
  if (maxMinutes < minMinutes) {
    statusMessage.style.color = "#dc2626";
    statusMessage.textContent =
      "❌ Error: Max minutes cannot be less than Min minutes.";
    return;
  }

  statusMessage.style.color = "#0284c7";
  statusMessage.textContent = "⏳ Spawning your custom schedule...";

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,
        customText: alertMessage,
        minMinutes: minMinutes,
        maxMinutes: maxMinutes,
      }),
    });

    const data = await response.json();

    if (data.success) {
      statusMessage.style.color = "#16a34a";
      statusMessage.textContent = "✅ Success! Custom stream activated.";
      form.reset();
    } else {
      statusMessage.style.color = "#dc2626";
      statusMessage.textContent = "❌ Error: " + data.error;
    }
  } catch (err) {
    statusMessage.style.color = "#dc2626";
    statusMessage.textContent = "❌ Could not connect to backend server.";
  }
});

unsubForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("unsubEmailInput").value;
  unsubStatusMessage.style.color = "#7c3aed";
  unsubStatusMessage.textContent = "⏳ Processing removal request...";

  try {
    const response = await fetch("/api/unsubscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email }),
    });

    const data = await response.json();

    if (data.success) {
      unsubStatusMessage.style.color = "#16a34a";
      unsubStatusMessage.textContent =
        "✅ Success! Your alerts have been stopped.";
      unsubForm.reset();
    } else {
      unsubStatusMessage.style.color = "#dc2626";
      unsubStatusMessage.textContent = "❌ Error: " + data.error;
    }
  } catch (err) {
    unsubStatusMessage.style.color = "#dc2626";
    unsubStatusMessage.textContent = "❌ Could not connect to backend server.";
  }
});
