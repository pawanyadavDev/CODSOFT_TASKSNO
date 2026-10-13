// ExpenseTracker – vanilla JS, data saved in localStorage
const STORAGE_KEY = "expenseTrackerTransactions";
const CATEGORIES = {
  income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"],
  expense: ["Food", "Shopping", "Transport", "Bills", "Entertainment", "Health", "Education", "Rent", "Travel", "Other"]
};
const ALL_CATEGORIES = [...new Set([...CATEGORIES.expense, ...CATEGORIES.income.filter(c => c !== "Other"), "Other"])];
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let transactions = loadTransactions();

function loadTransactions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveTransactions() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }

function fillCategories() {
  const t = $("type").value;
  $("category").innerHTML = '<option value="">Select category</option>' + CATEGORIES[t].map(c => `<option>${c}</option>`).join("");
  $("filterCategory").innerHTML = '<option value="all">All Categories</option>' + ALL_CATEGORIES.map(c => `<option>${c}</option>`).join("");
}

function showMessage(text, kind = "success") {
  $("message").innerHTML = `<div class="alert alert-${kind} py-2 mb-0">${esc(text)}</div>`;
  setTimeout(() => ($("message").innerHTML = ""), 3000);
}

function readForm() {
  return {
    type: $("type").value,
    amount: parseFloat($("amount").value),
    category: $("category").value,
    date: $("date").value,
    description: $("description").value.trim()
  };
}
function validate(tx) {
  const ok = { amount: tx.amount > 0, category: !!tx.category, date: !!tx.date };
  Object.keys(ok).forEach(k => $(k).classList.toggle("is-invalid", !ok[k]));
  return Object.values(ok).every(Boolean) && !!tx.type;
}

function addTransaction(tx) {
  tx.id = Date.now();
  transactions.unshift(tx);
  saveTransactions();
  showMessage("Transaction added.");
}
function updateTransaction(id, data) {
  transactions = transactions.map(t => (t.id === id ? { ...t, ...data } : t));
  saveTransactions();
  showMessage("Transaction updated.");
}
function deleteTransaction(id) {
  if (!confirm("Delete this transaction? This cannot be undone.")) return;
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  resetForm();
  refresh();
}
function editTransaction(id) {
  const t = transactions.find(x => x.id === id);
  if (!t) return;
  $("type").value = t.type; fillCategories();
  $("amount").value = t.amount; $("category").value = t.category;
  $("date").value = t.date; $("description").value = t.description;
  $("editId").value = id;
  $("formTitle").textContent = "Edit Transaction";
  $("submitBtn").textContent = "Update Transaction";
  $("cancelBtn").classList.remove("d-none");
  $("add").scrollIntoView();
}
function resetForm() {
  $("transactionForm").reset();
  $("editId").value = "";
  $("date").value = today();
  fillCategories();
  ["amount", "category", "date"].forEach(k => $(k).classList.remove("is-invalid"));
  $("formTitle").textContent = "Add Transaction";
  $("submitBtn").textContent = "Add Transaction";
  $("cancelBtn").classList.add("d-none");
}

function filterTransactions() {
  const cat = $("filterCategory").value, type = $("filterType").value;
  return transactions.filter(t => (cat === "all" || t.category === cat) && (type === "all" || t.type === type))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function renderTransactions() {
  const list = filterTransactions();
  $("emptyState").classList.toggle("d-none", transactions.length > 0);
  $("txTable").classList.toggle("d-none", transactions.length === 0);
  $("txBody").innerHTML = list.length || !transactions.length ? list.map(t => `
    <tr>
      <td class="text-nowrap">${fmtDate(t.date)}</td>
      <td>${esc(t.description) || '<span class="text-secondary">—</span>'}</td>
      <td>${esc(t.category)}</td>
      <td><span class="badge badge-${t.type}">${t.type === "income" ? "Income" : "Expense"}</span></td>
      <td class="text-end fw-semibold text-nowrap ${t.type === "income" ? "text-success" : "text-danger"}">${t.type === "income" ? "+" : "-"}${money(t.amount)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" onclick="editTransaction(${t.id})" aria-label="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTransaction(${t.id})" aria-label="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join("") : '<tr><td colspan="6" class="text-center text-secondary py-4">No transactions match these filters.</td></tr>';
}

function calculateTotals() {
  const sum = type => transactions.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
  const income = sum("income"), expenses = sum("expense");
  return { income, expenses, balance: income - expenses };
}
function updateSummaryCards() {
  const { income, expenses, balance } = calculateTotals();
  $("totalIncome").textContent = money(income);
  $("totalExpenses").textContent = money(expenses);
  $("balance").textContent = money(balance);
}

function expenseByCategory() {
  const map = {};
  transactions.filter(t => t.type === "expense").forEach(t => (map[t.category] = (map[t.category] || 0) + t.amount));
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
function generateInsights() {
  const { income, expenses, balance } = calculateTotals();
  const out = [];
  if (!transactions.length) out.push("Add your first transaction to see insights.");
  else {
    if (!expenses) out.push("Start adding expenses to understand your spending habits.");
    if (expenses > income) out.push("Your expenses are currently higher than your income. Consider reviewing your spending.");
    else if (balance > 0) out.push("You currently have a positive balance.");
    const top = expenseByCategory()[0];
    if (top) out.push(`${top[0]} is currently your highest expense category.`);
  }
  $("insights").innerHTML = out.map(i => `<li class="mb-1">${i}</li>`).join("");
}
function updateCategoryChart() {
  const data = expenseByCategory(), total = data.reduce((s, [, v]) => s + v, 0);
  $("categorySummary").innerHTML = data.length ? data.map(([c, v]) => {
    const pct = Math.round((v / total) * 100);
    return `<div class="cat-row"><div class="d-flex justify-content-between small"><span>${esc(c)}</span><span>${money(v)} (${pct}%)</span></div>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar bg-danger" style="width:${pct}%"></div></div></div>`;
  }).join("") : '<p class="text-secondary mb-0">No expenses recorded yet.</p>';
}

function refresh() {
  renderTransactions(); updateSummaryCards(); generateInsights(); updateCategoryChart();
}

// Event wiring
$("type").addEventListener("change", fillCategories);
$("filterCategory").addEventListener("change", renderTransactions);
$("filterType").addEventListener("change", renderTransactions);
$("cancelBtn").addEventListener("click", resetForm);
$("transactionForm").addEventListener("submit", e => {
  e.preventDefault();
  const tx = readForm();
  if (!validate(tx)) return showMessage("Please fix the highlighted fields.", "danger");
  const id = Number($("editId").value);
  id ? updateTransaction(id, tx) : addTransaction(tx);
  const msg = $("message").innerHTML;
  resetForm(); $("message").innerHTML = msg;
  refresh();
});

fillCategories();
$("date").value = today();
refresh();
