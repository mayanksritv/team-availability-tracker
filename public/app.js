const state = {
  members: [],
  filters: {
    search: "",
    status: "All",
    role: "All"
  }
};

const membersGrid = document.getElementById("membersGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const roleFilter = document.getElementById("roleFilter");
const resultCount = document.getElementById("resultCount");
const syncTime = document.getElementById("syncTime");
const connectionBadge = document.getElementById("connectionBadge");
const toast = document.getElementById("toast");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const closeDialog = document.getElementById("closeDialog");
const cancelEdit = document.getElementById("cancelEdit");
const editId = document.getElementById("editId");
const editTitle = document.getElementById("editTitle");
const editName = document.getElementById("editName");
const editRole = document.getElementById("editRole");
const editTimezone = document.getElementById("editTimezone");

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = `toast show${isError ? " error" : ""}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.className = "toast";
  }, 2600);
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function currentFilteredMembers() {
  const search = state.filters.search.toLowerCase().trim();

  return state.members.filter((member) => {
    const matchesSearch =
      !search ||
      member.name.toLowerCase().includes(search) ||
      member.role.toLowerCase().includes(search) ||
      member.timezone.toLowerCase().includes(search);

    const matchesStatus =
      state.filters.status === "All" || member.status === state.filters.status;

    const matchesRole =
      state.filters.role === "All" || member.role === state.filters.role;

    return matchesSearch && matchesStatus && matchesRole;
  });
}

function updateStats() {
  const counts = state.members.reduce(
    (acc, member) => {
      acc.total += 1;
      acc[member.status] += 1;
      return acc;
    },
    { total: 0, Available: 0, Busy: 0, Away: 0 }
  );

  document.getElementById("totalCount").textContent = counts.total;
  document.getElementById("availableCount").textContent = counts.Available;
  document.getElementById("busyCount").textContent = counts.Busy;
  document.getElementById("awayCount").textContent = counts.Away;
}

function updateRoleOptions() {
  const roles = [...new Set(state.members.map(member => member.role))].sort();
  const current = state.filters.role;

  roleFilter.innerHTML = `<option>All</option>${roles
    .map(role => `<option value="${escapeHtml(role)}">${escapeHtml(role)}</option>`)
    .join("")}`;

  roleFilter.value = roles.includes(current) ? current : "All";
}

function render() {
  const members = currentFilteredMembers();

  membersGrid.innerHTML = members.map(member => `
    <article class="member-card">
      <div class="member-top">
        <div class="identity">
          <div class="avatar">${escapeHtml(initials(member.name))}</div>
          <div>
            <h3 class="member-name">${escapeHtml(member.name)}</h3>
            <p class="member-role">${escapeHtml(member.role)}</p>
          </div>
        </div>
        <span class="status-badge ${statusClass(member.status)}">
          ${escapeHtml(member.status)}
        </span>
      </div>

      <div class="member-meta">
        <span>ID #${member.id}</span>
        <span>${escapeHtml(member.timezone)}</span>
      </div>

      <div class="status-switch" role="group" aria-label="Change status for ${escapeHtml(member.name)}">
        ${["Available", "Busy", "Away"].map(status => `
          <button
            class="status-button ${member.status === status ? "active" : ""}"
            data-id="${member.id}"
            data-status="${status}"
            type="button"
          >
            ${status}
          </button>
        `).join("")}
      </div>

      <div class="member-footer">
        <button class="edit-button" data-edit-id="${member.id}" type="button">Edit member</button>
      </div>
    </article>
  `).join("");

  emptyState.classList.toggle("hidden", members.length !== 0);
  resultCount.textContent = `${members.length} ${members.length === 1 ? "member" : "members"}`;

  updateStats();
  syncTime.textContent = `Synced ${new Date().toLocaleTimeString()}`;
}

function upsertMember(updatedMember) {
  const index = state.members.findIndex(member => member.id === updatedMember.id);

  if (index === -1) {
    state.members.push(updatedMember);
  } else {
    state.members[index] = updatedMember;
  }

  state.members.sort((a, b) => a.id - b.id);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadMembers() {
  const params = new URLSearchParams();

  if (state.filters.search) params.set("search", state.filters.search);
  if (state.filters.status !== "All") params.set("status", state.filters.status);
  if (state.filters.role !== "All") params.set("role", state.filters.role);

  // Fetch the full set from the backend so stats remain accurate.
  const response = await fetch(`/api/members?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to load members.");

  const filtered = await response.json();

  // The UI needs the complete member set for live statistics.
  const allResponse = await fetch("/api/members");
  if (!allResponse.ok) throw new Error("Failed to load member state.");

  state.members = await allResponse.json();
  updateRoleOptions();
  render();

  // Preserve filters after restoring the full local dataset.
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "member" : "members"}`;
}

async function setStatus(id, status) {
  try {
    const response = await fetch(`/api/members/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to update status.");
    }

    upsertMember(data);
    render();
    showToast(`Status updated to ${status}.`);
  } catch (error) {
    showToast(error.message, true);
  }
}

function openEdit(member) {
  editId.value = member.id;
  editTitle.textContent = `Edit ${member.name}`;
  editName.value = member.name;
  editRole.value = member.role;
  editTimezone.value = member.timezone;
  editDialog.showModal();
}

async function saveEdit(event) {
  event.preventDefault();

  const id = Number(editId.value);

  try {
    const response = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.value,
        role: editRole.value,
        timezone: editTimezone.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to save member.");
    }

    upsertMember(data);
    updateRoleOptions();
    render();
    editDialog.close();
    showToast("Member details saved.");
  } catch (error) {
    showToast(error.message, true);
  }
}

membersGrid.addEventListener("click", (event) => {
  const statusButton = event.target.closest("[data-status]");
  if (statusButton) {
    const id = Number(statusButton.dataset.id);
    setStatus(id, statusButton.dataset.status);
    return;
  }

  const editButton = event.target.closest("[data-edit-id]");
  if (editButton) {
    const id = Number(editButton.dataset.editId);
    const member = state.members.find(item => item.id === id);
    if (member) openEdit(member);
  }
});

searchInput.addEventListener("input", () => {
  state.filters.search = searchInput.value;
  render();
});

statusFilter.addEventListener("change", () => {
  state.filters.status = statusFilter.value;
  render();
});

roleFilter.addEventListener("change", () => {
  state.filters.role = roleFilter.value;
  render();
});

closeDialog.addEventListener("click", () => editDialog.close());
cancelEdit.addEventListener("click", () => editDialog.close());
editForm.addEventListener("submit", saveEdit);

const socket = io();

socket.on("connect", () => {
  connectionBadge.classList.remove("offline");
  connectionBadge.classList.add("online");
  connectionBadge.innerHTML = '<span class="connection-dot"></span> Live updates on';
});

socket.on("disconnect", () => {
  connectionBadge.classList.remove("online");
  connectionBadge.classList.add("offline");
  connectionBadge.innerHTML = '<span class="connection-dot"></span> Reconnecting…';
});

socket.on("members:initial", (members) => {
  state.members = members.sort((a, b) => a.id - b.id);
  updateRoleOptions();
  render();
});

socket.on("member:updated", (member) => {
  upsertMember(member);
  updateRoleOptions();
  render();
});

loadMembers().catch((error) => {
  console.error(error);
  showToast("Unable to load team data. Check the server and database.", true);
});
