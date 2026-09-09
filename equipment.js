let equipmentRecords = [];

async function loadEquipment() {
  const { data, error } = await supabaseClient
    .from("equipment")
    .select("*")
    .order("id", { ascending: false });

  if (error) return showToast(error.message, true);
  equipmentRecords = data || [];
  renderEquipment();
  populateBorrowEquipment();
  await updateDashboard();
}

function renderEquipment() {
  const body = document.getElementById("equipmentTableBody");
  const search = document.getElementById("equipmentSearch").value.toLowerCase().trim();
  const filter = document.getElementById("availabilityFilter").value;

  const rows = equipmentRecords.filter(e => {
    const matchesSearch = !search ||
      e.equipment_name.toLowerCase().includes(search) ||
      e.asset_code.toLowerCase().includes(search);
    const matchesFilter = filter === "All" || e.availability === filter;
    return matchesSearch && matchesFilter;
  });

  body.innerHTML = rows.length ? rows.map(e => `
    <tr>
      <td>${escapeHtml(e.asset_code)}</td>
      <td>${escapeHtml(e.equipment_name)}</td>
      <td>${escapeHtml(e.category)}</td>
      <td>${escapeHtml(e.condition)}</td>
      <td><span class="badge ${e.availability === "Available" ? "available" : "borrowed"}">${e.availability}</span></td>
      <td class="actions">
        <button class="btn small-btn" onclick="editEquipment(${e.id})">Edit</button>
        <button class="btn small-btn danger-outline" onclick="deleteEquipment(${e.id})">Delete</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="6" class="empty">No equipment records found.</td></tr>`;
}

function populateBorrowEquipment() {
  const select = document.getElementById("borrowEquipment");
  const available = equipmentRecords.filter(e => e.availability === "Available");
  select.innerHTML = available.length
    ? available.map(e => `<option value="${e.id}">${escapeHtml(e.asset_code)} - ${escapeHtml(e.equipment_name)}</option>`).join("")
    : `<option value="">No available equipment</option>`;
}

document.getElementById("equipmentSearch").addEventListener("input", renderEquipment);
document.getElementById("availabilityFilter").addEventListener("change", renderEquipment);

document.getElementById("addEquipmentBtn").addEventListener("click", () => {
  document.getElementById("equipmentModalTitle").textContent = "Add Equipment";
  document.getElementById("equipmentForm").reset();
  document.getElementById("equipmentId").value = "";
  document.getElementById("assetCode").value = generateAssetCode();
  document.getElementById("equipmentModal").classList.remove("hidden");
});

document.getElementById("equipmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("equipmentId").value;
  const payload = {
    equipment_name: document.getElementById("equipmentName").value.trim(),
    category: document.getElementById("equipmentCategory").value.trim(),
    asset_code: document.getElementById("assetCode").value.trim(),
    condition: document.getElementById("equipmentCondition").value
  };

  if (!payload.equipment_name || !payload.category || !payload.asset_code) {
    return showToast("Equipment name, category, and asset code are required.", true);
  }

  let result;
  if (id) {
    result = await supabaseClient.from("equipment").update(payload).eq("id", id);
  } else {
    result = await supabaseClient.from("equipment").insert(payload);
  }

  if (result.error) return showToast(result.error.message, true);

  document.getElementById("equipmentModal").classList.add("hidden");
  showToast(id ? "Equipment updated." : "Equipment added.");
  await loadEquipment();
});

async function editEquipment(id) {
  const item = equipmentRecords.find(e => e.id === id);
  if (!item) return;

  document.getElementById("equipmentModalTitle").textContent = "Edit Equipment";
  document.getElementById("equipmentId").value = item.id;
  document.getElementById("equipmentName").value = item.equipment_name;
  document.getElementById("equipmentCategory").value = item.category;
  document.getElementById("assetCode").value = item.asset_code;
  document.getElementById("equipmentCondition").value = item.condition;
  document.getElementById("equipmentModal").classList.remove("hidden");
}

async function deleteEquipment(id) {
  const item = equipmentRecords.find(e => e.id === id);
  if (!item) return;

  const confirmed = confirm(`Delete "${item.equipment_name}"? This action requires confirmation.`);
  if (!confirmed) return;

  const { error } = await supabaseClient.from("equipment").delete().eq("id", id);
  if (error) return showToast("Delete failed. If this equipment has transactions, keep the record instead of deleting it.", true);

  showToast("Equipment deleted.");
  await loadEquipment();
}

function generateAssetCode() {
  const used = new Set(equipmentRecords.map(e => e.asset_code));
  let n = 1;
  while (used.has(`EQ-${String(n).padStart(3, "0")}`)) n++;
  return `EQ-${String(n).padStart(3, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[ch]));
}
