let transactionRecords = [];

async function loadTransactions() {
  const { data, error } = await supabaseClient
    .from("borrow_transactions")
    .select("*, equipment(equipment_name, asset_code)")
    .order("id", { ascending: false });

  if (error) return showToast(error.message, true);

  transactionRecords = data || [];
  await applyOverdueLogic();
  renderTransactions();
  await updateDashboard();
}

async function applyOverdueLogic() {
  const today = localDate();
  const overdue = transactionRecords.filter(t =>
    t.status !== "Returned" && t.due_date < today
  );

  for (const t of overdue) {
    if (t.status !== "Overdue") {
      const { error } = await supabaseClient
        .from("borrow_transactions")
        .update({ status: "Overdue" })
        .eq("id", t.id)
        .neq("status", "Returned");
      if (!error) t.status = "Overdue";
    }
  }
}

function renderTransactions() {
  const body = document.getElementById("transactionsTableBody");
  const search = document.getElementById("transactionSearch").value.toLowerCase().trim();
  const filter = document.getElementById("transactionFilter").value;

  const rows = transactionRecords.filter(t => {
    const equipmentName = t.equipment?.equipment_name || "";
    const assetCode = t.equipment?.asset_code || "";
    const matchesSearch = !search ||
      t.borrower_name.toLowerCase().includes(search) ||
      equipmentName.toLowerCase().includes(search) ||
      assetCode.toLowerCase().includes(search);
    const matchesFilter = filter === "All" || t.status === filter;
    return matchesSearch && matchesFilter;
  });

  body.innerHTML = rows.length ? rows.map(t => `
    <tr>
      <td>${escapeHtml(t.equipment?.asset_code || "")} - ${escapeHtml(t.equipment?.equipment_name || "")}</td>
      <td>${escapeHtml(t.borrower_name)}</td>
      <td>${escapeHtml(t.borrower_type)}</td>
      <td>${escapeHtml(t.department)}</td>
      <td>${t.date_borrowed}</td>
      <td>${t.due_date}</td>
      <td>${t.date_returned || "—"}</td>
      <td><span class="badge ${statusClass(t.status)}">${t.status}</span></td>
      <td>${t.status !== "Returned" ? `<button class="btn small-btn" onclick="returnEquipment(${t.id})">Return Equipment</button>` : "Completed"}</td>
    </tr>
  `).join("") : `<tr><td colspan="9" class="empty">No transactions found.</td></tr>`;
}

function statusClass(status) {
  return status === "Returned" ? "returned" : status === "Overdue" ? "overdue" : "borrowed";
}

document.getElementById("transactionSearch").addEventListener("input", renderTransactions);
document.getElementById("transactionFilter").addEventListener("change", renderTransactions);

document.getElementById("newBorrowBtn").addEventListener("click", async () => {
  document.getElementById("borrowForm").reset();
  document.getElementById("dateBorrowed").value = localDate();
  document.getElementById("borrowModal").classList.remove("hidden");
  await loadEquipment();
});

document.getElementById("borrowForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const equipmentId = Number(document.getElementById("borrowEquipment").value);
  const dateBorrowed = document.getElementById("dateBorrowed").value;
  const dueDate = document.getElementById("dueDate").value;

  if (!equipmentId) return showToast("Select available equipment.", true);
  if (!dateBorrowed || !dueDate) return showToast("Borrowing and due dates are required.", true);
  if (dueDate < dateBorrowed) return showToast("Due date cannot be earlier than the borrowing date.", true);

  const selected = equipmentRecords.find(e => e.id === equipmentId);
  if (!selected || selected.availability !== "Available") {
    return showToast("Only available equipment may be borrowed.", true);
  }

  const transaction = {
    equipment_id: equipmentId,
    borrower_name: document.getElementById("borrowerName").value.trim(),
    borrower_type: document.getElementById("borrowerType").value,
    department: document.getElementById("department").value.trim(),
    date_borrowed: dateBorrowed,
    due_date: dueDate,
    status: "Borrowed",
    user_id: currentUser.id
  };

  if (!transaction.borrower_name || !transaction.department) {
    return showToast("Borrower name and department are required.", true);
  }

  const { error: txError } = await supabaseClient
    .from("borrow_transactions")
    .insert(transaction);

  if (txError) return showToast(txError.message, true);

  const { error: equipmentError } = await supabaseClient
    .from("equipment")
    .update({ availability: "Borrowed" })
    .eq("id", equipmentId)
    .eq("availability", "Available");

  if (equipmentError) return showToast(equipmentError.message, true);

  document.getElementById("borrowModal").classList.add("hidden");
  showToast("Borrowing transaction recorded.");
  await loadEquipment();
  await loadTransactions();
});

async function returnEquipment(transactionId) {
  const transaction = transactionRecords.find(t => t.id === transactionId);
  if (!transaction || transaction.status === "Returned") {
    return showToast("This transaction has already been returned.", true);
  }

  if (!confirm("Return this equipment?")) return;

  const today = localDate();

  const { error: txError } = await supabaseClient
    .from("borrow_transactions")
    .update({ date_returned: today, status: "Returned" })
    .eq("id", transactionId)
    .neq("status", "Returned");

  if (txError) return showToast(txError.message, true);

  const { error: equipmentError } = await supabaseClient
    .from("equipment")
    .update({ availability: "Available" })
    .eq("id", transaction.equipment_id);

  if (equipmentError) return showToast(equipmentError.message, true);

  showToast("Equipment returned successfully.");
  await loadEquipment();
  await loadTransactions();
}

async function updateDashboard() {
  const total = equipmentRecords.length;
  const available = equipmentRecords.filter(e => e.availability === "Available").length;
  const borrowed = equipmentRecords.filter(e => e.availability === "Borrowed").length;
  const returned = transactionRecords.filter(t => t.status === "Returned").length;
  const overdue = transactionRecords.filter(t => t.status === "Overdue").length;

  document.getElementById("totalEquipment").textContent = total;
  document.getElementById("availableEquipment").textContent = available;
  document.getElementById("borrowedEquipment").textContent = borrowed;
  document.getElementById("returnedTransactions").textContent = returned;
  document.getElementById("overdueTransactions").textContent = overdue;
}

function localDate() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${isError ? "error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3000);
}

async function initializeApp() {
  await loadEquipment();
  await loadTransactions();
}
