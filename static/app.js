/**
 * AI IT Incident Response Agent - Frontend Controller
 * Pure Vanilla JavaScript (Clean, Fast, Responsive)
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- 1. State Management ---
  const state = {
    sessionId: generateUUID(),
    activeTab: "tab-triage",
    isSubmitting: false,
    theme: localStorage.getItem("it_theme") || "light",
  };

  function generateUUID() {
    if (crypto && crypto.randomUUID) {
      return crypto.randomUUID().slice(0, 8);
    }
    return Math.random().toString(36).substring(2, 10);
  }

  // --- 2. DOM Elements ---
  const sessionTag = document.getElementById("sessionTag");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const resetDemoBtn = document.getElementById("resetDemoBtn");
  const incidentForm = document.getElementById("incidentForm");
  const incidentInput = document.getElementById("incidentInput");
  const submitBtn = document.getElementById("submitBtn");
  const clearBtn = document.getElementById("clearBtn");
  const scenarioChips = document.getElementById("scenarioChips");

  // Response Elements
  const responsePlaceholder = document.getElementById("responsePlaceholder");
  const responseContent = document.getElementById("responseContent");
  const replyText = document.getElementById("replyText");
  const responseStatusBadge = document.getElementById("responseStatusBadge");
  const humanAlertBanner = document.getElementById("humanAlertBanner");

  // Inspector Tabs
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Triage Tab Elements
  const triageDetails = document.getElementById("triageDetails");
  const triageJsonCode = document.getElementById("triageJsonCode");

  // Timeline & Trace Elements
  const stepsTimeline = document.getElementById("stepsTimeline");
  const traceBox = document.getElementById("traceBox");

  // HITL Elements
  const resetUserId = document.getElementById("resetUserId");
  const resetApprover = document.getElementById("resetApprover");
  const agentResetBtn = document.getElementById("agentResetBtn");
  const humanApproveBtn = document.getElementById("humanApproveBtn");
  const resetToolResult = document.getElementById("resetToolResult");
  const refreshTicketsBtn = document.getElementById("refreshTicketsBtn");
  const ticketsTbody = document.getElementById("ticketsTbody");

  // --- 3. Initialize UI ---
  applyTheme(state.theme);
  sessionTag.textContent = `Session: ${state.sessionId}`;
  loadTickets();

  // --- 4. Event Listeners ---

  // Theme Toggle
  themeToggleBtn.addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    localStorage.setItem("it_theme", state.theme);
    applyTheme(state.theme);
  });

  function applyTheme(theme) {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }

  // Reset Demo State
  resetDemoBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/reset-demo", { method: "POST" });
      const data = await res.json();
      alert("In-memory demo state, tickets, and simulated faults reset successfully.");
      loadTickets();
      resetToolResult.innerHTML = "<em>Demo state refreshed.</em>";
    } catch (e) {
      console.error(e);
    }
  });

  // Scenario Chips
  scenarioChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const text = chip.getAttribute("data-text");
    if (text) {
      incidentInput.value = text;
      incidentInput.focus();
    }
  });

  // Clear Button
  clearBtn.addEventListener("click", () => {
    incidentInput.value = "";
    incidentInput.focus();
  });

  // Tab Navigation
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTabId = btn.getAttribute("data-tab");
      switchTab(targetTabId);
    });
  });

  function switchTab(tabId) {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabPanes.forEach((p) => p.classList.remove("active"));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const activePane = document.getElementById(tabId);

    if (activeBtn) activeBtn.classList.add("active");
    if (activePane) activePane.classList.add("active");
    state.activeTab = tabId;
  }

  // Submit Incident Form
  incidentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = incidentInput.value.trim();
    if (!text || state.isSubmitting) return;

    setLoading(true);

    try {
      const response = await fetch("/api/incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          session_id: state.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      renderIncidentResponse(data);
      loadTickets();
    } catch (err) {
      console.error("Submission failed:", err);
      renderErrorResponse("Could not contact the incident processing server. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    state.isSubmitting = loading;
    if (loading) {
      submitBtn.classList.add("loading");
      submitBtn.disabled = true;
      responsePlaceholder.classList.remove("hidden");
      responsePlaceholder.innerHTML = `
        <div class="empty-icon">⚙️</div>
        <p>Orchestrating agents, running safety guardrails, and querying diagnostics...</p>
      `;
      responseContent.classList.add("hidden");
    } else {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  }

  // --- 5. Render Response & Telemetry ---
  function renderIncidentResponse(data) {
    responsePlaceholder.classList.add("hidden");
    responseContent.classList.remove("hidden");

    replyText.textContent = data.reply || "No reply generated.";

    // Status Badge & Escalation Alert
    if (data.blocked_reason) {
      responseStatusBadge.className = "badge badge-danger";
      responseStatusBadge.textContent = `Blocked: ${data.blocked_reason}`;
      humanAlertBanner.className = "alert-banner danger";
      humanAlertBanner.classList.remove("hidden");
      humanAlertBanner.innerHTML = `
        <span class="alert-icon">🛑</span>
        <div class="alert-text">
          <strong>Blocked by Guardrail:</strong>
          <span>${data.blocked_reason} rule violation prevented automatic execution.</span>
        </div>
      `;
    } else if (data.needs_human) {
      responseStatusBadge.className = "badge badge-warning";
      responseStatusBadge.textContent = "Human Review Required";
      humanAlertBanner.className = "alert-banner";
      humanAlertBanner.classList.remove("hidden");
      humanAlertBanner.innerHTML = `
        <span class="alert-icon">⚠️</span>
        <div class="alert-text">
          <strong>Incident Escalated to IT Specialist:</strong>
          <span>A human ticket was opened and escalated. Autonomous resolution paused safely.</span>
        </div>
      `;
    } else {
      responseStatusBadge.className = "badge badge-success";
      responseStatusBadge.textContent = "Handled Automatically";
      humanAlertBanner.classList.add("hidden");
    }

    // Render Triage Info
    renderTriage(data.triage);

    // Render Workflow Steps
    renderSteps(data.steps || []);

    // Render Trace
    renderTrace(data.trace || []);
  }

  function renderErrorResponse(msg) {
    responsePlaceholder.classList.add("hidden");
    responseContent.classList.remove("hidden");
    replyText.textContent = msg;
    responseStatusBadge.className = "badge badge-danger";
    responseStatusBadge.textContent = "Server Error";
    humanAlertBanner.classList.add("hidden");
  }

  function renderTriage(triage) {
    if (!triage) {
      triageDetails.innerHTML = `<div class="empty-state-sm">No structured triage produced for this request.</div>`;
      triageJsonCode.textContent = "{}";
      return;
    }

    triageDetails.innerHTML = `
      <div class="triage-grid">
        <div class="triage-metric">
          <div class="metric-label">Employee ID</div>
          <div class="metric-value">${escapeHtml(triage.user_id || "None")}</div>
        </div>
        <div class="triage-metric">
          <div class="metric-label">Category</div>
          <div class="metric-value">
            <span class="badge badge-neutral">${escapeHtml(triage.category || "Unknown")}</span>
          </div>
        </div>
        <div class="triage-metric">
          <div class="metric-label">Severity</div>
          <div class="metric-value">
            <span class="badge ${severityClass(triage.severity)}">${escapeHtml(triage.severity || "normal")}</span>
          </div>
        </div>
        <div class="triage-metric">
          <div class="metric-label">Security Incident</div>
          <div class="metric-value">
            <span class="badge ${triage.is_security_incident ? "badge-danger" : "badge-success"}">
              ${triage.is_security_incident ? "🚨 YES" : "🛡️ NO"}
            </span>
          </div>
        </div>
      </div>
      <div class="triage-metric" style="margin-bottom: 1rem;">
        <div class="metric-label">Summary</div>
        <div class="metric-value" style="font-weight: 500; font-size: 0.875rem;">${escapeHtml(triage.summary || "")}</div>
      </div>
    `;

    triageJsonCode.textContent = JSON.stringify(triage, null, 2);
  }

  function severityClass(sev) {
    if (sev === "critical") return "badge-danger";
    if (sev === "high") return "badge-warning";
    return "badge-neutral";
  }

  function renderSteps(steps) {
    if (!steps || steps.length === 0) {
      stepsTimeline.innerHTML = `<div class="empty-state-sm">No pipeline steps recorded.</div>`;
      return;
    }

    stepsTimeline.innerHTML = steps.map((s) => {
      let typeClass = "timeline-item";
      let icon = "⚡";

      if (s.includes("passed") || s.includes("approved")) {
        typeClass += " passed";
        icon = "✅";
      } else if (s.includes("blocked") || s.includes("failed") || s.includes("rejected")) {
        typeClass += " blocked";
        icon = "🛑";
      } else if (s.includes("human") || s.includes("escalat") || s.includes("need_info")) {
        typeClass += " human";
        icon = "⚠️";
      } else if (s.includes("workers")) {
        icon = "👥";
      }

      return `
        <div class="${typeClass}">
          <span class="timeline-icon">${icon}</span>
          <span class="timeline-text">${escapeHtml(s)}</span>
        </div>
      `;
    }).join("");
  }

  function renderTrace(traceLines) {
    if (!traceLines || traceLines.length === 0) {
      traceBox.innerHTML = `<div class="empty-state-sm">No trace entries for this session.</div>`;
      return;
    }
    traceBox.textContent = traceLines.join("\n");
  }

  // --- 6. HITL Protected Action (Password Reset) ---
  agentResetBtn.addEventListener("click", async () => {
    const uid = resetUserId.value.trim();
    if (!uid) return;
    resetToolResult.textContent = "Agent attempting reset...";

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid }),
      });
      const data = await res.json();
      resetToolResult.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      resetToolResult.textContent = `Error: ${e.message}`;
    }
  });

  humanApproveBtn.addEventListener("click", async () => {
    const uid = resetUserId.value.trim();
    const approver = resetApprover.value.trim() || "IT Admin";
    if (!uid) return;
    resetToolResult.textContent = "Granting human approval...";

    try {
      const res = await fetch("/api/approve-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, approver: approver }),
      });
      const data = await res.json();
      resetToolResult.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      resetToolResult.textContent = `Error: ${e.message}`;
    }
  });

  // --- 7. Tickets Table ---
  refreshTicketsBtn.addEventListener("click", loadTickets);

  async function loadTickets() {
    try {
      const res = await fetch("/api/tickets");
      const tickets = await res.json();

      if (!tickets || tickets.length === 0) {
        ticketsTbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted">No tickets logged yet.</td>
          </tr>
        `;
        return;
      }

      ticketsTbody.innerHTML = tickets.map((t) => {
        const stateBadge = t.state === "escalated_to_human" ? "badge-danger" : "badge-neutral";
        const priorityBadge = t.priority === "critical" ? "badge-danger" : t.priority === "high" ? "badge-warning" : "badge-neutral";

        return `
          <tr>
            <td><strong>${escapeHtml(t.ticket_id || "")}</strong></td>
            <td><code>${escapeHtml(t.user_id || "")}</code></td>
            <td>${escapeHtml(t.category || "")}</td>
            <td><span class="badge ${priorityBadge}">${escapeHtml(t.priority || "")}</span></td>
            <td><span class="badge ${stateBadge}">${escapeHtml(t.state || "")}</span></td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      console.error("Could not fetch tickets:", e);
    }
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return String(str);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
