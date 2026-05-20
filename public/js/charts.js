/**
 * Tuition Center Management System — Charts Controller
 * Handles dynamic Chart.js graphing on the Dashboard.
 */

let revenueChartInstance = null;
let attendanceChartInstance = null;

/**
 * Initializes and populates dashboard charts from raw DB metrics.
 * @param {Object} data - Chart datasets from `/api/dashboard/charts`
 */
function renderDashboardCharts(data) {
  const { feeCollection, attendanceDistribution } = data;

  // 1. RENDER MONTHLY REVENUE BAR CHART
  const revenueCtx = document.getElementById('revenueChart').getContext('2d');

  // Format labels & values from SQL output
  const months = feeCollection.map(row => row.month);
  const collections = feeCollection.map(row => parseFloat(row.total_collected));

  // Handle empty state gracefully
  if (months.length === 0) {
    months.push('No Paid Collections Yet');
    collections.push(0);
  }

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  revenueChartInstance = new Chart(revenueCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Monthly Fees Collected ($)',
        data: collections,
        backgroundColor: '#4f46e5', // Indigo Accent
        hoverBackgroundColor: '#4338ca',
        borderRadius: 6,
        barThickness: 32,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { family: 'Inter', size: 12, weight: 'bold' },
          bodyFont: { family: 'Inter', size: 12 },
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: function (context) {
              return ` Collection: $${context.parsed.y.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11, weight: '500' }, color: '#64748b' }
        },
        y: {
          grid: { color: '#f1f5f9' },
          border: { dash: [4, 4] },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: '#64748b',
            callback: function (value) { return '$' + value; }
          }
        }
      }
    }
  });

  // 2. RENDER ATTENDANCE OVERVIEW DONUT CHART
  const attendanceCtx = document.getElementById('attendanceChart').getContext('2d');

  // Initialize standard breakdown
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;

  // Extract from query logs
  attendanceDistribution.forEach(row => {
    if (row.status === 'Present') presentCount = row.count;
    else if (row.status === 'Absent') absentCount = row.count;
    else if (row.status === 'Late') lateCount = row.count;
  });

  // Handle empty state gracefully
  const hasAttendanceData = presentCount > 0 || absentCount > 0 || lateCount > 0;
  const chartLabels = ['Present', 'Absent', 'Late'];
  const chartData = hasAttendanceData ? [presentCount, absentCount, lateCount] : [1, 0, 0]; // Default mock present
  const chartColors = hasAttendanceData ? ['#0d9488', '#e11d48', '#ea580c'] : ['#e2e8f0', '#e2e8f0', '#e2e8f0'];

  if (attendanceChartInstance) {
    attendanceChartInstance.destroy();
  }

  attendanceChartInstance = new Chart(attendanceCtx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartData,
        backgroundColor: chartColors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Inter', size: 11, weight: '500' },
            color: '#475569',
            boxWidth: 10,
            padding: 15
          }
        },
        tooltip: {
          enabled: hasAttendanceData,
          backgroundColor: '#0f172a',
          bodyFont: { family: 'Inter', size: 12 },
          padding: 10,
          cornerRadius: 6
        }
      }
    }
  });
}

let reportsRevenueChartInstance = null;
let reportsBatchChartInstance = null;

/**
 * Initializes and populates reports page charts from raw DB metrics.
 * @param {Object} data - Chart datasets from `/api/dashboard/charts`
 */
function renderReportsCharts(data) {
  const { feeCollection, batchDistribution } = data;

  // 1. RENDER MONTHLY REVENUE BAR CHART
  const revenueCtx = document.getElementById('reportsRevenueChart').getContext('2d');

  const months = feeCollection.map(row => row.month);
  const collections = feeCollection.map(row => parseFloat(row.total_collected));

  if (months.length === 0) {
    months.push('No Paid Collections Yet');
    collections.push(0);
  }

  if (reportsRevenueChartInstance) {
    reportsRevenueChartInstance.destroy();
  }

  reportsRevenueChartInstance = new Chart(revenueCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'Monthly Fees ($)',
        data: collections,
        backgroundColor: '#0d9488', // Teal accent color for Reports ledger
        hoverBackgroundColor: '#0f766e',
        borderRadius: 6,
        barThickness: 28,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          bodyFont: { family: 'Inter', size: 12 },
          cornerRadius: 6,
          callbacks: {
            label: function (context) { return ` Collections: $${context.parsed.y.toLocaleString()}`; }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' } },
        y: {
          grid: { color: '#f1f5f9' },
          border: { dash: [4, 4] },
          ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b', callback: function (value) { return '$' + value; } }
        }
      }
    }
  });

  // 2. RENDER BATCH-WISE STUDENT COUNT CHART (Horizontal Bar Chart)
  const batchCtx = document.getElementById('reportsBatchChart').getContext('2d');

  const batchLabels = batchDistribution.map(b => `${b.subject_name} (${b.timings})`);
  const batchCounts = batchDistribution.map(b => b.student_count);

  if (batchLabels.length === 0) {
    batchLabels.push('No Batches Configured');
    batchCounts.push(0);
  }

  if (reportsBatchChartInstance) {
    reportsBatchChartInstance.destroy();
  }

  reportsBatchChartInstance = new Chart(batchCtx, {
    type: 'bar',
    data: {
      labels: batchLabels,
      datasets: [{
        label: 'Students Enrolled',
        data: batchCounts,
        backgroundColor: '#4f46e5', // Indigo Accent
        hoverBackgroundColor: '#4338ca',
        borderRadius: 6,
        barThickness: 24,
      }]
    },
    options: {
      indexAxis: 'y', // Horizontal bars!
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          bodyFont: { family: 'Inter', size: 12 },
          cornerRadius: 6
        }
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b', stepSize: 1 }
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 10 }, color: '#64748b' }
        }
      }
    }
  });
}

