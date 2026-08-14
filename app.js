/* =========================
   OD Approval Application
   Replace these two values with your Supabase project settings.
   ========================= */
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
const page = location.pathname.split("/").pop() || "index.html";

function showMessage(el, text, type="") {
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`;
}

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function getProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,email,role")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

async function requireRole(role) {
  const session = await getSession();
  if (!session) {
    location.href = "index.html";
    return null;
  }
  try {
    const profile = await getProfile(session.user.id);
    if (profile.role !== role) {
      location.href = profile.role === "admin" ? "admin.html" : "student.html";
      return null;
    }
    return { session, profile };
  } catch (err) {
    console.error(err);
    alert("Your account profile is not configured. Ask the administrator to add your profile.");
    await supabaseClient.auth.signOut();
    location.href = "index.html";
    return null;
  }
}

async function login() {
  $("loginForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    showMessage($("loginMessage"), "Signing in...");
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });
    if (error) {
      showMessage($("loginMessage"), error.message, "error");
      return;
    }
    const profile = await getProfile(data.user.id);
    location.href = profile.role === "admin" ? "admin.html" : "student.html";
  });
}

async function logout() {
  $("logoutBtn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    location.href = "index.html";
  });
}

async function loadStudent() {
  const ctx = await requireRole("student");
  if (!ctx) return;

  $("stdEmail").value = ctx.session.user.email;

  $("odForm").addEventListener("submit", async e => {
    e.preventDefault();
    showMessage($("formMessage"), "Submitting...");
    const payload = {
      user_id: ctx.session.user.id,
      registration_no: $("regNo").value.trim(),
      student_name: $("stdName").value.trim(),
      email: $("stdEmail").value.trim(),
      course_code: $("courseCode").value.trim(),
      course_slot: $("courseSlot").value.trim(),
      event_name: $("eventName").value.trim(),
      event_date: $("eventDate").value,
      event_incharge_name: $("inchargeName").value.trim(),
      contact: $("contact").value.trim()
    };

    const { error } = await supabaseClient.from("od_requests").insert(payload);
    if (error) {
      showMessage($("formMessage"), error.message, "error");
      return;
    }
    showMessage($("formMessage"), "OD request submitted successfully.", "success");
    $("odForm").reset();
    $("stdEmail").value = ctx.session.user.email;
    await loadStudentRequests(ctx.session.user.id);
  });

  await loadStudentRequests(ctx.session.user.id);
}

async function loadStudentRequests(userId) {
  const { data, error } = await supabaseClient
    .from("od_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    showMessage($("formMessage"), error.message, "error");
    return;
  }

  $("studentRequests").innerHTML = data.length
    ? data.map(r => `
      <tr>
        <td>${escapeHtml(r.event_name)}</td>
        <td>${escapeHtml(r.event_date)}</td>
        <td>${escapeHtml(r.course_code)} / ${escapeHtml(r.course_slot)}</td>
        <td><span class="badge ${r.status}">${r.status}</span></td>
        <td>${escapeHtml(r.admin_comment || "-")}</td>
      </tr>`).join("")
    : `<tr><td colspan="5">No OD requests submitted yet.</td></tr>`;
}

let allRequests = [];
let selectedRequestId = null;

async function loadAdmin() {
  const ctx = await requireRole("admin");
  if (!ctx) return;

  await fetchAdminRequests();

  $("refreshBtn")?.addEventListener("click", fetchAdminRequests);
  $("searchBox")?.addEventListener("input", renderAdminRequests);
  $("statusFilter")?.addEventListener("change", renderAdminRequests);
  $("sortBy")?.addEventListener("change", renderAdminRequests);

  $("cancelModal").addEventListener("click", closeModal);
  $("saveStatus").addEventListener("click", saveStatus);
}

async function fetchAdminRequests() {
  showMessage($("adminMessage"), "Loading requests...");
  const { data, error } = await supabaseClient
    .from("od_requests")
    .select("*")
    .order("event_date", { ascending: false });

  if (error) {
    showMessage($("adminMessage"), error.message, "error");
    return;
  }

  allRequests = data || [];
  showMessage($("adminMessage"), `${allRequests.length} request(s) loaded.`, "success");
  renderAdminRequests();
}

function renderAdminRequests() {
  const search = ($("searchBox")?.value || "").toLowerCase();
  const status = $("statusFilter")?.value || "";
  const sort = $("sortBy")?.value || "date_desc";

  let rows = allRequests.filter(r => {
    const text = `${r.student_name} ${r.registration_no} ${r.event_name}`.toLowerCase();
    return (!search || text.includes(search)) && (!status || r.status === status);
  });

  rows.sort((a,b) => {
    if (sort === "name_asc") return a.student_name.localeCompare(b.student_name);
    if (sort === "name_desc") return b.student_name.localeCompare(a.student_name);
    if (sort === "date_asc") return a.event_date.localeCompare(b.event_date);
    return b.event_date.localeCompare(a.event_date);
  });

  $("totalCount").textContent = allRequests.length;
  $("pendingCount").textContent = allRequests.filter(r => r.status === "Pending").length;
  $("approvedCount").textContent = allRequests.filter(r => r.status === "Approved").length;
  $("disapprovedCount").textContent = allRequests.filter(r => r.status === "Disapproved").length;

  $("adminRequests").innerHTML = rows.length ? rows.map(r => `
    <tr>
      <td>${escapeHtml(r.student_name)}<br><small>${escapeHtml(r.email)}</small></td>
      <td>${escapeHtml(r.registration_no)}</td>
      <td>${escapeHtml(r.event_name)}</td>
      <td>${escapeHtml(r.event_date)}</td>
      <td>${escapeHtml(r.course_code)} / ${escapeHtml(r.course_slot)}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>
        <button class="primary action-btn" onclick="openStatusModal('${r.id}')">
          ${r.status === "Pending" ? "Review" : "Change"}
        </button>
      </td>
    </tr>`).join("") : `<tr><td colspan="7">No matching requests.</td></tr>`;
}

window.openStatusModal = function(id) {
  const request = allRequests.find(r => r.id === id);
  if (!request) return;
  selectedRequestId = id;
  $("modalRequestInfo").textContent =
    `${request.student_name} (${request.registration_no}) — ${request.event_name}`;
  $("modalStatus").value = request.status === "Disapproved" ? "Disapproved" : "Approved";
  $("modalComment").value = request.admin_comment || "";
  $("approvalModal").classList.remove("hidden");
};

function closeModal() {
  selectedRequestId = null;
  $("approvalModal").classList.add("hidden");
}

async function saveStatus() {
  if (!selectedRequestId) return;
  const status = $("modalStatus").value;
  const comment = $("modalComment").value.trim();

  const { error } = await supabaseClient
    .from("od_requests")
    .update({
      status,
      admin_comment: comment,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", selectedRequestId);

  if (error) {
    alert(error.message);
    return;
  }

  closeModal();
  await fetchAdminRequests();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

(async function init() {
  await login();
  await logout();

  if (page === "student.html") await loadStudent();
  if (page === "admin.html") await loadAdmin();
})();
