"use strict";

const STORAGE_KEY = "clareza-demo-v1";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const state = { profile: null, transactions: [], bills: [], goals: [], recurringRules: [], plannedPayments: [], budgets: [] };
let previousFocus = null;
let authMode = "login";
let selectedMonth = "";
let editingTransactionId = "";

const byId = (id) => document.getElementById(id);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatDate = (value) => dateFormat.format(new Date(`${value}T12:00:00`)).replace(".", "");
const formatMoney = (value) => money.format(Number(value) || 0);
const monthOf = (date) => date.slice(0, 7);

function dateInMonth(month, day) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function addMonths(date, offset) {
  const day = Number(date.slice(8, 10));
  const [year, month] = monthOf(date).split("-").map(Number);
  const target = new Date(year, month - 1 + offset, 1);
  const targetMonth = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
  return dateInMonth(targetMonth, day);
}

function notify(message) {
  const feedback = byId("app-feedback");
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = false;
  window.clearTimeout(notify.timeout);
  notify.timeout = window.setTimeout(() => { feedback.hidden = true; }, 6000);
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar os dados locais:", error);
    notify("Não foi possível salvar neste navegador. As alterações estão disponíveis somente até fechar esta página.");
    return false;
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!parsed || !parsed.profile || !Array.isArray(parsed.transactions) ||
        !Array.isArray(parsed.bills) || !Array.isArray(parsed.goals)) {
      throw new Error("Os dados locais não têm o formato esperado.");
    }
    parsed.recurringRules = Array.isArray(parsed.recurringRules) ? parsed.recurringRules : [];
    parsed.plannedPayments = Array.isArray(parsed.plannedPayments) ? parsed.plannedPayments : [];
    parsed.budgets = Array.isArray(parsed.budgets) ? parsed.budgets : [];
    Object.assign(state, parsed);
  } catch (error) {
    console.error("Não foi possível ler os dados locais:", error);
    notify("Os dados locais estão inválidos. Limpe os dados deste site no navegador para iniciar novamente.");
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const registering = mode === "register";
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab.dataset.authTab === mode));
  });
  byId("auth-form").hidden = false;
  byId("recovery-form").hidden = true;
  byId("reset-form").hidden = true;
  byId("recovery-result").hidden = true;
  document.querySelector(".auth-tabs").hidden = false;
  byId("simulate-reset").hidden = false;
  byId("auth-name").hidden = !registering;
  byId("name-label").hidden = !registering;
  byId("auth-confirm").hidden = !registering;
  byId("confirm-label").hidden = !registering;
  byId("auth-name").required = registering;
  byId("auth-confirm").required = registering;
  byId("auth-password").autocomplete = registering ? "new-password" : "current-password";
  byId("auth-title").textContent = registering ? "Vamos começar?" : "Bem-vinda(o) de volta.";
  document.querySelector(".auth-description").textContent = registering
    ? "Crie seu perfil local para organizar sua vida financeira."
    : "Entre para continuar organizando suas finanças neste navegador.";
  document.querySelector(".auth-submit").innerHTML = registering
    ? "Criar meu perfil <span aria-hidden=\"true\">↗</span>"
    : "Entrar <span aria-hidden=\"true\">↗</span>";
  byId("auth-notice").textContent = "Demonstração: não use uma senha real. Ela não será verificada nem armazenada.";
}

function showAuth(mode, trigger) {
  previousFocus = trigger || document.activeElement;
  setAuthMode(mode);
  byId("auth-modal").classList.add("is-open");
  byId("auth-modal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  const firstInput = mode === "register" ? byId("auth-name") : byId("auth-email");
  window.setTimeout(() => firstInput.focus(), 0);
}

function closeAuth() {
  byId("auth-modal").classList.remove("is-open");
  byId("auth-modal").setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  const focusTarget = previousFocus && previousFocus.getClientRects().length
    ? previousFocus
    : document.body.classList.contains("app-active")
      ? document.querySelector("#screen-overview h1")
      : document.querySelector("#inicio h1");
  if (focusTarget) focusTarget.focus();
}

function showRecovery() {
  byId("auth-form").hidden = true;
  byId("recovery-form").hidden = false;
  byId("reset-form").hidden = true;
  byId("recovery-result").hidden = true;
  document.querySelector(".auth-tabs").hidden = true;
  byId("auth-title").textContent = "Recuperar acesso";
  document.querySelector(".auth-description").textContent = "Informe o e-mail associado ao seu perfil.";
  byId("recovery-email").value = byId("auth-email").value;
  byId("recovery-email").focus();
}

function showRecoveryResult(message) {
  byId("auth-form").hidden = true;
  byId("recovery-form").hidden = true;
  byId("reset-form").hidden = true;
  byId("recovery-result").hidden = false;
  document.querySelector(".auth-tabs").hidden = true;
  byId("auth-title").textContent = "Próximo passo";
  document.querySelector(".auth-description").textContent = "Este fluxo é uma simulação da experiência.";
  byId("recovery-message").textContent = message;
}

function enterWorkspace(profile) {
  state.profile = profile;
  document.body.classList.add("app-active");
  closeAuth();
  document.querySelectorAll("[data-screen]").forEach((control) => {
    if (control.matches(".workspace-nav .side-link")) {
      control.classList.toggle("is-active", control.dataset.screen === "overview");
    }
  });
  document.querySelectorAll("[data-screen-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.screenPanel === "overview");
  });
  byId("workspace-user").firstChild.textContent = profile.name;
  byId("workspace-email").textContent = profile.email;
  byId("workspace-avatar").textContent = (profile.name.trim()[0] || "C").toLocaleUpperCase("pt-BR");
  byId("today-label").textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(new Date());
  renderWorkspace();
}

function leaveWorkspace() {
  document.body.classList.remove("app-active");
  byId("workspace").classList.remove("sidebar-open");
  window.location.hash = "inicio";
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function addEmptyRow(target, message, columns) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columns;
  cell.className = "empty-state";
  cell.textContent = message;
  row.append(cell);
  target.append(row);
}

function materializeRecurringForMonth(month) {
  let changed = false;
  state.recurringRules.forEach((rule) => {
    if (month < monthOf(rule.startDate)) return;
    const exists = state.transactions.some((item) => item.recurrenceId === rule.id && monthOf(item.date) === month);
    if (exists) return;
    state.transactions.push({
      id: makeId(),
      recurrenceId: rule.id,
      description: rule.description,
      amount: Number(rule.amount),
      type: rule.type,
      category: rule.category,
      source: rule.source,
      date: dateInMonth(month, Number(rule.startDate.slice(8, 10)))
    });
    changed = true;
  });
  if (changed) persistState();
}

function renderTransactions(monthTransactions) {
  const allRows = [...monthTransactions].sort((a, b) => b.date.localeCompare(a.date));
  const rows = allRows.filter((item) => monthOf(item.date) === selectedMonth);
  const table = byId("transactions-table");
  table.replaceChildren();
  const categoryFilter = byId("transaction-category-filter");
  const selectedCategory = categoryFilter.value || "all";
  const categories = [...new Set(allRows.map((item) => item.category || "Outros"))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  categoryFilter.replaceChildren(new Option("Todas", "all"));
  categories.forEach((category) => categoryFilter.add(new Option(category, category)));
  categoryFilter.value = categories.includes(selectedCategory) ? selectedCategory : "all";
  const query = byId("transaction-search").value.trim().toLocaleLowerCase("pt-BR");
  const sourceQuery = byId("transaction-source-filter").value.trim().toLocaleLowerCase("pt-BR");
  const dateFrom = byId("transaction-date-from").value;
  const dateTo = byId("transaction-date-to").value;
  const minimumValue = byId("transaction-amount-min").value === ""
    ? null
    : Math.round(Number(byId("transaction-amount-min").value) * 100);
  const maximumValue = byId("transaction-amount-max").value === ""
    ? null
    : Math.round(Number(byId("transaction-amount-max").value) * 100);
  const selectedType = byId("transaction-type-filter").value;
  const validRange = !dateFrom || !dateTo || dateFrom <= dateTo;
  const validValues = minimumValue === null || maximumValue === null || minimumValue <= maximumValue;
  const periodRows = validRange
    ? allRows.filter((item) => (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo))
    : [];
  const visibleRows = allRows.filter((item) => {
    const itemCents = Math.round(Number(item.amount) * 100);
    const matchesText = !query || item.description.toLocaleLowerCase("pt-BR").includes(query);
    const matchesSource = !sourceQuery || (item.source || "").toLocaleLowerCase("pt-BR").includes(sourceQuery);
    const matchesDate = (!dateFrom || item.date >= dateFrom) && (!dateTo || item.date <= dateTo);
    const matchesValue = (minimumValue === null || itemCents >= minimumValue) &&
      (maximumValue === null || itemCents <= maximumValue);
    return validRange && validValues && matchesText && matchesSource && matchesDate && matchesValue &&
      (selectedType === "all" || item.type === selectedType) &&
      (categoryFilter.value === "all" || item.category === categoryFilter.value);
  });
  const periodLabel = dateFrom && dateTo
    ? `de ${formatDate(dateFrom)} até ${formatDate(dateTo)}`
    : dateFrom
      ? `a partir de ${formatDate(dateFrom)}`
      : dateTo
        ? `até ${formatDate(dateTo)}`
        : `em ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T12:00:00`))}`;
  byId("transactions-month-label").textContent = validRange && validValues
    ? `Movimentações ${periodLabel}, incluindo parcelas e recorrências`
    : "Confira o intervalo de datas e os valores informados nos filtros.";
  byId("transaction-filter-count").textContent = !validRange
    ? "A data inicial precisa ser anterior ou igual à data final."
    : !validValues
      ? "O valor mínimo precisa ser menor ou igual ao valor máximo."
      : `Exibindo ${visibleRows.length} de ${periodRows.length} movimentações no período.`;
  if (!visibleRows.length) {
    addEmptyRow(table, !validRange || !validValues
      ? "Corrija os filtros para exibir as movimentações."
      : allRows.length
        ? "Nenhuma movimentação corresponde aos filtros."
        : "Ainda não há movimentações cadastradas. Adicione uma receita ou despesa acima.", 7);
  }
  visibleRows.forEach((item) => {
    const row = document.createElement("tr");
    const description = item.installment
      ? `${item.description} (${item.installment.current}/${item.installment.total})`
      : item.description;
    row.append(
      makeCell(description),
      makeCell(item.category),
      makeCell(item.source || "Origem não informada"),
      makeCell(formatDate(item.date)),
      makeCell(item.type === "income" ? "Receita" : "Despesa")
    );
    const amount = makeCell(`${item.type === "income" ? "+" : "−"} ${formatMoney(item.amount)}`);
    amount.className = item.type === "income" ? "amount-income" : "";
    row.append(amount);
    const action = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.dataset.deleteTransaction = item.id;
    action.className = "transaction-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "text-button";
    edit.dataset.editTransaction = item.id;
    edit.textContent = "Editar";
    edit.setAttribute("aria-label", `Editar ${item.description}`);
    remove.textContent = item.installmentId || item.recurrenceId ? "Excluir série" : "Excluir";
    remove.setAttribute("aria-label", `Excluir ${item.description}${item.installmentId || item.recurrenceId ? " e os demais lançamentos relacionados" : ""}`);
    remove.title = item.installmentId || item.recurrenceId
      ? "Remove este grupo de parcelas ou a regra mensal e suas ocorrências."
      : `Excluir ${item.description}`;
    action.append(edit, remove);
    row.append(action);
    table.append(row);
  });

  const recent = byId("recent-transactions");
  recent.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Suas movimentações aparecerão aqui.";
    recent.append(empty);
  }
  rows.slice(0, 4).forEach((item) => {
    const row = document.createElement("div");
    row.className = "transaction-row";
    const icon = document.createElement("span");
    icon.className = `transaction-icon ${item.type === "income" ? "transaction-income" : "transaction-expense"}`;
    icon.textContent = item.type === "income" ? "↙" : "↗";
    icon.setAttribute("aria-hidden", "true");
    const description = document.createElement("span");
    description.className = "transaction-description";
    const title = document.createElement("strong");
    title.textContent = item.description;
    const detail = document.createElement("small");
    const installment = item.installment ? ` · Parcela ${item.installment.current}/${item.installment.total}` : "";
    detail.textContent = `${item.category} · ${item.source || "Origem não informada"} · ${formatDate(item.date)}${installment}`;
    description.append(title, detail);
    const amount = document.createElement("strong");
    amount.className = `transaction-amount ${item.type === "income" ? "amount-income" : ""}`;
    amount.textContent = `${item.type === "income" ? "+" : "−"} ${formatMoney(item.amount)}`;
    row.append(icon, description, amount);
    recent.append(row);
  });
}

function renderBudget(monthTransactions) {
  const target = byId("budget-list");
  target.replaceChildren();
  const budgets = state.budgets.filter((budget) => budget.month === selectedMonth)
    .sort((a, b) => a.category.localeCompare(b.category, "pt-BR"));
  if (!budgets.length) {
    const empty = document.createElement("p");
    empty.className = "workspace-card empty-state";
    empty.textContent = "Nenhum limite definido para este mês. Escolha uma categoria e salve um orçamento acima.";
    target.append(empty);
    return;
  }
  const expenses = new Map();
  monthTransactions.filter((item) => item.type === "expense").forEach((item) => {
    expenses.set(item.category || "Outros", (expenses.get(item.category || "Outros") || 0) + Number(item.amount));
  });
  budgets.forEach((budget) => {
    const spent = expenses.get(budget.category) || 0;
    const limit = Number(budget.limit);
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const card = document.createElement("article");
    card.className = "workspace-card budget-card";
    const heading = document.createElement("div");
    heading.className = "budget-card-heading";
    const title = document.createElement("h2");
    title.textContent = budget.category;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.dataset.deleteBudget = budget.id;
    remove.textContent = "Remover limite";
    heading.append(title, remove);
    const amounts = document.createElement("p");
    amounts.textContent = `${formatMoney(spent)} gastos de ${formatMoney(limit)}`;
    const progress = document.createElement("div");
    progress.className = `budget-progress${percentage >= 100 ? " is-over" : percentage >= 80 ? " is-warning" : ""}`;
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", `Orçamento de ${budget.category}: ${percentage}% utilizado`);
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", String(limit));
    progress.setAttribute("aria-valuenow", String(Math.min(spent, limit)));
    const fill = document.createElement("span");
    fill.style.width = `${Math.min(100, percentage)}%`;
    progress.append(fill);
    const status = document.createElement("p");
    status.className = `budget-status${percentage >= 100 ? " is-over" : percentage >= 80 ? " is-warning" : ""}`;
    status.textContent = percentage >= 100
      ? `Limite ultrapassado em ${formatMoney(spent - limit)} (${percentage}%).`
      : `${percentage}% utilizado. Restam ${formatMoney(limit - spent)}.`;
    card.append(heading, amounts, progress, status);
    target.append(card);
  });
}

function renderDueCalendar(obligations) {
  const calendar = byId("due-calendar");
  calendar.replaceChildren();
  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((name) => {
    const weekday = document.createElement("span");
    weekday.className = "calendar-weekday";
    weekday.setAttribute("role", "columnheader");
    weekday.textContent = name;
    calendar.append(weekday);
  });
  const [year, month] = selectedMonth.split("-").map(Number);
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const byDate = new Map();
  obligations.forEach((item) => {
    if (!byDate.has(item.date)) byDate.set(item.date, []);
    byDate.get(item.date).push(item);
  });
  for (let blank = 0; blank < firstWeekday; blank += 1) {
    const cell = document.createElement("span");
    cell.className = "calendar-day is-empty";
    cell.setAttribute("role", "gridcell");
    calendar.append(cell);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = dateInMonth(selectedMonth, day);
    const items = byDate.get(date) || [];
    const cell = document.createElement("div");
    cell.className = `calendar-day${items.length ? " has-due" : ""}`;
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `${day} de ${new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(`${selectedMonth}-01T12:00:00`))}${items.length ? `, ${items.length} vencimento(s)` : ""}`);
    const dayNumber = document.createElement("strong");
    dayNumber.textContent = String(day);
    cell.append(dayNumber);
    items.slice(0, 2).forEach((item) => {
      const event = document.createElement("span");
      event.className = `calendar-event${item.paid ? " is-paid" : item.date < today() ? " is-overdue" : ""}`;
      event.textContent = item.description;
      event.title = `${item.description} · ${formatMoney(item.amount)}${item.paid ? " · Pago" : ""}`;
      cell.append(event);
    });
    if (items.length > 2) {
      const more = document.createElement("small");
      more.textContent = `+${items.length - 2} mais`;
      cell.append(more);
    }
    calendar.append(cell);
  }
  const overdue = obligations.filter((item) => !item.paid && item.date < today()).length;
  const nextThreeDays = new Date();
  nextThreeDays.setDate(nextThreeDays.getDate() + 3);
  const lastUpcomingDate = `${nextThreeDays.getFullYear()}-${String(nextThreeDays.getMonth() + 1).padStart(2, "0")}-${String(nextThreeDays.getDate()).padStart(2, "0")}`;
  const upcoming = obligations.filter((item) => !item.paid && item.date >= today() && item.date <= lastUpcomingDate).length;
  const alert = byId("due-alert");
  alert.className = `due-alert${overdue ? " has-overdue" : upcoming ? " has-upcoming" : ""}`;
  alert.textContent = overdue
    ? `${overdue} compromisso(s) em atraso${upcoming ? ` · ${upcoming} vencem nos próximos 3 dias` : ""}.`
    : upcoming
      ? `${upcoming} compromisso(s) vencem nos próximos 3 dias.`
      : "Sem vencimentos atrasados ou próximos para este mês.";
}

function renderRecurringRules() {
  const table = byId("recurring-table");
  table.replaceChildren();
  if (!state.recurringRules.length) {
    addEmptyRow(table, "Nenhuma regra mensal cadastrada. Marque “Repetir todo mês” ao adicionar um lançamento.", 7);
    return;
  }
  state.recurringRules.forEach((rule) => {
    const row = document.createElement("tr");
    row.append(
      makeCell(rule.description),
      makeCell(rule.category),
      makeCell(rule.source),
      makeCell(rule.type === "income" ? "Receita" : "Despesa"),
      makeCell(formatMoney(rule.amount)),
      makeCell(formatDate(rule.startDate))
    );
    const action = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.dataset.deleteRecurring = rule.id;
    remove.textContent = "Parar repetição";
    remove.setAttribute("aria-label", `Parar repetição de ${rule.description}`);
    action.append(remove);
    row.append(action);
    table.append(row);
  });
}

function getMonthlyObligations(monthTransactions) {
  const bills = state.bills
    .filter((bill) => monthOf(bill.date) === selectedMonth)
    .map((bill) => ({
      kind: "bill",
      id: bill.id,
      date: bill.date,
      description: bill.description,
      category: bill.category,
      source: bill.source || bill.category,
      amount: Number(bill.amount),
      paid: Boolean(bill.paid)
    }));
  const generatedTransactions = monthTransactions
    .filter((item) => item.type === "expense" && (item.installment || item.recurrenceId))
    .map((item) => ({
      kind: "transaction",
      id: item.id,
      date: item.date,
      description: item.description,
      category: item.category,
      source: item.source || "Origem não informada",
      amount: Number(item.amount),
      paid: Boolean(item.paid),
      installment: item.installment
    }));
  const plannedPayments = state.plannedPayments
    .filter((payment) => monthOf(payment.date) === selectedMonth)
    .map((payment) => ({
      kind: "planned",
      id: payment.id,
      planId: payment.planId,
      date: payment.date,
      description: payment.description,
      category: payment.category,
      source: payment.source,
      amount: Number(payment.amount),
      paid: Boolean(payment.paid),
      installment: payment.installment
    }));
  return [...bills, ...generatedTransactions, ...plannedPayments]
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderPlanning(monthTransactions) {
  const obligations = getMonthlyObligations(monthTransactions);
  renderDueCalendar(obligations);
  const table = byId("planning-table");
  table.replaceChildren();
  if (!obligations.length) addEmptyRow(table, "Nenhum compromisso neste mês. Cadastre uma compra ou gasto futuro acima.", 7);

  obligations.forEach((obligation) => {
    const row = document.createElement("tr");
    const installment = obligation.installment
      ? ` (${obligation.installment.current}/${obligation.installment.total})`
      : "";
    row.append(
      makeCell(formatDate(obligation.date)),
      makeCell(`${obligation.description}${installment}`),
      makeCell(obligation.category),
      makeCell(obligation.source || "Origem não informada"),
      makeCell(formatMoney(obligation.amount))
    );
    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `payment-status ${obligation.paid ? "is-paid" : obligation.date < today() ? "is-overdue" : "is-pending"}`;
    status.textContent = obligation.paid ? "Pago" : obligation.date < today() ? "Atrasado" : "A pagar";
    statusCell.append(status);
    const actionCell = document.createElement("td");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `paid-toggle ${obligation.paid ? "is-paid" : ""}`;
    toggle.dataset.paymentKind = obligation.kind;
    toggle.dataset.paymentId = obligation.id;
    toggle.textContent = obligation.paid ? "Desfazer" : "Marcar pago";
    toggle.setAttribute("aria-label", `${obligation.paid ? "Desfazer pagamento de" : "Marcar como pago"} ${obligation.description}`);
    actionCell.append(toggle);
    if (obligation.kind === "planned") {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "delete-button";
      remove.dataset.deletePlan = obligation.planId;
      remove.textContent = "Excluir plano";
      actionCell.append(remove);
    }
    row.append(statusCell, actionCell);
    table.append(row);
  });

  const total = obligations.reduce((sum, item) => sum + item.amount, 0);
  const paid = obligations.filter((item) => item.paid).reduce((sum, item) => sum + item.amount, 0);
  byId("planning-total").textContent = formatMoney(total);
  byId("planning-paid").textContent = formatMoney(paid);
  byId("planning-pending").textContent = formatMoney(total - paid);
  byId("planning-month-label").textContent =
    `Compromissos com vencimento em ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T12:00:00`))}.`;

  const plansTable = byId("planning-plans-table");
  plansTable.replaceChildren();
  if (!state.plannedPayments.length) addEmptyRow(plansTable, "Nenhum plano futuro criado ainda.", 6);
  const plans = new Map();
  state.plannedPayments.forEach((payment) => {
    if (!plans.has(payment.planId)) plans.set(payment.planId, payment);
  });
  plans.forEach((payment, planId) => {
    const planPayments = state.plannedPayments.filter((item) => item.planId === planId);
    const firstPayment = planPayments.reduce((first, item) => item.date < first.date ? item : first, planPayments[0]);
    const row = document.createElement("tr");
    row.append(
      makeCell(payment.description),
      makeCell(payment.source),
      makeCell(formatMoney(planPayments.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0) / 100)),
      makeCell(String(planPayments.length)),
      makeCell(formatDate(firstPayment.date))
    );
    const action = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.dataset.deletePlan = planId;
    remove.textContent = "Excluir plano";
    remove.setAttribute("aria-label", `Excluir plano ${payment.description}`);
    action.append(remove);
    row.append(action);
    plansTable.append(row);
  });

  byId("planning-installments").textContent = String(
    state.plannedPayments.filter((payment) => !payment.paid && payment.installment).length
  );
}

function renderBills(monthTransactions) {
  const table = byId("bills-table");
  table.replaceChildren();
  const bills = state.bills.filter((bill) => monthOf(bill.date) === selectedMonth)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!bills.length) addEmptyRow(table, "Nenhuma conta cadastrada. Adicione uma conta acima para acompanhar o vencimento.", 6);
  bills.forEach((bill) => {
    const row = document.createElement("tr");
    row.append(makeCell(bill.description), makeCell(bill.category), makeCell(formatDate(bill.date)), makeCell(formatMoney(bill.amount)));
    const statusCell = document.createElement("td");
    const status = document.createElement("button");
    status.type = "button";
    status.className = `paid-toggle ${bill.paid ? "is-paid" : ""}`;
    status.dataset.toggleBill = bill.id;
    status.textContent = bill.paid ? "Paga" : "Em aberto";
    statusCell.append(status);
    const action = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.dataset.deleteBill = bill.id;
    remove.textContent = "Excluir";
    remove.setAttribute("aria-label", `Excluir conta ${bill.description}`);
    action.append(remove);
    row.append(statusCell, action);
    table.append(row);
  });
  const upcoming = byId("upcoming-bills");
  upcoming.replaceChildren();
  const pending = getMonthlyObligations(monthTransactions).filter((obligation) => !obligation.paid);
  if (!pending.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma conta em aberto.";
    upcoming.append(empty);
  }
  pending.slice(0, 4).forEach((bill) => {
    const row = document.createElement("div");
    row.className = "due-row";
    const date = document.createElement("span");
    date.className = "due-date";
    const day = document.createElement("strong");
    day.textContent = new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(new Date(`${bill.date}T12:00:00`));
    const month = document.createElement("small");
    month.textContent = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${bill.date}T12:00:00`)).replace(".", "");
    date.append(day, month);
    const description = document.createElement("span");
    description.className = "due-description";
    const title = document.createElement("strong");
    title.textContent = bill.description;
    const category = document.createElement("small");
    const detail = bill.installment ? ` · Parcela ${bill.installment.current}/${bill.installment.total}` : "";
    category.textContent = `${bill.category} · ${bill.source}${detail}`;
    description.append(title, category);
    const amount = document.createElement("strong");
    amount.className = "due-amount";
    amount.textContent = formatMoney(bill.amount);
    row.append(date, description, amount);
    upcoming.append(row);
  });
}

function renderGoals() {
  const target = byId("goals-list");
  target.replaceChildren();
  if (!state.goals.length) {
    const empty = document.createElement("p");
    empty.className = "workspace-card empty-state";
    empty.textContent = "Suas metas aparecerão aqui. Crie uma acima para começar a acompanhar seu progresso.";
    target.append(empty);
  }
  state.goals.forEach((goal) => {
    const card = document.createElement("article");
    card.className = "workspace-card goal-card";
    const heading = document.createElement("h2");
    heading.textContent = goal.name;
    const amounts = document.createElement("p");
    amounts.textContent = `${formatMoney(goal.saved)} guardados de ${formatMoney(goal.target)}`;
    const progress = document.createElement("div");
    progress.className = "goal-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", `Progresso da meta ${goal.name}`);
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    const percentage = Math.min(100, Math.round((goal.saved / goal.target) * 100));
    progress.setAttribute("aria-valuenow", String(percentage));
    const fill = document.createElement("span");
    fill.style.width = `${percentage}%`;
    progress.append(fill);
    const footer = document.createElement("footer");
    const left = document.createElement("span");
    left.textContent = `${percentage}% concluído`;
    const right = document.createElement("span");
    right.textContent = `Faltam ${formatMoney(Math.max(0, goal.target - goal.saved))}`;
    footer.append(left, right);
    const actions = document.createElement("div");
    actions.className = "goal-actions";
    const add = document.createElement("button");
    add.type = "button";
    add.dataset.addGoal = goal.id;
    add.textContent = "Adicionar valor";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.deleteGoal = goal.id;
    remove.textContent = "Excluir meta";
    actions.append(add, remove);
    card.append(heading, amounts, progress, footer, actions);
    target.append(card);
  });
}

function renderBreakdown(target, totals, emptyMessage) {
  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, value]) => value));
  target.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = emptyMessage;
    target.append(empty);
  }
  entries.forEach(([name, value]) => {
    const row = document.createElement("div");
    row.className = "report-row";
    const label = document.createElement("span");
    label.textContent = name;
    const track = document.createElement("span");
    track.className = "report-track";
    const fill = document.createElement("i");
    fill.style.width = `${(value / max) * 100}%`;
    track.append(fill);
    const amount = document.createElement("span");
    amount.textContent = formatMoney(value);
    row.append(label, track, amount);
    target.append(row);
  });
}

function renderReports(monthTransactions, income, expenses) {
  byId("report-income").textContent = formatMoney(income);
  byId("report-expense").textContent = formatMoney(expenses);
  byId("report-balance").textContent = formatMoney(income - expenses);
  const categoryTotals = new Map();
  const sourceTotals = new Map();
  monthTransactions.filter((item) => item.type === "expense").forEach((item) => {
    const amount = Number(item.amount);
    const category = item.category || "Outros";
    const source = item.source || "Origem não informada";
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount);
    sourceTotals.set(source, (sourceTotals.get(source) || 0) + amount);
  });
  state.plannedPayments
    .filter((payment) => monthOf(payment.date) === selectedMonth)
    .forEach((payment) => {
      const amount = Number(payment.amount);
      categoryTotals.set(payment.category, (categoryTotals.get(payment.category) || 0) + amount);
      sourceTotals.set(payment.source, (sourceTotals.get(payment.source) || 0) + amount);
    });
  renderBreakdown(byId("category-report"), categoryTotals, "Adicione despesas para ver a distribuição por categoria.");
  renderBreakdown(byId("source-report"), sourceTotals, "Informe de onde vêm as despesas para ver os totais por origem.");
}

function renderWorkspace() {
  materializeRecurringForMonth(selectedMonth);
  const monthTransactions = state.transactions.filter((item) => monthOf(item.date) === selectedMonth);
  const income = monthTransactions.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
  const plannedExpenses = state.plannedPayments
    .filter((payment) => monthOf(payment.date) === selectedMonth)
    .reduce((total, payment) => total + Number(payment.amount), 0);
  const expenses = monthTransactions.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), plannedExpenses);
  const obligations = getMonthlyObligations(monthTransactions);
  byId("app-income").textContent = formatMoney(income);
  byId("app-expense").textContent = formatMoney(expenses);
  byId("app-balance").textContent = formatMoney(income - expenses);
  byId("app-bills").textContent = String(obligations.filter((item) => !item.paid).length);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(`${selectedMonth}-01T12:00:00`));
  byId("transactions-month-label").textContent = `Lançamentos de ${monthLabel}: origem, categoria e parcelas`;
  renderTransactions(state.transactions);
  renderRecurringRules();
  renderPlanning(monthTransactions);
  renderBills(monthTransactions);
  renderGoals();
  renderBudget(monthTransactions);
  renderReports(monthTransactions, income, expenses);
}

function setScreen(name) {
  document.querySelectorAll("[data-screen-panel]").forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.screenPanel === name);
  });
  document.querySelectorAll(".workspace-nav [data-screen]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === name);
  });
  byId("workspace").classList.remove("sidebar-open");
  byId("mobile-menu-button").setAttribute("aria-expanded", "false");
  if (name === "settings" && state.profile) {
    byId("profile-form").elements.name.value = state.profile.name;
    byId("profile-form").elements.email.value = state.profile.email;
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function setupAuth() {
  document.querySelectorAll("[data-open-auth]").forEach((button) => {
    button.addEventListener("click", () => showAuth(button.dataset.openAuth, button));
  });
  document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab));
  });
  byId("forgot-link").addEventListener("click", showRecovery);
  document.querySelectorAll("[data-auth-back]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode("login"));
  });
  document.querySelector(".modal-close").addEventListener("click", closeAuth);
  byId("auth-modal").addEventListener("click", (event) => {
    if (event.target === byId("auth-modal")) closeAuth();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && byId("auth-modal").classList.contains("is-open")) closeAuth();
    if (event.key !== "Tab" || !byId("auth-modal").classList.contains("is-open")) return;
    const focusable = [...byId("auth-modal").querySelectorAll("a[href], button:not([disabled]), input:not([disabled])")]
      .filter((element) => element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  byId("auth-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim().toLocaleLowerCase("pt-BR");
    const password = String(form.get("password") || "");
    if (authMode === "register") {
      if (password !== form.get("confirm")) {
        byId("auth-notice").textContent = "As senhas digitadas não são iguais.";
        byId("auth-confirm").focus();
        return;
      }
      if (state.profile && state.profile.email !== email) {
        byId("auth-notice").textContent = "Este protótipo aceita um perfil local. Entre com o e-mail já cadastrado neste navegador.";
        return;
      }
      const profile = state.profile && state.profile.email === email
        ? state.profile
        : { name, email };
      state.profile = profile;
      persistState();
      event.currentTarget.reset();
      enterWorkspace(profile);
      return;
    }
    if (!state.profile) {
      byId("auth-notice").textContent = "Nenhum perfil local encontrado. Crie sua conta demonstrativa primeiro.";
      return;
    }
    if (state.profile.email !== email) {
      byId("auth-notice").textContent = "Este e-mail não corresponde ao perfil salvo neste navegador.";
      return;
    }
    event.currentTarget.reset();
    enterWorkspace(state.profile);
  });

  byId("recovery-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "").trim().toLocaleLowerCase("pt-BR");
    const message = state.profile && state.profile.email === email
      ? "O e-mail corresponde ao perfil local. Em um serviço real, um link seguro seria enviado; aqui nenhum e-mail foi disparado."
      : "Se esse e-mail estiver cadastrado, um serviço real enviaria instruções. Esta demonstração não consulta contas nem envia e-mails.";
    showRecoveryResult(message);
  });

  byId("simulate-reset").addEventListener("click", () => {
    byId("recovery-result").hidden = true;
    byId("reset-form").hidden = false;
    byId("auth-title").textContent = "Criar nova senha";
    document.querySelector(".auth-description").textContent = "Tela simulada de redefinição de senha.";
    byId("reset-code").focus();
  });
  byId("reset-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      event.currentTarget.querySelector(".auth-notice").textContent = "As senhas digitadas não são iguais.";
      byId("reset-confirm").focus();
      return;
    }
    event.currentTarget.reset();
    showRecoveryResult("Fluxo demonstrativo concluído. Nenhum código foi validado e nenhuma senha foi alterada.");
    byId("simulate-reset").hidden = true;
  });
}

function setupNavigation() {
  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");
  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    navigation.classList.toggle("nav-open", open);
  });
  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navigation.classList.remove("nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir menu");
    });
  });
  document.querySelectorAll("[data-screen]").forEach((control) => {
    control.addEventListener("click", (event) => {
      if (control.tagName === "A") event.preventDefault();
      setScreen(control.dataset.screen);
    });
  });
  byId("mobile-menu-button").addEventListener("click", () => {
    const open = !byId("workspace").classList.contains("sidebar-open");
    byId("workspace").classList.toggle("sidebar-open", open);
    byId("mobile-menu-button").setAttribute("aria-expanded", String(open));
  });
  byId("signout-button").addEventListener("click", leaveWorkspace);
}

function setupForms() {
  selectedMonth = today().slice(0, 7);
  byId("selected-month").value = selectedMonth;
  byId("transaction-date-from").value = dateInMonth(selectedMonth, 1);
  byId("transaction-date-to").value = dateInMonth(selectedMonth, 31);
  byId("transaction-form").elements.date.value = today();
  byId("bill-form").elements.date.value = today();
  byId("planning-form").elements.date.value = today();
  byId("transaction-search").addEventListener("input", () => renderWorkspace());
  byId("transaction-source-filter").addEventListener("input", () => renderWorkspace());
  byId("transaction-date-from").addEventListener("change", () => renderWorkspace());
  byId("transaction-date-to").addEventListener("change", () => renderWorkspace());
  byId("transaction-amount-min").addEventListener("input", () => renderWorkspace());
  byId("transaction-amount-max").addEventListener("input", () => renderWorkspace());
  byId("transaction-type-filter").addEventListener("change", () => renderWorkspace());
  byId("transaction-category-filter").addEventListener("change", () => renderWorkspace());
  byId("reset-transaction-filters").addEventListener("click", () => {
    byId("transaction-search").value = "";
    byId("transaction-source-filter").value = "";
    byId("transaction-date-from").value = dateInMonth(selectedMonth, 1);
    byId("transaction-date-to").value = dateInMonth(selectedMonth, 31);
    byId("transaction-amount-min").value = "";
    byId("transaction-amount-max").value = "";
    byId("transaction-type-filter").value = "all";
    byId("transaction-category-filter").value = "all";
    renderWorkspace();
  });
  byId("selected-month").addEventListener("change", () => {
    if (!byId("selected-month").value) return;
    selectedMonth = byId("selected-month").value;
    byId("transaction-date-from").value = dateInMonth(selectedMonth, 1);
    byId("transaction-date-to").value = dateInMonth(selectedMonth, 31);
    renderWorkspace();
  });
  const transactionForm = byId("transaction-form");
  const recurringInput = transactionForm.elements.recurring;
  const installmentInput = transactionForm.elements.installments;
  const typeInput = transactionForm.elements.type;
  function updateTransactionOptions() {
    const isIncome = typeInput.value === "income";
    if (isIncome) installmentInput.value = "1";
    if (Number(installmentInput.value) > 1) recurringInput.checked = false;
    recurringInput.disabled = Number(installmentInput.value) > 1;
    installmentInput.disabled = recurringInput.checked || isIncome;
  }
  recurringInput.addEventListener("change", updateTransactionOptions);
  installmentInput.addEventListener("input", updateTransactionOptions);
  typeInput.addEventListener("change", updateTransactionOptions);
  updateTransactionOptions();

  byId("transaction-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountInCents = Math.round(Number(form.get("amount")) * 100);
    const type = String(form.get("type"));
    const installmentCount = Number(installmentInput.value);
    const isRecurring = recurringInput.checked;
    const source = String(form.get("source") || "").trim();
    if (!source) {
      notify("Informe a origem do lançamento, como a loja, empresa ou estabelecimento.");
      transactionForm.elements.source.focus();
      return;
    }
    if (editingTransactionId) {
      const current = state.transactions.find((item) => item.id === editingTransactionId);
      if (!current) {
        cancelTransactionEdit();
        notify("Este lançamento não está mais disponível para edição.");
        return;
      }
      Object.assign(current, {
        description: String(form.get("description")).trim(),
        amount: amountInCents / 100,
        type,
        category: String(form.get("category")),
        source,
        date: String(form.get("date"))
      });
      persistState();
      cancelTransactionEdit();
      renderWorkspace();
      notify("Movimentação atualizada. Os demais meses de uma série não foram alterados.");
      return;
    }
    if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 60) {
      notify("Informe de 1 a 60 parcelas.");
      installmentInput.focus();
      return;
    }
    if (isRecurring && installmentCount > 1) {
      notify("Um lançamento mensal fixo não pode ser parcelado. Escolha uma opção.");
      return;
    }
    const transaction = {
      description: String(form.get("description")).trim(),
      type,
      category: String(form.get("category")),
      source,
      date: String(form.get("date"))
    };
    if (isRecurring) {
      const rule = {
        id: makeId(),
        ...transaction,
        amount: amountInCents / 100,
        startDate: transaction.date
      };
      state.recurringRules.push(rule);
      materializeRecurringForMonth(selectedMonth);
    } else if (installmentCount > 1) {
      if (type !== "expense") {
        notify("Parcelamento está disponível para despesas. Para receitas, use um lançamento simples.");
        return;
      }
      const planId = makeId();
      const baseCents = Math.floor(amountInCents / installmentCount);
      const remainderCents = amountInCents % installmentCount;
      for (let index = 0; index < installmentCount; index += 1) {
        state.transactions.push({
          id: makeId(),
          installmentId: planId,
          description: transaction.description,
          amount: (baseCents + (index < remainderCents ? 1 : 0)) / 100,
          type,
          category: transaction.category,
          source,
          date: addMonths(transaction.date, index),
          installment: { current: index + 1, total: installmentCount }
        });
      }
    } else {
      state.transactions.push({ id: makeId(), ...transaction, amount: amountInCents / 100 });
    }
    persistState();
    event.currentTarget.reset();
    event.currentTarget.elements.date.value = today();
    updateTransactionOptions();
    renderWorkspace();
    notify(isRecurring
      ? "Regra mensal salva. O lançamento deste mês foi criado e os próximos serão gerados quando você abrir cada mês."
      : installmentCount > 1
        ? `Compra parcelada salva em ${installmentCount} parcelas, com origem e vencimentos mensais registrados.`
        : "Movimentação adicionada.");
  });
  byId("cancel-transaction-edit").addEventListener("click", cancelTransactionEdit);
  byId("bill-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.bills.push({
      id: makeId(), description: String(form.get("description")).trim(),
      amount: Number(form.get("amount")), category: String(form.get("category")).trim(),
      date: String(form.get("date")), paid: false
    });
    persistState();
    event.currentTarget.reset();
    event.currentTarget.elements.date.value = today();
    renderWorkspace();
    notify("Conta adicionada.");
  });
  byId("planning-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountCents = Math.round(Number(form.get("amount")) * 100);
    const count = Number(form.get("installments"));
    const startDate = String(form.get("date"));
    const source = String(form.get("source") || "").trim();
    if (!Number.isInteger(count) || count < 1 || count > 60) {
      notify("Informe de 1 a 60 parcelas para este planejamento.");
      event.currentTarget.elements.installments.focus();
      return;
    }
    if (!source) {
      notify("Informe a loja, empresa ou origem do gasto.");
      event.currentTarget.elements.source.focus();
      return;
    }
    const planId = makeId();
    const baseCents = Math.floor(amountCents / count);
    const remainderCents = amountCents % count;
    for (let index = 0; index < count; index += 1) {
      state.plannedPayments.push({
        id: makeId(),
        planId,
        description: String(form.get("description")).trim(),
        category: String(form.get("category")),
        source,
        amount: (baseCents + (index < remainderCents ? 1 : 0)) / 100,
        date: addMonths(startDate, index),
        paid: false,
        installment: count > 1 ? { current: index + 1, total: count } : null
      });
    }
    persistState();
    event.currentTarget.reset();
    event.currentTarget.elements.date.value = today();
    event.currentTarget.elements.installments.value = "1";
    renderWorkspace();
    setScreen("planning");
    notify(count > 1
      ? `Planejamento criado: ${count} parcelas mensais, com vencimento e valor individual registrados.`
      : "Gasto futuro planejado com sucesso.");
  });
  byId("goal-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.goals.push({
      id: makeId(), name: String(form.get("name")).trim(),
      target: Number(form.get("target")), saved: Number(form.get("saved") || 0)
    });
    persistState();
    event.currentTarget.reset();
    renderGoals();
    notify("Meta criada.");
  });
  byId("budget-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const category = String(form.get("category"));
    const limitCents = Math.round(Number(form.get("limit")) * 100);
    if (!Number.isSafeInteger(limitCents) || limitCents <= 0) {
      notify("Informe um limite mensal maior que zero.");
      event.currentTarget.elements.limit.focus();
      return;
    }
    const existing = state.budgets.find((budget) => budget.month === selectedMonth && budget.category === category);
    if (existing) existing.limit = limitCents / 100;
    else state.budgets.push({ id: makeId(), month: selectedMonth, category, limit: limitCents / 100 });
    persistState();
    event.currentTarget.reset();
    renderWorkspace();
    notify(`Limite de ${category} salvo para o mês selecionado.`);
  });
  byId("profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.profile = {
      name: String(form.get("name")).trim(),
      email: String(form.get("email")).trim().toLocaleLowerCase("pt-BR")
    };
    persistState();
    byId("workspace-user").firstChild.textContent = state.profile.name;
    byId("workspace-email").textContent = state.profile.email;
    byId("workspace-avatar").textContent = (state.profile.name[0] || "C").toLocaleUpperCase("pt-BR");
    notify("Perfil atualizado neste navegador.");
  });
  byId("password-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const notice = event.currentTarget.querySelector(".account-help");
    if (form.get("password") !== form.get("confirm")) {
      notice.textContent = "As senhas digitadas não são iguais.";
      byId("password-form").elements.confirm.focus();
      return;
    }
    event.currentTarget.reset();
    notice.textContent = "Simulação concluída. Nenhuma senha foi verificada, alterada ou salva.";
  });
  byId("export-data-button").addEventListener("click", exportBackup);
  byId("import-data-file").addEventListener("change", importBackup);
}

function cancelTransactionEdit() {
  const form = byId("transaction-form");
  editingTransactionId = "";
  form.reset();
  form.elements.date.value = today();
  form.elements.recurring.disabled = false;
  form.elements.installments.disabled = false;
  byId("transaction-submit").textContent = "Adicionar lançamento";
  byId("cancel-transaction-edit").hidden = true;
  form.closest(".workspace-card").querySelector(".form-hint").textContent =
    "Em compras parceladas, informe o valor total: o sistema divide o valor e registra cada parcela nos meses seguintes. Para despesas fixas, marque “Repetir todo mês”.";
  form.elements.type.dispatchEvent(new Event("change"));
}

function beginTransactionEdit(id) {
  const transaction = state.transactions.find((item) => item.id === id);
  if (!transaction) return;
  const form = byId("transaction-form");
  editingTransactionId = id;
  form.elements.description.value = transaction.description;
  form.elements.amount.value = transaction.amount;
  form.elements.type.value = transaction.type;
  form.elements.category.value = transaction.category;
  form.elements.source.value = transaction.source || "";
  form.elements.date.value = transaction.date;
  form.elements.recurring.checked = false;
  form.elements.recurring.disabled = true;
  form.elements.installments.value = String(transaction.installment ? transaction.installment.total : 1);
  form.elements.installments.disabled = true;
  byId("transaction-submit").textContent = "Salvar alterações";
  byId("cancel-transaction-edit").hidden = false;
  form.closest(".workspace-card").querySelector(".form-hint").textContent =
    "Esta edição altera somente o lançamento selecionado; outros meses da recorrência ou do parcelamento permanecem iguais.";
  setScreen("transactions");
  form.elements.description.focus();
}

function exportBackup() {
  try {
    const backup = {
      format: "controle-financeiro-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(state))
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `controle-financeiro-backup-${today()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Backup exportado. Guarde o arquivo em um local seguro.");
  } catch (error) {
    console.error("Não foi possível exportar o backup:", error);
    notify("Não foi possível exportar o backup neste navegador.");
  }
}

function validateBackup(parsed) {
  if (!parsed || parsed.format !== "controle-financeiro-backup" || parsed.version !== 1 ||
      !parsed.data || typeof parsed.data !== "object" || !parsed.data.profile ||
      typeof parsed.data.profile.name !== "string" || !parsed.data.profile.name.trim() ||
      typeof parsed.data.profile.email !== "string" || !parsed.data.profile.email.trim()) {
    throw new Error("Este arquivo não é um backup válido do Controle Financeiro.");
  }
  const collectionNames = ["transactions", "bills", "goals", "recurringRules", "plannedPayments", "budgets"];
  collectionNames.forEach((name) => {
    if (parsed.data[name] !== undefined && !Array.isArray(parsed.data[name])) {
      throw new Error(`A lista "${name}" do backup está inválida.`);
    }
  });
  ["transactions", "bills", "goals"].forEach((name) => {
    if (!Array.isArray(parsed.data[name])) throw new Error(`O backup não contém a lista "${name}".`);
  });
  const data = {
    profile: { name: parsed.data.profile.name, email: parsed.data.profile.email },
    transactions: parsed.data.transactions,
    bills: parsed.data.bills,
    goals: parsed.data.goals,
    recurringRules: parsed.data.recurringRules || [],
    plannedPayments: parsed.data.plannedPayments || [],
    budgets: parsed.data.budgets || []
  };
  data.transactions.concat(data.bills, data.goals, data.recurringRules, data.plannedPayments, data.budgets)
    .forEach((item) => {
      if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id) {
        throw new Error("O backup contém um item inválido ou sem identificador.");
      }
    });
  const validDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    const localValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return !Number.isNaN(date.getTime()) && localValue === value;
  };
  const validMonth = (value) => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
  data.transactions.forEach((item) => {
    if (typeof item.description !== "string" || !["income", "expense"].includes(item.type) ||
        typeof item.category !== "string" || !Number.isFinite(Number(item.amount)) ||
        Number(item.amount) <= 0 || !validDate(item.date)) {
      throw new Error("O backup contém uma movimentação inválida.");
    }
  });
  data.bills.forEach((item) => {
    if (typeof item.description !== "string" || typeof item.category !== "string" ||
        !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0 || !validDate(item.date)) {
      throw new Error("O backup contém uma conta inválida.");
    }
  });
  data.goals.forEach((item) => {
    if (typeof item.name !== "string" || !Number.isFinite(Number(item.target)) ||
        Number(item.target) <= 0 || !Number.isFinite(Number(item.saved)) || Number(item.saved) < 0) {
      throw new Error("O backup contém uma meta inválida.");
    }
  });
  data.recurringRules.forEach((item) => {
    if (typeof item.description !== "string" || !["income", "expense"].includes(item.type) ||
        typeof item.category !== "string" || !Number.isFinite(Number(item.amount)) ||
        Number(item.amount) <= 0 || !validDate(item.startDate)) {
      throw new Error("O backup contém uma regra recorrente inválida.");
    }
  });
  data.plannedPayments.forEach((item) => {
    if (typeof item.description !== "string" || typeof item.category !== "string" ||
        typeof item.source !== "string" || typeof item.planId !== "string" ||
        !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0 || !validDate(item.date)) {
      throw new Error("O backup contém uma parcela planejada inválida.");
    }
  });
  data.budgets.forEach((item) => {
    if (typeof item.category !== "string" || !validMonth(item.month) ||
        !Number.isFinite(Number(item.limit)) || Number(item.limit) <= 0) {
      throw new Error("O backup contém um limite de orçamento inválido.");
    }
  });
  return data;
}

async function importBackup(event) {
  const input = event.currentTarget;
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error("O backup excede o limite de 5 MB.");
    const parsed = JSON.parse(await file.text());
    const imported = validateBackup(parsed);
    if (!window.confirm("Importar este backup substituirá o perfil e todos os dados locais atuais. Deseja continuar?")) return;
    const previous = JSON.parse(JSON.stringify(state));
    Object.assign(state, imported);
    if (!persistState()) {
      Object.assign(state, previous);
      renderWorkspace();
      return;
    }
    byId("workspace-user").firstChild.textContent = state.profile.name;
    byId("workspace-email").textContent = state.profile.email;
    byId("workspace-avatar").textContent = (state.profile.name[0] || "C").toLocaleUpperCase("pt-BR");
    byId("profile-form").elements.name.value = state.profile.name;
    byId("profile-form").elements.email.value = state.profile.email;
    renderWorkspace();
    notify("Backup importado e salvo neste navegador.");
  } catch (error) {
    console.error("Não foi possível importar o backup:", error);
    notify(error instanceof SyntaxError ? "O arquivo selecionado não contém JSON válido." : error.message || "Não foi possível importar este backup.");
  } finally {
    input.value = "";
  }
}

function setupWorkspaceActions() {
  byId("screen-planning").addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-payment-kind]");
    if (toggle) {
      const { paymentKind, paymentId } = toggle.dataset;
      if (paymentKind === "bill") {
        const bill = state.bills.find((item) => item.id === paymentId);
        if (bill) bill.paid = !bill.paid;
      } else if (paymentKind === "transaction") {
        const transaction = state.transactions.find((item) => item.id === paymentId);
        if (transaction) transaction.paid = !transaction.paid;
      } else if (paymentKind === "planned") {
        const payment = state.plannedPayments.find((item) => item.id === paymentId);
        if (payment) payment.paid = !payment.paid;
      }
      persistState();
      renderWorkspace();
      notify("Status do pagamento atualizado.");
      return;
    }
    const remove = event.target.closest("[data-delete-plan]");
    if (!remove) return;
    const planId = remove.dataset.deletePlan;
    state.plannedPayments = state.plannedPayments.filter((payment) => payment.planId !== planId);
    persistState();
    renderWorkspace();
    notify("Planejamento removido.");
  });
  byId("transactions-table").addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-transaction]");
    if (edit) {
      beginTransactionEdit(edit.dataset.editTransaction);
      return;
    }
    const button = event.target.closest("[data-delete-transaction]");
    if (!button) return;
    const transaction = state.transactions.find((item) => item.id === button.dataset.deleteTransaction);
    if (transaction && transaction.recurrenceId) {
      state.recurringRules = state.recurringRules.filter((rule) => rule.id !== transaction.recurrenceId);
      state.transactions = state.transactions.filter((item) => item.recurrenceId !== transaction.recurrenceId);
      persistState();
      renderWorkspace();
      notify("Regra mensal e lançamentos gerados removidos.");
      return;
    }
    if (transaction && transaction.installmentId) {
      state.transactions = state.transactions.filter((item) => item.installmentId !== transaction.installmentId);
      persistState();
      renderWorkspace();
      notify("Compra parcelada e parcelas futuras removidas.");
      return;
    }
    state.transactions = state.transactions.filter((item) => item.id !== button.dataset.deleteTransaction);
    persistState();
    renderWorkspace();
    notify("Movimentação excluída.");
  });
  byId("recurring-table").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-recurring]");
    if (!button) return;
    const recurringId = button.dataset.deleteRecurring;
    state.recurringRules = state.recurringRules.filter((rule) => rule.id !== recurringId);
    state.transactions = state.transactions.filter((item) => item.recurrenceId !== recurringId);
    persistState();
    renderWorkspace();
    notify("Lançamento mensal cancelado e ocorrências removidas.");
  });
  byId("bills-table").addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-bill]");
    if (toggle) {
      const bill = state.bills.find((item) => item.id === toggle.dataset.toggleBill);
      if (bill) bill.paid = !bill.paid;
      persistState();
      renderWorkspace();
      notify("Status da conta atualizado.");
      return;
    }
    const remove = event.target.closest("[data-delete-bill]");
    if (!remove) return;
    state.bills = state.bills.filter((item) => item.id !== remove.dataset.deleteBill);
    persistState();
    renderWorkspace();
    notify("Conta excluída.");
  });
  byId("goals-list").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-delete-goal]");
    if (remove) {
      state.goals = state.goals.filter((item) => item.id !== remove.dataset.deleteGoal);
      persistState();
      renderGoals();
      notify("Meta excluída.");
      return;
    }
    const add = event.target.closest("[data-add-goal]");
    if (!add) return;
    const raw = window.prompt("Quanto deseja adicionar à meta? Informe um valor em reais.");
    if (raw === null) return;
    const amount = Number(raw.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      notify("Informe um valor maior que zero.");
      return;
    }
    const goal = state.goals.find((item) => item.id === add.dataset.addGoal);
    if (goal) goal.saved += amount;
    persistState();
    renderGoals();
    notify("Progresso da meta atualizado.");
  });
  byId("budget-list").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-delete-budget]");
    if (!remove) return;
    state.budgets = state.budgets.filter((budget) => budget.id !== remove.dataset.deleteBudget);
    persistState();
    renderWorkspace();
    notify("Limite de orçamento removido.");
  });
  byId("clear-data-button").addEventListener("click", () => {
    if (!window.confirm("Apagar permanentemente todos os dados locais deste protótipo neste navegador?")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Não foi possível apagar os dados locais:", error);
      notify("Não foi possível apagar os dados deste navegador.");
      return;
    }
    state.profile = null;
    state.transactions = [];
    state.bills = [];
    state.goals = [];
    state.recurringRules = [];
    state.plannedPayments = [];
    state.budgets = [];
    leaveWorkspace();
    showAuth("register", byId("clear-data-button"));
    byId("auth-notice").textContent = "Dados locais apagados. Crie um novo perfil para começar.";
  });
}

function setupLandingPreview() {
  byId("hero-balance").textContent = formatMoney(3280.45);
  byId("feature-balance").textContent = formatMoney(3280.45);
  byId("hero-income").textContent = formatMoney(5400);
  byId("hero-expense").textContent = formatMoney(2119.55);
  byId("bill-preview").innerHTML = '<div class="preview-bill-row"><span class="preview-bill-icon">⌂</span><span><strong>Aluguel</strong><small>Vence em 10 out</small></span><b>R$ 1.200,00</b></div><div class="preview-bill-row"><span class="preview-bill-icon">✳</span><span><strong>Internet</strong><small>Vence em 15 out</small></span><b>R$ 99,90</b></div>';
}

function init() {
  loadState();
  setupNavigation();
  setupAuth();
  setupForms();
  setupWorkspaceActions();
  setupLandingPreview();
  if (state.profile) {
    document.querySelectorAll("[data-open-auth='login']").forEach((button) => {
      button.textContent = "Continuar";
      button.dataset.openAuth = "login";
    });
  }
}

init();
