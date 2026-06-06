/* ════════════════════════════════════════
   REPORTS — Chart.js (dashboard + rapports)
   ════════════════════════════════════════ */

// Petit graphe de tendance dans le dashboard
function renderDashboardChart() {
  const ctx = document.getElementById('chart-dash-trend');
  if (!ctx) return;
  if (S.charts.dashTrend) { S.charts.dashTrend.destroy(); delete S.charts.dashTrend; }

  const { labels, values } = getAlertsByDay(7);
  S.charts.dashTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Alertes',
        data: values,
        borderColor: '#F0A030',
        backgroundColor: 'rgba(240,160,48,.1)',
        tension: .4, fill: true,
        pointRadius: 3, pointBackgroundColor: '#F0A030',
      }],
    },
    options: chartOpts(),
  });
}

// Page Rapports : 3 graphes
function initReportsCharts() {
  // KPI stat cards
  setEl('rpt-total-alerts',  S.allAlerts.length);
  setEl('rpt-pending',       S.allAlerts.filter(a => a.status === 'pending').length);
  setEl('rpt-critical-bat',  S.allDevices.filter(d => (d.niveau_batterie || 0) < CONFIG.batThreshold).length);
  setEl('rpt-active-herds',  S.allHerds.length);

  // Détruire anciens charts
  ['alertsTrend', 'alertTypes', 'battery'].forEach(k => {
    if (S.charts[k]) { S.charts[k].destroy(); delete S.charts[k]; }
  });

  // 1. Courbe 7 jours
  const ctxTrend = document.getElementById('chart-alerts-trend');
  if (ctxTrend) {
    const { labels, values } = getAlertsByDay(7);
    S.charts.alertsTrend = new Chart(ctxTrend, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Alertes',
          data: values,
          borderColor: '#F0A030',
          backgroundColor: 'rgba(240,160,48,.1)',
          tension: .4, fill: true,
          pointRadius: 4, pointBackgroundColor: '#F0A030',
        }],
      },
      options: chartOpts(),
    });
  }

  // 2. Donut types
  const ctxTypes = document.getElementById('chart-types');
  if (ctxTypes) {
    const counts = {};
    S.allAlerts.forEach(a => { counts[a.type_alerte] = (counts[a.type_alerte] || 0) + 1; });
    S.charts.alertTypes = new Chart(ctxTypes, {
      type: 'doughnut',
      data: {
        labels: Object.keys(counts),
        datasets: [{
          data: Object.values(counts),
          backgroundColor: ['#EF4444', '#F97316', '#3B82F6', '#EAB308', '#22C55E'],
          borderWidth: 0, hoverOffset: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#DCE8F5', font: { size: 11 }, boxWidth: 12 } },
        },
        cutout: '65%',
      },
    });
  }

  // 3. Barres batterie
  const ctxBat = document.getElementById('chart-battery');
  if (ctxBat) {
    const buckets = { '0–20 %': 0, '21–50 %': 0, '51–80 %': 0, '81–100 %': 0 };
    S.allDevices.forEach(d => {
      const b = d.niveau_batterie || 0;
      if (b <= 20)       buckets['0–20 %']++;
      else if (b <= 50)  buckets['21–50 %']++;
      else if (b <= 80)  buckets['51–80 %']++;
      else               buckets['81–100 %']++;
    });
    S.charts.battery = new Chart(ctxBat, {
      type: 'bar',
      data: {
        labels: Object.keys(buckets),
        datasets: [{
          label: 'Colliers',
          data: Object.values(buckets),
          backgroundColor: ['#EF4444', '#F97316', '#EAB308', '#22C55E'],
          borderRadius: 4, borderWidth: 0,
        }],
      },
      options: chartOpts(true),
    });
  }
}

// Options Chart.js communes
function chartOpts(bar = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,.05)', display: !bar },
        ticks: { color: '#6B84A8', font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,.05)' },
        ticks: { color: '#6B84A8', font: { size: 11 }, stepSize: 1 },
        beginAtZero: true,
      },
    },
  };
}

// Regroupe les alertes par jour (N derniers jours)
function getAlertsByDay(days) {
  const labels = [], values = [];
  for (let i = days - 1; i >= 0; i--) {
    const d   = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
    values.push(S.allAlerts.filter(a => a.created_at?.startsWith(key)).length);
  }
  return { labels, values };
}
