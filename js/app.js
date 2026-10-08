"use strict";

const STORAGE_KEY = "clareza-demo-v1";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const state = { profile: null, transactions: [], bills: [], goals: [] };
let previousFocus = null;
let authMode = "login";

const byId = (id) => document.getElementById(id);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatDate = (value) => dateFormat.format(new Date(`${value}T12:00:00`)).replace(".", "");
const formatMoney = (value) => money.format(Number(value) || 0);

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

function renderTransactions() {
  const rows = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  const table = byId("transactions-table");
  table.replaceChildren();
  if (!rows.length) addEmptyRow(table, "Ainda não há movimentações. Adicione sua primeira receita ou despesa acima.", 6);
  rows.forEach((item) => {
    const row = document.createElement("tr");
    row.append(makeCell(item.description), makeCell(item.category), makeCell(formatDate(item.date)), makeCell(item.type === "income" ? "Receita" : "Despesa"));
    const amount = makeCell(`${item.type === "income" ? "+" : "−"} ${formatMoney(item.amount)}`);
    amount.className = item.type === "income" ? "amount-income" : "";
    row.append(amount);
    const action = document.createElement("td");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.dataset.deleteTransaction = item.id;
    remove.textContent = "Excluir";
    remove.setAttribute("aria-label", `Excluir ${item.description}`);
    action.append(remove);
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
    detail.textContent = `${item.category} · ${formatDate(item.date)}`;
    description.append(title, detail);
    const amount = document.createElement("strong");
    amount.className = `transaction-amount ${item.type === "income" ? "amount-income" : ""}`;
    amount.textContent = `${item.type === "income" ? "+" : "−"} ${formatMoney(item.amount)}`;
    row.append(icon, description, amount);
    recent.append(row);
  });
}

function renderBills() {
  const table = byId("bills-table");
  table.replaceChildren();
  const bills = [...state.bills].sort((a, b) => a.date.localeCompare(b.date));
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
  const pending = bills.filter((bill) => !bill.paid);
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
    category.textContent = bill.category;
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

function renderReports(income, expenses) {
  byId("report-income").textContent = formatMoney(income);
  byId("report-expense").textContent = formatMoney(expenses);
  byId("report-balance").textContent = formatMoney(income - expenses);
  const totals = new Map();
  state.transactions.filter((item) => item.type === "expense").forEach((item) => {
    totals.set(item.category, (totals.get(item.category) || 0) + Number(item.amount));
  });
  const categories = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...categories.map(([, value]) => value));
  const report = byId("category-report");
  report.replaceChildren();
  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Adicione despesas para ver a distribuição por categoria.";
    report.append(empty);
  }
  categories.forEach(([name, value]) => {
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
    report.append(row);
  });
}

function renderWorkspace() {
  const income = state.transactions.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
  const expenses = state.transactions.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0);
  byId("app-income").textContent = formatMoney(income);
  byId("app-expense").textContent = formatMoney(expenses);
  byId("app-balance").textContent = formatMoney(income - expenses);
  byId("app-bills").textContent = String(state.bills.filter((bill) => !bill.paid).length);
  renderTransactions();
  renderBills();
  renderGoals();
  renderReports(income, expenses);
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
  byId("transaction-form").elements.date.value = today();
  byId("bill-form").elements.date.value = today();
  byId("transaction-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    state.transactions.push({
      id: makeId(), description: String(form.get("description")).trim(),
      amount: Number(form.get("amount")), type: String(form.get("type")),
      category: String(form.get("category")), date: String(form.get("date"))
    });
    persistState();
    event.currentTarget.reset();
    event.currentTarget.elements.date.value = today();
    renderWorkspace();
    notify("Movimentação adicionada.");
  });
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
}

function setupWorkspaceActions() {
  byId("transactions-table").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-transaction]");
    if (!button) return;
    state.transactions = state.transactions.filter((item) => item.id !== button.dataset.deleteTransaction);
    persistState();
    renderWorkspace();
    notify("Movimentação excluída.");
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
