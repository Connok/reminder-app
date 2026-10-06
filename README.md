# Custom Micro-Task Dynamic Alert Engine ⏰

A full-stack, event-driven background alerting utility designed to deliver custom, user-defined reminder notifications at completely unpredictable (stochastic) randomized intervals. Built natively using decoupled frontend architecture and a persistent cloud database layer to ensure system fault tolerance.

## 🛠️ The Tech Stack

- **Frontend View:** Clean, semantic HTML5 structure with no inline formatting.
- **Frontend Design:** Responsive UI layer styled using modern CSS Custom variables and Lavender/Amethyst typography color palettes.
- **Backend Runtime:** Node.js powered by the Express framework to handle asynchronous API request-response pipelines.
- **Database Engine:** MongoDB Atlas (NoSQL Cloud Cluster) managed via the Mongoose Object Data Modeling (ODM) driver.
- **Communication Gateway:** Nodemailer SMTP pipeline linked to an isolated secure staging credential server.

## 🧠 Core Engineering Principles Implemented

### 1. Separation of Concerns (Decoupled Assets)

The client-side view, application styling blocks, and script processing workflows are completely isolated into independent files (`index.html`, `style.css`, and `app.js`). This mirrors enterprise-grade repository structures and ensures high maintainability.

### 2. Standalone Thread Architecture & Clean Cleanup

Instead of running a single heavy global interval clock, this system generates an independent asynchronous background tracking thread (`setTimeout`) uniquely allocated for each active subscriber payload. When a user requests an unsubscribe operation, the backend queries the specific thread reference and triggers a clean `clearTimeout()` process to instantly clear server runtime memory allocations.

### 3. Persistent State & Boot-Up Fault Recovery

To ensure the platform is resilient against unexpected hardware crashes or server terminations, all scheduling bounds and text structures are committed live to cloud databanks. Upon reboot, the application automatically performs a database collection scan and instantly respawns every active scheduler thread exactly where it left off, creating a resilient, self-healing system environment.

### 4. Security Token Isolation

All critical infrastructure keys, network bridge connections, and secret SMTP pass-tokens are kept entirely detached from the codebase logic using an environmental variable array (`.env`), which is securely blacklisted from version tracking inside `.gitignore`.
