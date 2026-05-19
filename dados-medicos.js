/*
  ARQUIVO JAVASCRIPT DO DASHBOARD MÉDICO
  Função: salva os médicos, filtra dados, atualiza KPIs, gráficos, ranking e controla o painel de cadastro.
*/

// GERADOR DE ID SEGURO: evita erro do crypto.randomUUID em alguns navegadores/VS Code.
function createSafeId(prefix = "id") {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : null;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}


// SEGURANÇA VISUAL: mesmo se algum script externo falhar, o site não fica invisível.
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("loaded");
});

// CHAVE DO LOCALSTORAGE: nome usado para salvar os dados no navegador.
const STORAGE_KEY = "amorsaude_doctors_dashboard_v2";

// DADOS INICIAIS: médicos que aparecem quando ainda não existe nada salvo.
const defaultDoctors = [
  {
    id: createSafeId("doctor"),
    nome: "Dr. Pedro Lucas",
    especialidade: "Clínico Geral",
    periodo: "Maio de 2026",
    consultas: 219,
    valor: 31755,
    faltas: 11
  },
  {
    id: createSafeId("doctor"),
    nome: "Dra. Larissa Junqueira Akl",
    especialidade: "Dermatologista",
    periodo: "Maio de 2026",
    consultas: 188,
    valor: 27260,
    faltas: 14
  },
  {
    id: createSafeId("doctor"),
    nome: "Dr. Lucas De Castro Bortolanza e Souza",
    especialidade: "Neurologista",
    periodo: "Abril de 2026",
    consultas: 168,
    valor: 24360,
    faltas: 10
  },
  {
    id: createSafeId("doctor"),
    nome: "Dra. Ingrid Lycarião Guimarães",
    especialidade: "Neurologista",
    periodo: "Março de 2026",
    consultas: 142,
    valor: 20590,
    faltas: 13
  },
  {
    id: createSafeId("doctor"),
    nome: "Dr. Rodrigo Fernandes Couri Pedrosa",
    especialidade: "Ortopedista",
    periodo: "Fevereiro de 2026",
    consultas: 132,
    valor: 19140,
    faltas: 9
  }
];

// LISTA PRINCIPAL: recebe os médicos salvos ou os dados iniciais.
let doctors = loadDoctors();

// ORDEM DOS MESES: usada para organizar gráficos e filtros corretamente.
const monthOrder = [
  "Janeiro de 2026",
  "Fevereiro de 2026",
  "Março de 2026",
  "Abril de 2026",
  "Maio de 2026",
  "Junho de 2026",
  "Julho de 2026",
  "Agosto de 2026",
  "Setembro de 2026",
  "Outubro de 2026",
  "Novembro de 2026",
  "Dezembro de 2026"
];

// NORMALIZA MÊS: aceita valores antigos como "maio" ou "Maio 2026" e converte para "Maio de 2026".
function normalizePeriodo(value) {
  if (!value) return "Maio de 2026";

  const clean = String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const map = {
    janeiro: "Janeiro de 2026",
    fevereiro: "Fevereiro de 2026",
    marco: "Março de 2026",
    março: "Março de 2026",
    abril: "Abril de 2026",
    maio: "Maio de 2026",
    junho: "Junho de 2026",
    julho: "Julho de 2026",
    agosto: "Agosto de 2026",
    setembro: "Setembro de 2026",
    outubro: "Outubro de 2026",
    novembro: "Novembro de 2026",
    dezembro: "Dezembro de 2026"
  };

  for (const month of Object.keys(map)) {
    if (clean.includes(month)) {
      return map[month];
    }
  }

  return value;
}

// CORRIGE DADOS ANTIGOS: atualiza médicos já salvos com mês no formato certo.
function normalizeDoctorsPeriods() {
  let changed = false;

  doctors = doctors.map((doctor) => {
    const fixedPeriodo = normalizePeriodo(doctor.periodo);

    if (doctor.periodo !== fixedPeriodo) {
      changed = true;
    }

    return {
      ...doctor,
      periodo: fixedPeriodo
    };
  });

  if (changed) {
    saveDoctors();
  }
}

normalizeDoctorsPeriods();

// INICIALIZAÇÃO: quando a página carrega, ativa animações e renderiza tudo.
window.addEventListener("load", () => {
  document.body.classList.add("loaded");

  renderAll();

  setTimeout(() => {
    animateNumbers();
    animateRankingBars();
    animateBarChart();
    animateDonutChart();
  }, 350);
});

// CARREGA MÉDICOS: busca os dados no navegador. Se não existir, usa a lista padrão.
function loadDoctors() {
  const savedDoctors = localStorage.getItem(STORAGE_KEY);

  if (!savedDoctors) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDoctors));
    return defaultDoctors;
  }

  try {
    return JSON.parse(savedDoctors);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultDoctors));
    return defaultDoctors;
  }
}

// SALVA MÉDICOS: grava a lista atual no navegador.
function saveDoctors() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(doctors));
}

// ATALHO: facilita pegar elementos pelo ID.
function $(id) {
  return document.getElementById(id);
}

// FORMATA DINHEIRO: transforma número em moeda brasileira.
function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });
}

function formatMoneySmall(value) {
  const number = Number(value);

  if (number >= 1000) {
    return `R$ ${(number / 1000).toFixed(0)}k`;
  }

  return formatMoney(number);
}

// LÊ FILTRO DE MÊS: pega o período selecionado no dashboard.
function getSelectedPeriodo() {
  const periodoSelect = $("periodoSelect");
  return periodoSelect ? normalizePeriodo(periodoSelect.value) : "todos";
}

function getSelectedDoctor() {
  const doctorSelect = $("doctorSelect");
  return doctorSelect ? doctorSelect.value : "todos";
}

function getSelectedSpecialty() {
  const specialtySelect = $("specialtySelect");
  return specialtySelect ? specialtySelect.value : "todas";
}

// FILTRA MÉDICOS: aplica os filtros de mês, médico e especialidade.
function getFilteredDoctors() {
  const periodo = getSelectedPeriodo();
  const doctorName = getSelectedDoctor();
  const especialidade = getSelectedSpecialty();

  return doctors.filter((doctor) => {
    const doctorPeriodo = doctor.periodo || "Maio de 2026";

    const byPeriodo = periodo === "todos" || doctorPeriodo === periodo;
    const byDoctor = doctorName === "todos" || doctor.nome === doctorName;
    const bySpecialty = especialidade === "todas" || doctor.especialidade === especialidade;

    return byPeriodo && byDoctor && bySpecialty;
  });
}


// CALCULA TOTAIS: soma consultas, arrecadação, faltas, média, presença e ticket médio.
function getTotals(data = doctors) {
  const medicosUnicos = new Set(data.map((doctor) => doctor.nome)).size;
  const consultas = data.reduce((total, doctor) => total + Number(doctor.consultas || 0), 0);
  const valor = data.reduce((total, doctor) => total + Number(doctor.valor || 0), 0);
  const faltas = data.reduce((total, doctor) => total + Number(doctor.faltas || 0), 0);
  const media = consultas > 0 ? Math.round(consultas / 22) : 0;
  const presencas = Math.max(consultas - faltas, 0);
  const taxaOcupacao = consultas > 0 ? Math.round((presencas / consultas) * 100) : 0;
  const ticketMedio = consultas > 0 ? valor / consultas : 0;
  const indiceFaltas = consultas > 0 ? ((faltas / consultas) * 100).toFixed(1) : "0.0";

  return {
    medicos: medicosUnicos,
    consultas,
    valor,
    faltas,
    media,
    presencas,
    taxaOcupacao,
    ticketMedio,
    indiceFaltas
  };
}

// RENDERIZA TUDO: atualiza filtros, dashboard e lista de médicos salvos.
function renderAll() {
  renderFilterOptions();
  renderDashboard();
  renderSavedDoctors();
}

// RENDERIZA DASHBOARD: atualiza todos os blocos visuais com os dados filtrados.
function renderDashboard() {
  const filtered = getFilteredDoctors();
  const totals = getTotals(filtered);

  renderKpis(totals);
  renderRanking(filtered);
  renderRevenueChart();
  renderDonutInfo(totals);
  renderPieChart(filtered);
  renderInsights(totals);
}

// ATUALIZA OPÇÕES DOS FILTROS: monta as opções dos selects automaticamente.
function renderFilterOptions() {
  renderDoctorSelect();
  renderSpecialtySelect();
  renderPeriodoSelect();
  renderDoctorMonthSelect();
}

function renderDoctorSelect() {
  const doctorSelect = $("doctorSelect");

  if (!doctorSelect) return;

  const currentValue = doctorSelect.value || "todos";

  const uniqueDoctors = [];

  doctors.forEach((doctor) => {
    const exists = uniqueDoctors.some((item) => item.nome === doctor.nome);

    if (!exists) {
      uniqueDoctors.push(doctor);
    }
  });

  doctorSelect.innerHTML = `<option value="todos">Todos os médicos</option>`;

  uniqueDoctors.forEach((doctor) => {
    const option = document.createElement("option");
    option.value = doctor.nome;
    option.textContent = doctor.nome;
    doctorSelect.appendChild(option);
  });

  const exists = [...doctorSelect.options].some((option) => option.value === currentValue);
  doctorSelect.value = exists ? currentValue : "todos";
}

function renderSpecialtySelect() {
  const specialtySelect = $("specialtySelect");

  if (!specialtySelect) return;

  const currentValue = specialtySelect.value || "todas";
  const specialties = [...new Set(doctors.map((doctor) => doctor.especialidade))].sort();

  specialtySelect.innerHTML = `<option value="todas">Todas as especialidades</option>`;

  specialties.forEach((specialty) => {
    const option = document.createElement("option");
    option.value = specialty;
    option.textContent = specialty;
    specialtySelect.appendChild(option);
  });

  const exists = [...specialtySelect.options].some((option) => option.value === currentValue);
  specialtySelect.value = exists ? currentValue : "todas";
}

function renderPeriodoSelect() {
  const periodoSelect = $("periodoSelect");

  if (!periodoSelect) return;

  const currentValue = normalizePeriodo(periodoSelect.value || "Maio de 2026");

  periodoSelect.innerHTML = `<option value="todos">Todos os meses</option>`;

  monthOrder.forEach((period) => {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = period.replace(" de ", " ");
    periodoSelect.appendChild(option);
  });

  const exists = [...periodoSelect.options].some((option) => option.value === currentValue);
  periodoSelect.value = exists ? currentValue : "Maio de 2026";
}

function renderDoctorMonthSelect() {
  const doctorMonth = $("doctorPeriod") || $("doctorMonth");

  if (!doctorMonth) return;

  const currentValue = normalizePeriodo(doctorMonth.value || "Maio de 2026");

  doctorMonth.innerHTML = `<option value="">Selecione o mês</option>`;

  monthOrder.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month.replace(" de ", " ");
    doctorMonth.appendChild(option);
  });

  doctorMonth.value = monthOrder.includes(currentValue) ? currentValue : "Maio de 2026";
}

// ATUALIZA CARDS KPI: coloca os números nos cards principais.
function renderKpis(data) {
  const cards = document.querySelectorAll(".kpi-card strong");

  if (cards.length < 5) return;

  cards[0].dataset.value = data.medicos;
  cards[1].dataset.value = data.consultas;
  cards[2].dataset.value = data.valor;
  cards[3].dataset.value = data.faltas;
  cards[4].dataset.value = data.media;

  cards.forEach((card) => {
    card.textContent = card.dataset.money === "true" ? "R$ 0" : "0";
  });
}

// ATUALIZA RANKING: mostra os médicos com mais consultas.
function renderRanking(data = doctors) {
  const rankingList = document.querySelector(".ranking-list");

  if (!rankingList) return;

  if (!data.length) {
    rankingList.innerHTML = `
      <div class="empty-state">
        Nenhum médico encontrado para este filtro.
      </div>
    `;
    return;
  }

  const grouped = {};

  data.forEach((doctor) => {
    if (!grouped[doctor.nome]) {
      grouped[doctor.nome] = {
        nome: doctor.nome,
        consultas: 0
      };
    }

    grouped[doctor.nome].consultas += Number(doctor.consultas || 0);
  });

  const orderedDoctors = Object.values(grouped).sort((a, b) => b.consultas - a.consultas);
  const biggestValue = orderedDoctors[0]?.consultas || 1;

  rankingList.innerHTML = "";

  orderedDoctors.slice(0, 8).forEach((doctor, index) => {
    const width = Math.max((doctor.consultas / biggestValue) * 100, 8);

    const item = document.createElement("div");
    item.className = "rank-item";

    item.innerHTML = `
      <span>${index + 1}</span>
      <p>${doctor.nome}</p>
      <div class="rank-bar"><b data-width="${width.toFixed(0)}"></b></div>
      <strong>${doctor.consultas}</strong>
    `;

    rankingList.appendChild(item);
  });

  animateRankingBars();
}

// ATUALIZA GRÁFICO DE BARRAS: mostra arrecadação por mês.
function renderRevenueChart() {
  const chart = $("revenueChart") || document.querySelector(".bar-chart");

  if (!chart) return;

  const doctorName = getSelectedDoctor();
  const especialidade = getSelectedSpecialty();

  let data = doctors.filter((doctor) => {
    const byDoctor = doctorName === "todos" || doctor.nome === doctorName;
    const bySpecialty = especialidade === "todas" || doctor.especialidade === especialidade;

    return byDoctor && bySpecialty;
  });

  const grouped = {};

  data.forEach((doctor) => {
    const periodo = doctor.periodo || "Maio de 2026";

    if (!grouped[periodo]) {
      grouped[periodo] = 0;
    }

    grouped[periodo] += Number(doctor.valor || 0);
  });

  const months = Object.entries(grouped)
    .map(([periodo, valor]) => ({ periodo, valor }))
    .sort((a, b) => monthOrder.indexOf(a.periodo) - monthOrder.indexOf(b.periodo));

  if (!months.length) {
    chart.innerHTML = `<p class="empty-state">Nenhum valor encontrado para este filtro.</p>`;
    return;
  }

  const max = Math.max(...months.map((item) => item.valor), 1);
  const currentPeriodo = getSelectedPeriodo();

  chart.innerHTML = months.map((item) => {
    const height = Math.max(8, (item.valor / max) * 90);
    const monthName = item.periodo.split(" de ")[0].slice(0, 3);
    const active = currentPeriodo === item.periodo ? "active" : "";

    return `
      <div class="bar-col ${active}">
        <strong>${formatMoneySmall(item.valor)}</strong>
        <b data-height="${height.toFixed(0)}"></b>
        <span>${monthName}</span>
      </div>
    `;
  }).join("");

  animateBarChart();
}

// ATUALIZA DONUT: mostra presenças e faltas.
function renderDonutInfo(totals = getTotals()) {
  const donutTotal = document.querySelector(".donut-chart strong");
  const legendItems = document.querySelectorAll(".legend p strong");

  if (donutTotal) {
    donutTotal.textContent = totals.consultas.toLocaleString("pt-BR");
  }

  if (legendItems.length >= 2) {
    legendItems[0].textContent = totals.presencas.toLocaleString("pt-BR");
    legendItems[1].textContent = totals.faltas.toLocaleString("pt-BR");
  }

  animateDonutChart(totals);
}

// ATUALIZA GRÁFICO DE PIZZA: mostra a distribuição por especialidade.
function renderPieChart(data = doctors) {
  const pie = document.querySelector(".pie-chart");
  const legend = document.querySelector(".pie-legend");

  if (!pie || !legend) return;

  if (!data.length) {
    pie.style.background = "#edf4f7";
    legend.innerHTML = `<p>Nenhuma especialidade encontrada</p>`;
    return;
  }

  const total = data.length;

  const specialties = data.reduce((acc, doctor) => {
    acc[doctor.especialidade] = (acc[doctor.especialidade] || 0) + 1;
    return acc;
  }, {});

  const colors = [
    "#079aa5",
    "#69cdd8",
    "#b9e9ef",
    "#d9f0f4",
    "#aebfc8",
    "#f63129",
    "#8ddce5"
  ];

  let start = 0;
  const gradientParts = [];
  let legendHtml = "";

  Object.entries(specialties).forEach(([specialty, quantity], index) => {
    const percentage = Math.round((quantity / total) * 100);
    const degrees = Math.round((quantity / total) * 360);
    const end = start + degrees;
    const color = colors[index % colors.length];

    gradientParts.push(`${color} ${start}deg ${end}deg`);

    legendHtml += `
      <p>
        <i style="background:${color}"></i>
        ${specialty}
        <strong>${percentage}%</strong>
      </p>
    `;

    start = end;
  });

  pie.style.background = `conic-gradient(${gradientParts.join(", ")})`;
  legend.innerHTML = legendHtml;
}

// ATUALIZA INSIGHTS: mostra taxa de ocupação, ticket médio e índice de faltas.
function renderInsights(totals = getTotals()) {
  const insightStrong = document.querySelectorAll(".insight-item strong");

  if (insightStrong.length >= 3) {
    insightStrong[0].textContent = `${totals.taxaOcupacao}%`;
    insightStrong[1].textContent = totals.ticketMedio.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    insightStrong[2].textContent = `${totals.indiceFaltas}%`;
  }
}

// LISTA MÉDICOS SALVOS: cria os cards dos médicos cadastrados no painel.
function renderSavedDoctors() {
  const list = $("savedDoctorsList");

  if (!list) return;

  if (!doctors.length) {
    list.innerHTML = `
      <div class="empty-doctors">
        Nenhum médico cadastrado ainda. Adicione o primeiro médico.
      </div>
    `;
    return;
  }

  list.innerHTML = "";

  doctors.forEach((doctor) => {
    const card = document.createElement("article");
    card.className = "saved-doctor-card";

    card.innerHTML = `
      <div class="saved-doctor-top">
        <h4>${doctor.nome}</h4>
        <span>${doctor.especialidade}</span>
      </div>

      <div class="saved-doctor-metrics">
        <div>
          <small>Mês</small>
          <strong>${doctor.periodo || "Maio de 2026"}</strong>
        </div>

        <div>
          <small>Consultas</small>
          <strong>${Number(doctor.consultas || 0).toLocaleString("pt-BR")}</strong>
        </div>

        <div>
          <small>Valor</small>
          <strong>${formatMoney(doctor.valor || 0)}</strong>
        </div>

        <div>
          <small>Faltas</small>
          <strong>${Number(doctor.faltas || 0).toLocaleString("pt-BR")}</strong>
        </div>
      </div>

      <div class="doctor-card-actions">
        <button class="delete-doctor-btn" type="button" data-id="${doctor.id}">
          <i class="fa-solid fa-trash"></i>
          Remover
        </button>
      </div>
    `;

    list.appendChild(card);
  });

  document.querySelectorAll(".delete-doctor-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;

      doctors = doctors.filter((doctor) => doctor.id !== id);
      saveDoctors();

      renderAll();
      animateNumbers();
      pulseCards();
    });
  });
}

// FORMULÁRIO DE CADASTRO: captura o envio do formulário para adicionar médico.
const doctorForm = $("doctorForm");

if (doctorForm) {
  doctorForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const nome = $("doctorName").value.trim();
    const especialidade = $("doctorSpecialty").value;
    const campoMes = $("doctorPeriod") || $("doctorMonth");
    const periodo = normalizePeriodo(campoMes ? campoMes.value : "Maio de 2026");
    const consultas = Number($("doctorConsultas").value);
    const valor = Number($("doctorValor").value);
    const faltas = Number($("doctorFaltas").value);

    if (!nome || !especialidade || !periodo) {
      alert("Preencha nome, especialidade e mês do médico.");
      return;
    }

    if (consultas < 0 || valor < 0 || faltas < 0) {
      alert("Os valores não podem ser negativos.");
      return;
    }

    const newDoctor = {
      id: createSafeId("doctor"),
      nome,
      especialidade,
      periodo,
      consultas,
      valor,
      faltas
    };

    doctors.push(newDoctor);
    saveDoctors();

    doctorForm.reset();

    if (campoMes) {
      campoMes.value = periodo;
    }

    renderFilterOptions();

    const periodoSelect = $("periodoSelect");
    if (periodoSelect) {
      periodoSelect.value = periodo;
    }

    renderDashboard();
    renderSavedDoctors();
    animateNumbers();
    pulseCards();
    closePanel();
  });
}

// BOTÃO LIMPAR DADOS: apaga todos os médicos salvos.
const clearDoctorsBtn = $("clearDoctorsBtn");

if (clearDoctorsBtn) {
  clearDoctorsBtn.addEventListener("click", () => {
    const confirmClear = confirm("Tem certeza que deseja apagar todos os médicos salvos?");

    if (!confirmClear) return;

    doctors = [];
    saveDoctors();

    renderAll();
    animateNumbers();
    pulseCards();
  });
}

const doctorSelect = $("doctorSelect");

if (doctorSelect) {
  doctorSelect.addEventListener("change", () => {
    renderDashboard();
    animateNumbers();
    pulseCards();
  });
}

const specialtySelect = $("specialtySelect");

if (specialtySelect) {
  specialtySelect.addEventListener("change", () => {
    renderDashboard();
    animateNumbers();
    pulseCards();
  });
}

const periodoSelect = $("periodoSelect") || $("periodSelect") || $("monthSelect");

if (periodoSelect) {
  periodoSelect.addEventListener("change", () => {
    renderDashboard();
    animateNumbers();
    pulseCards();
  });
}

const openDoctorPanel = $("openDoctorPanel");
const closeDoctorPanel = $("closeDoctorPanel");
const doctorSidePanel = $("doctorSidePanel");
const doctorPanelOverlay = $("doctorPanelOverlay");

// ABRE PAINEL: mostra o modal de cadastro.
function openPanel() {
  if (!doctorSidePanel || !doctorPanelOverlay) return;

  doctorSidePanel.classList.add("active");
  doctorPanelOverlay.classList.add("active");
  document.body.classList.add("panel-open");
}

// FECHA PAINEL: esconde o modal de cadastro.
function closePanel() {
  if (!doctorSidePanel || !doctorPanelOverlay) return;

  doctorSidePanel.classList.remove("active");
  doctorPanelOverlay.classList.remove("active");
  document.body.classList.remove("panel-open");
}

if (openDoctorPanel) {
  openDoctorPanel.addEventListener("click", openPanel);
}

if (closeDoctorPanel) {
  closeDoctorPanel.addEventListener("click", closePanel);
}

if (doctorPanelOverlay) {
  doctorPanelOverlay.addEventListener("click", closePanel);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePanel();
  }
});

// ANIMA NÚMEROS: faz os valores subirem do zero até o total.
function animateNumbers() {
  const numbers = document.querySelectorAll("[data-value]");

  numbers.forEach((number) => {
    const finalValue = Number(number.dataset.value);
    const isMoney = number.dataset.money === "true";
    const duration = 900;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(finalValue * eased);

      if (isMoney) {
        number.textContent = currentValue.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          maximumFractionDigits: 0
        });
      } else {
        number.textContent = currentValue.toLocaleString("pt-BR");
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  });
}

// ANIMA BARRAS DO RANKING: preenche as barras conforme o número de consultas.
function animateRankingBars() {
  const bars = document.querySelectorAll(".rank-bar b");

  bars.forEach((bar, index) => {
    bar.style.width = "0%";

    setTimeout(() => {
      bar.style.width = `${bar.dataset.width}%`;
    }, index * 120);
  });
}

// ANIMA GRÁFICO DE BARRAS: faz as colunas crescerem.
function animateBarChart() {
  const bars = document.querySelectorAll(".bar-col b");

  bars.forEach((bar, index) => {
    bar.style.height = "0%";

    setTimeout(() => {
      bar.style.height = `${bar.dataset.height}%`;
    }, index * 120);
  });
}

// ANIMA GRÁFICO DONUT: desenha presenças e faltas em círculo.
function animateDonutChart(totals = getTotals(getFilteredDoctors())) {
  const donut = document.querySelector(".donut-chart");

  if (!donut) return;

  const consultas = totals.consultas || 1;
  const presencas = totals.presencas || 0;
  const finalDegree = Math.round((presencas / consultas) * 360);

  let degree = 0;

  const interval = setInterval(() => {
    degree += 10;

    donut.style.background = `
      conic-gradient(
        #58ADBE 0deg ${Math.min(degree, finalDegree)}deg,
        #f63129 ${Math.min(degree, finalDegree)}deg 360deg
      )
    `;

    if (degree >= finalDegree) {
      clearInterval(interval);
    }
  }, 12);
}

// EFEITO DE PULSO: destaca os cards quando os dados mudam.
function pulseCards() {
  document.querySelectorAll(".kpi-card").forEach((card) => {
    card.classList.remove("card-pulse");

    setTimeout(() => {
      card.classList.add("card-pulse");
    }, 20);
  });
}

const style = document.createElement("style");

style.innerHTML = `
  .card-pulse {
    animation: cardPulse 0.45s ease;
  }

  @keyframes cardPulse {
    0% {
      transform: scale(0.97);
      opacity: 0.75;
    }

    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

document.head.appendChild(style);

/* =====================================
   PERFIL DO COLABORADOR: FOTO + CAPA + NOTIFICAÇÕES
   Versão limpa: sem IDs duplicados, capa com <img> real e fallback em background.
===================================== */

(() => {
  const PROFILE_KEY = "lag_collaborator_profile_clean_v1";

  const defaultProfile = {
    name: "Colaborador",
    role: "Administrativo",
    unit: "AmorSaúde Cerquilho",
    email: "",
    photo: "",
    cover: ""
  };

  let profile = loadProfile();
  let notificationFilter = "todas";

  let notifications = [
    {
      id: 1,
      title: "Novo relatório disponível",
      text: "O resumo do dashboard foi atualizado com os dados mais recentes.",
      time: "Agora",
      icon: "fa-chart-line",
      unread: true
    },
    {
      id: 2,
      title: "Cadastro de médicos",
      text: "Você pode adicionar novos médicos pelo painel lateral.",
      time: "Hoje",
      icon: "fa-user-doctor",
      unread: true
    },
    {
      id: 3,
      title: "Atenção nas faltas",
      text: "O sistema identificou registros de faltas no período selecionado.",
      time: "Ontem",
      icon: "fa-calendar-xmark",
      unread: true
    }
  ];

  const notificationToggle = document.getElementById("notificationToggle");
  const notificationPanel = document.getElementById("notificationPanel");
  const notificationList = document.getElementById("notificationList");
  const notificationCount = document.getElementById("notificationCount");
  const markAllRead = document.getElementById("markAllRead");

  const profileToggle = document.getElementById("profileToggle");
  const profileCard = document.getElementById("profileCard");

  const profileCoverPreview = document.getElementById("profileCoverPreview");
  const profileCoverImg = document.getElementById("profileCoverImg");
  const profileCoverInput = document.getElementById("profileCoverInput");
  const changeCoverBtn = document.getElementById("changeCoverBtn");

  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const changePhotoBtn = document.getElementById("changePhotoBtn");
  const profilePhotoClickArea = document.getElementById("profilePhotoClickArea");
  const profileAvatarImg = document.getElementById("profileAvatarImg");
  const profileAvatarInitials = document.getElementById("profileAvatarInitials");

  const topProfilePhoto = document.getElementById("topProfilePhoto");
  const topProfileInitials = document.getElementById("topProfileInitials");
  const topProfileName = document.getElementById("topProfileName");
  const topProfileRole = document.getElementById("topProfileRole");

  const profileDisplayName = document.getElementById("profileDisplayName");
  const profileDisplayRole = document.getElementById("profileDisplayRole");
  const profileEditForm = document.getElementById("profileEditForm");
  const profileNameInput = document.getElementById("profileNameInput");
  const profileRoleInput = document.getElementById("profileRoleInput");
  const profileUnitInput = document.getElementById("profileUnitInput");
  const profileEmailInput = document.getElementById("profileEmailInput");
  const removeProfilePhoto = document.getElementById("removeProfilePhoto");

  function loadProfile() {
    const savedProfile = localStorage.getItem(PROFILE_KEY);

    if (!savedProfile) {
      return { ...defaultProfile };
    }

    try {
      return {
        ...defaultProfile,
        ...JSON.parse(savedProfile)
      };
    } catch {
      return { ...defaultProfile };
    }
  }

  function saveProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      return true;
    } catch {
      alert("A imagem ficou pesada para salvar no navegador. Escolha uma imagem menor.");
      return false;
    }
  }

  function getInitials(name) {
    const parts = String(name || "Colaborador")
      .trim()
      .split(" ")
      .filter(Boolean);

    if (!parts.length) return "CL";

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function compressImage(file, options, callback) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Escolha uma imagem válida em JPG, PNG ou WEBP.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxWidth = options.maxWidth;
        const maxHeight = options.maxHeight;
        const quality = options.quality;

        let width = img.width;
        let height = img.height;
        const scale = Math.min(maxWidth / width, maxHeight / height, 1);

        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        callback(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = () => {
        alert("Não consegui carregar essa imagem. Tente outra.");
      };

      img.src = reader.result;
    };

    reader.onerror = () => {
      alert("Não consegui ler essa imagem.");
    };

    reader.readAsDataURL(file);
  }

  function renderProfile() {
    const initials = getInitials(profile.name);

    if (profileDisplayName) profileDisplayName.textContent = profile.name;
    if (profileDisplayRole) profileDisplayRole.textContent = profile.role;
    if (topProfileName) topProfileName.textContent = profile.name;
    if (topProfileRole) topProfileRole.textContent = profile.role;

    if (profileNameInput) profileNameInput.value = profile.name;
    if (profileRoleInput) profileRoleInput.value = profile.role;
    if (profileUnitInput) profileUnitInput.value = profile.unit;
    if (profileEmailInput) profileEmailInput.value = profile.email;

    if (profile.photo) {
      if (profileAvatarImg) {
        profileAvatarImg.src = profile.photo;
        profileAvatarImg.style.display = "block";
      }

      if (profileAvatarInitials) {
        profileAvatarInitials.style.display = "none";
      }

      if (topProfilePhoto) {
        topProfilePhoto.src = profile.photo;
        topProfilePhoto.style.display = "block";
      }

      if (topProfileInitials) {
        topProfileInitials.style.display = "none";
      }
    } else {
      if (profileAvatarImg) {
        profileAvatarImg.removeAttribute("src");
        profileAvatarImg.style.display = "none";
      }

      if (profileAvatarInitials) {
        profileAvatarInitials.textContent = initials;
        profileAvatarInitials.style.display = "grid";
      }

      if (topProfilePhoto) {
        topProfilePhoto.removeAttribute("src");
        topProfilePhoto.style.display = "none";
      }

      if (topProfileInitials) {
        topProfileInitials.textContent = initials;
        topProfileInitials.style.display = "grid";
      }
    }

    if (profile.cover) {
      if (profileCoverImg) {
        profileCoverImg.src = profile.cover;
        profileCoverImg.style.display = "block";
      }

      if (profileCoverPreview) {
        profileCoverPreview.classList.add("has-cover-image");
        profileCoverPreview.style.backgroundImage = "none";
      }
    } else {
      if (profileCoverImg) {
        profileCoverImg.removeAttribute("src");
        profileCoverImg.style.display = "none";
      }

      if (profileCoverPreview) {
        profileCoverPreview.classList.remove("has-cover-image");
        profileCoverPreview.style.backgroundImage = `
          radial-gradient(circle at 78% 24%, rgba(255,255,255,0.55), transparent 22%),
          radial-gradient(circle at 20% 10%, rgba(255,255,255,0.30), transparent 30%),
          linear-gradient(135deg, #026cf7, #0aa7b3)
        `;
      }
    }
  }

  function renderNotifications() {
    if (!notificationList || !notificationCount) return;

    const unreadTotal = notifications.filter((item) => item.unread).length;
    notificationCount.textContent = unreadTotal;
    notificationCount.style.display = unreadTotal > 0 ? "grid" : "none";

    const filteredNotifications = notificationFilter === "nao-lidas"
      ? notifications.filter((item) => item.unread)
      : notifications;

    if (!filteredNotifications.length) {
      notificationList.innerHTML = `
        <div class="empty-notification">
          Nenhuma notificação encontrada.
        </div>
      `;
      return;
    }

    notificationList.innerHTML = filteredNotifications.map((item) => `
      <article class="notification-item ${item.unread ? "unread" : ""}" data-id="${item.id}">
        <div class="notification-icon">
          <i class="fa-solid ${item.icon}"></i>
        </div>

        <div class="notification-content">
          <h4>${item.title}</h4>
          <p>${item.text}</p>
          <small>${item.time}</small>
        </div>
      </article>
    `).join("");

    notificationList.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = Number(item.dataset.id);

        notifications = notifications.map((notification) => {
          if (notification.id === id) {
            return {
              ...notification,
              unread: false
            };
          }

          return notification;
        });

        renderNotifications();
      });
    });
  }

  function addNotification(title, text, icon = "fa-bell") {
    notifications.unshift({
      id: Date.now(),
      title,
      text,
      time: "Agora",
      icon,
      unread: true
    });

    renderNotifications();
  }

  window.addNotification = addNotification;

  function closeHeaderPanels() {
    if (notificationPanel) {
      notificationPanel.classList.remove("active");
      notificationPanel.setAttribute("aria-hidden", "true");
    }

    if (profileCard) {
      profileCard.classList.remove("active");
      profileCard.setAttribute("aria-hidden", "true");
    }
  }

  function openOnlyPanel(panel) {
    const isActive = panel.classList.contains("active");
    closeHeaderPanels();

    if (!isActive) {
      panel.classList.add("active");
      panel.setAttribute("aria-hidden", "false");
    }
  }

  if (notificationToggle && notificationPanel) {
    notificationToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      openOnlyPanel(notificationPanel);
    });
  }

  if (profileToggle && profileCard) {
    profileToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      openOnlyPanel(profileCard);
    });
  }

  if (changeCoverBtn && profileCoverInput) {
    changeCoverBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      profileCoverInput.click();
    });
  }

  if (profileCoverPreview && profileCoverInput) {
    profileCoverPreview.addEventListener("click", (event) => {
      if (event.target.closest("#changeCoverBtn")) return;
      profileCoverInput.click();
    });
  }

  if (profileCoverInput) {
    profileCoverInput.addEventListener("change", () => {
      const file = profileCoverInput.files?.[0];

      compressImage(
        file,
        {
          maxWidth: 900,
          maxHeight: 320,
          quality: 0.68
        },
        (base64) => {
          profile.cover = base64;

          if (saveProfile()) {
            renderProfile();
            addNotification("Capa atualizada", "A capa do perfil foi alterada.", "fa-image");
          }
        }
      );

      profileCoverInput.value = "";
    });
  }

  function openPhotoPicker() {
    if (profilePhotoInput) {
      profilePhotoInput.click();
    }
  }

  if (changePhotoBtn) {
    changePhotoBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPhotoPicker();
    });
  }

  if (profilePhotoClickArea) {
    profilePhotoClickArea.addEventListener("click", openPhotoPicker);

    profilePhotoClickArea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPhotoPicker();
      }
    });
  }

  if (profilePhotoInput) {
    profilePhotoInput.addEventListener("change", () => {
      const file = profilePhotoInput.files?.[0];

      compressImage(
        file,
        {
          maxWidth: 420,
          maxHeight: 420,
          quality: 0.78
        },
        (base64) => {
          profile.photo = base64;

          if (saveProfile()) {
            renderProfile();
            addNotification("Foto atualizada", "A foto do perfil foi alterada.", "fa-camera");
          }
        }
      );

      profilePhotoInput.value = "";
    });
  }

  if (removeProfilePhoto) {
    removeProfilePhoto.addEventListener("click", () => {
      profile.photo = "";
      profile.cover = "";

      if (saveProfile()) {
        renderProfile();
        addNotification("Imagens removidas", "A foto e a capa foram removidas.", "fa-image-slash");
      }
    });
  }

  if (profileEditForm) {
    profileEditForm.addEventListener("submit", (event) => {
      event.preventDefault();

      profile.name = profileNameInput?.value.trim() || defaultProfile.name;
      profile.role = profileRoleInput?.value.trim() || defaultProfile.role;
      profile.unit = profileUnitInput?.value.trim() || defaultProfile.unit;
      profile.email = profileEmailInput?.value.trim() || "";

      if (saveProfile()) {
        renderProfile();
        addNotification("Perfil atualizado", "Os dados do colaborador foram salvos.", "fa-id-card");
        alert("Perfil atualizado com sucesso!");
      }
    });
  }

  document.querySelectorAll(".notification-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".notification-tabs button").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");
      notificationFilter = button.dataset.filter || "todas";
      renderNotifications();
    });
  });

  if (markAllRead) {
    markAllRead.addEventListener("click", () => {
      notifications = notifications.map((notification) => ({
        ...notification,
        unread: false
      }));

      renderNotifications();
    });
  }

  document.addEventListener("click", (event) => {
    const clickedInsideNotification = event.target.closest(".notify-wrap");
    const clickedInsideProfile = event.target.closest(".profile-wrap");

    if (!clickedInsideNotification && !clickedInsideProfile) {
      closeHeaderPanels();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHeaderPanels();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    renderProfile();
    renderNotifications();
  });

  renderProfile();
  renderNotifications();
})();
/* =====================================
   NOTIFICAÇÕES DO PAINEL
===================================== */

(() => {
  const notificationToggle = document.getElementById("notificationToggle");
  const notificationPanel = document.getElementById("notificationPanel");
  const notificationList = document.getElementById("notificationList");
  const notificationCount = document.getElementById("notificationCount");
  const markAllRead = document.getElementById("markAllRead");

  if (!notificationToggle || !notificationPanel || !notificationList) {
    console.warn("Notificação não encontrada no HTML.");
    return;
  }

  let notificationFilter = "todas";

  let notifications = [
    {
      id: createNotificationId(),
      title: "Novo relatório disponível",
      text: "O resumo do dashboard foi atualizado com os dados mais recentes.",
      time: "Agora",
      icon: "fa-chart-line",
      unread: true
    },
    {
      id: createNotificationId(),
      title: "Cadastro de médicos",
      text: "Você pode adicionar novos médicos pelo painel lateral.",
      time: "Hoje",
      icon: "fa-user-doctor",
      unread: true
    },
    {
      id: createNotificationId(),
      title: "Atenção nas faltas",
      text: "O sistema identificou registros de faltas no período selecionado.",
      time: "Ontem",
      icon: "fa-calendar-xmark",
      unread: true
    }
  ];

  function createNotificationId() {
    return `notification-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function renderNotifications() {
    const visibleNotifications = notificationFilter === "nao-lidas"
      ? notifications.filter((notification) => notification.unread)
      : notifications;

    if (!visibleNotifications.length) {
      notificationList.innerHTML = `
        <div class="empty-notifications">
          Nenhuma notificação encontrada.
        </div>
      `;
    } else {
      notificationList.innerHTML = visibleNotifications.map((notification) => {
        return `
          <article class="notification-item ${notification.unread ? "unread" : ""}" data-notification-id="${notification.id}">
            <div class="notification-icon">
              <i class="fa-solid ${notification.icon}"></i>
            </div>

            <div class="notification-content">
              <h4>${notification.title}</h4>
              <p>${notification.text}</p>
              <span class="notification-time">${notification.time}</span>
            </div>
          </article>
        `;
      }).join("");
    }

    const unreadTotal = notifications.filter((notification) => notification.unread).length;

    if (notificationCount) {
      notificationCount.textContent = unreadTotal;

      notificationCount.style.display = unreadTotal > 0 ? "grid" : "none";
    }

    document.querySelectorAll(".notification-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = item.dataset.notificationId;

        notifications = notifications.map((notification) => {
          if (String(notification.id) === String(id)) {
            return {
              ...notification,
              unread: false
            };
          }

          return notification;
        });

        renderNotifications();
      });
    });
  }

  function openNotificationPanel() {
    notificationPanel.classList.add("active");
    notificationPanel.setAttribute("aria-hidden", "false");
  }

  function closeNotificationPanel() {
    notificationPanel.classList.remove("active");
    notificationPanel.setAttribute("aria-hidden", "true");
  }

  function toggleNotificationPanel(event) {
    event.preventDefault();
    event.stopPropagation();

    const isOpen = notificationPanel.classList.contains("active");

    if (isOpen) {
      closeNotificationPanel();
    } else {
      openNotificationPanel();
    }
  }

  notificationToggle.addEventListener("click", toggleNotificationPanel);

  notificationPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    closeNotificationPanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNotificationPanel();
    }
  });

  document.querySelectorAll("[data-notification-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-notification-filter]").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      notificationFilter = button.dataset.notificationFilter || "todas";

      renderNotifications();
    });
  });

  if (markAllRead) {
    markAllRead.addEventListener("click", () => {
      notifications = notifications.map((notification) => {
        return {
          ...notification,
          unread: false
        };
      });

      renderNotifications();
    });
  }

  window.addNotification = function addNotification(title, text, icon = "fa-bell") {
    notifications.unshift({
      id: createNotificationId(),
      title,
      text,
      time: "Agora",
      icon,
      unread: true
    });

    renderNotifications();
  };

  renderNotifications();
})();
/* =====================================
   NOTÍCIAS DA CLÍNICA
   Abre pelo botão "Notícias" do menu superior
===================================== */

(() => {
  const NEWS_KEY = "lag_clinic_news_v2";

  const newsButton = document.getElementById("clinicNewsTopButton") || findNewsMenuButton();
  const overlay = document.getElementById("clinicNewsOverlay");
  const drawer = document.getElementById("clinicNewsDrawer");
  const closeButton = document.getElementById("clinicNewsClose");

  const openFormButton = document.getElementById("clinicNewsOpenForm");
  const newsForm = document.getElementById("clinicNewsForm");
  const cancelFormButton = document.getElementById("clinicNewsCancelForm");

  const newsList = document.getElementById("clinicNewsList");

  const newsTitle = document.getElementById("clinicNewsTitle");
  const newsCategory = document.getElementById("clinicNewsCategory");
  const newsDate = document.getElementById("clinicNewsDate");
  const newsPinned = document.getElementById("clinicNewsPinned");
  const newsDescription = document.getElementById("clinicNewsDescription");

  if (!newsButton || !overlay || !drawer || !newsList) {
    console.warn("Painel de notícias não encontrado no HTML.");
    return;
  }

  let currentNewsFilter = "todas";

  let clinicNews = loadNews();

  function createId() {
    return `news-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function findNewsMenuButton() {
    return [...document.querySelectorAll(".nav-menu a")].find((link) => {
      const text = link.textContent.trim().toLowerCase();

      return text === "notícias" || text === "noticias";
    });
  }

  function getDefaultNews() {
    return [
      {
        id: createId(),
        title: "Comunicado interno da clínica",
        category: "Aviso",
        date: getToday(),
        description: "Acompanhe aqui os principais avisos da clínica, comunicados internos e atualizações importantes para os colaboradores.",
        pinned: true
      },
      {
        id: createId(),
        title: "Treinamento de atendimento humanizado",
        category: "Treinamento",
        date: getToday(),
        description: "A equipe terá um treinamento voltado para melhoria do atendimento, acolhimento dos pacientes e uso correto do painel.",
        pinned: false
      },
      {
        id: createId(),
        title: "Ação de saúde preventiva",
        category: "Saúde",
        date: getToday(),
        description: "A unidade prepara uma ação especial para orientar pacientes sobre prevenção, exames e cuidados de rotina.",
        pinned: false
      }
    ];
  }

  function loadNews() {
    const saved = localStorage.getItem(NEWS_KEY);

    if (!saved) {
      const defaultNews = getDefaultNews();

      localStorage.setItem(NEWS_KEY, JSON.stringify(defaultNews));

      return defaultNews;
    }

    try {
      return JSON.parse(saved);
    } catch {
      const defaultNews = getDefaultNews();

      localStorage.setItem(NEWS_KEY, JSON.stringify(defaultNews));

      return defaultNews;
    }
  }

  function saveNews() {
    localStorage.setItem(NEWS_KEY, JSON.stringify(clinicNews));
  }

  function getToday() {
    return new Date().toISOString().split("T")[0];
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Sem data";

    const date = new Date(`${dateValue}T00:00:00`);

    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  function getCategoryIcon(category) {
    const icons = {
      Aviso: "fa-bullhorn",
      Evento: "fa-calendar-check",
      Treinamento: "fa-graduation-cap",
      Saúde: "fa-heart-pulse"
    };

    return icons[category] || "fa-newspaper";
  }

  function renderNews() {
    const filteredNews = currentNewsFilter === "todas"
      ? clinicNews
      : clinicNews.filter((news) => news.category === currentNewsFilter);

    const orderedNews = [...filteredNews].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    if (!orderedNews.length) {
      newsList.innerHTML = `
        <div class="clinic-news-empty">
          Nenhuma notícia encontrada nesta categoria.
        </div>
      `;

      return;
    }

    newsList.innerHTML = orderedNews.map((news) => {
      return `
        <article class="clinic-news-card ${news.pinned ? "pinned" : ""}">
          <span class="clinic-news-category">
            <i class="fa-solid ${getCategoryIcon(news.category)}"></i>
            ${news.category}
          </span>

          <h3>${news.title}</h3>

          <p>${news.description}</p>

          <div class="clinic-news-footer">
            <span class="clinic-news-date">
              <i class="fa-regular fa-calendar"></i>
              ${formatDate(news.date)}
            </span>

            <button class="clinic-news-delete" type="button" data-news-id="${news.id}" aria-label="Remover notícia">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </article>
      `;
    }).join("");

    newsList.querySelectorAll(".clinic-news-delete").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.newsId;

        const confirmDelete = confirm("Deseja remover esta notícia?");

        if (!confirmDelete) return;

        clinicNews = clinicNews.filter((news) => String(news.id) !== String(id));

        saveNews();
        renderNews();
      });
    });
  }

  function openNewsDrawer() {
    overlay.classList.add("active");
    drawer.classList.add("active");

    drawer.setAttribute("aria-hidden", "false");

    newsButton.classList.add("clinic-news-menu-active");

    renderNews();
  }

  function closeNewsDrawer() {
    overlay.classList.remove("active");
    drawer.classList.remove("active");

    drawer.setAttribute("aria-hidden", "true");

    newsButton.classList.remove("clinic-news-menu-active");
  }

  function openNewsForm() {
    newsForm.classList.add("active");

    if (newsDate && !newsDate.value) {
      newsDate.value = getToday();
    }

    if (newsTitle) {
      newsTitle.focus();
    }
  }

  function closeNewsForm() {
    newsForm.classList.remove("active");
    newsForm.reset();

    if (newsDate) {
      newsDate.value = getToday();
    }
  }

  newsButton.setAttribute("href", "#");

  newsButton.addEventListener("click", (event) => {
    event.preventDefault();

    openNewsDrawer();
  });

  overlay.addEventListener("click", closeNewsDrawer);

  if (closeButton) {
    closeButton.addEventListener("click", closeNewsDrawer);
  }

  if (openFormButton && newsForm) {
    openFormButton.addEventListener("click", () => {
      const isOpen = newsForm.classList.contains("active");

      if (isOpen) {
        closeNewsForm();
      } else {
        openNewsForm();
      }
    });
  }

  if (cancelFormButton) {
    cancelFormButton.addEventListener("click", closeNewsForm);
  }

  document.querySelectorAll("[data-clinic-news-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-clinic-news-filter]").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      currentNewsFilter = button.dataset.clinicNewsFilter || "todas";

      renderNews();
    });
  });

  if (newsForm) {
    newsForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const title = newsTitle.value.trim();
      const category = newsCategory.value || "Aviso";
      const date = newsDate.value || getToday();
      const pinned = newsPinned.value === "true";
      const description = newsDescription.value.trim();

      if (!title || !description) {
        alert("Preencha o título e a descrição da notícia.");
        return;
      }

      clinicNews.unshift({
        id: createId(),
        title,
        category,
        date,
        description,
        pinned
      });

      saveNews();
      renderNews();
      closeNewsForm();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNewsDrawer();
    }
  });

  if (newsDate) {
    newsDate.value = getToday();
  }

  renderNews();
})();
