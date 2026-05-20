/**
 * Tuition Center Management System — Core Frontend Controller
 * Implements client-side SPA routing, modal management, toasts, 
 * data binding, search filters, and page rendering triggers.
 */

// --------------------------------------------------------------------------
// 0. LANDING PORTAL SLIDES ENGINE & AUTH
// --------------------------------------------------------------------------
let currentSlideIndex = 0;

function switchSlide(slideIndex) {
  currentSlideIndex = slideIndex;
  const container = document.getElementById('slider-container');
  if (container) {
    container.style.transform = `translateX(-${slideIndex * 25}%)`;
  }

  // Toggle active-slide class to animate slide-specific children
  const slides = ['slide-home', 'slide-features', 'slide-about', 'slide-login'];
  slides.forEach((slideId, index) => {
    const slideElem = document.getElementById(slideId);
    if (slideElem) {
      if (index === slideIndex) {
        slideElem.classList.add('active-slide');
      } else {
        slideElem.classList.remove('active-slide');
      }
    }
  });

  // Sync active navigation link
  const links = document.querySelectorAll('.nav-link-landing');
  links.forEach(link => {
    const linkIndex = parseInt(link.getAttribute('data-slide'));
    if (linkIndex === slideIndex) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Re-run icons update for dynamic slides
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function handleSlideNav(event, slideIndex) {
  event.preventDefault();
  switchSlide(slideIndex);
}

function handlePortalLogin(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;

  if (email && pass) {
    showToast('Credentials authenticated! Accessing command portal...');

    // Add transition classes to slide away portal and fade in dashboard
    const portal = document.getElementById('landing-portal');
    const app = document.querySelector('.app-container');

    if (portal) portal.classList.add('portal-locked-out');
    if (app) app.classList.add('portal-unlocked');

    // Force draw lucide icons inside app and load metrics
    setTimeout(() => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
      loadDashboardStats();
    }, 400);
  }
}

// Global State
const State = {
  activePage: 'dashboard',
  students: [],
  tutors: [],
  subjects: [],
  rooms: [],
  batches: [],
  enrollments: [],
  fees: [],
  reports: [],
  deleteTarget: { type: null, id: null } // Track what we're about to delete
};

// Initial App Entry Point
document.addEventListener('DOMContentLoaded', () => {
  // Draw Lucide icons on entry
  if (window.lucide) {
    window.lucide.createIcons();
  }

  initRouter();
  initDateDisplay();
  switchSlide(0); // Trigger initial slide setup

  // Set up click listener for global delete modal confirmation button
  const confirmDeleteBtn = document.getElementById('delete-confirm-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', executeDeleteTarget);
  }

  // Set up search box filters
  setupSearchFilters();
});

// --------------------------------------------------------------------------
// 1. SPA ROUTER & NAVIGATION
// --------------------------------------------------------------------------
function initRouter() {
  const navLinks = document.querySelectorAll('.nav-link');

  // Listen for navbar clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetPage = link.getAttribute('data-page');
      navigateTo(targetPage);
    });
  });

  // Handle direct url hashes on reload
  const initialHash = window.location.hash.replace('#', '');
  const validPages = ['dashboard', 'students', 'tutors', 'batches', 'enrollments', 'attendance', 'fees', 'reports', 'subjects', 'rooms'];

  if (initialHash && validPages.includes(initialHash)) {
    navigateTo(initialHash);
  } else {
    navigateTo('dashboard');
  }

  // Synchronize on browser history pop states
  window.addEventListener('hashchange', () => {
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash && validPages.includes(currentHash) && currentHash !== State.activePage) {
      navigateTo(currentHash, false);
    }
  });
}

function navigateTo(pageId, updateHash = true) {
  State.activePage = pageId;

  // Toggle Page display
  document.querySelectorAll('.page-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  const activePanel = document.getElementById(`page-${pageId}`);
  if (activePanel) activePanel.classList.add('active');

  // Toggle active class on sidebar links
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update URL Hash
  if (updateHash) {
    window.location.hash = pageId;
  }

  // Update Header Title
  const headerTitle = document.getElementById('page-title');
  const headerSubtitle = document.getElementById('page-subtitle');

  const headersMap = {
    dashboard: { title: 'Dashboard Metrics', subtitle: 'Overview of aggregate stats, collections, and logs.' },
    students: { title: 'Students Profiles', subtitle: 'Manage student accounts, registration logs, and details.' },
    tutors: { title: 'Academic Tutors', subtitle: 'View salaries, expert subjects, and coordinate academic staff.' },
    subjects: { title: 'Subjects Registry', subtitle: 'Manage academic subjects and courses offered by the center.' },
    rooms: { title: 'Study Classrooms', subtitle: 'Configure classroom facilities and student capacity constraints.' },
    batches: { title: 'Scheduled Batches', subtitle: 'View timings, classroom limits, and progress meters.' },
    enrollments: { title: 'Batch Enrollments', subtitle: 'DBMS stored procedure enrollments with capacity caps.' },
    attendance: { title: 'Attendance Logbook', subtitle: 'Track and toggle Present, Absent, or Late student lists.' },
    fees: { title: 'Billing & Invoices', subtitle: 'View fees, overdue lists, and log payments.' },
    reports: { title: 'Analytical Reports', subtitle: 'Aggregated attendance percentage and financial ledger.' }
  };

  if (headersMap[pageId]) {
    headerTitle.textContent = headersMap[pageId].title;
    headerSubtitle.textContent = headersMap[pageId].subtitle;
  }

  // Trigger Data Sync depending on page
  syncPageData(pageId);
}

// --------------------------------------------------------------------------
// 2. DATA SYNCHRONIZATION FOR ACTIVE PAGES
// --------------------------------------------------------------------------
async function syncPageData(pageId) {
  try {
    switch (pageId) {
      case 'dashboard':
        await loadDashboardStats();
        break;
      case 'students':
        await loadStudents();
        break;
      case 'tutors':
        await loadTutors();
        break;
      case 'subjects':
        await loadSubjectsPage();
        break;
      case 'rooms':
        await loadRoomsPage();
        break;
      case 'batches':
        await loadBatches();
        break;
      case 'enrollments':
        await loadEnrollmentsPage();
        break;
      case 'attendance':
        await loadAttendancePage();
        break;
      case 'fees':
        await loadFees();
        break;
      case 'reports':
        await loadStudentPerformanceReport();
        break;
    }
    // Re-initialize any dynamic icons loaded
    if (window.lucide) {
      lucide.createIcons();
    }
  } catch (error) {
    showToast(`Failed to load page data: ${error.message}`, 'error');
  }
}

// Helper: Init Local Time Display in Header
function initDateDisplay() {
  const dateSpan = document.getElementById('current-date-display');
  if (dateSpan) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateSpan.textContent = new Date().toLocaleDateString('en-US', options);
  }
}

// --------------------------------------------------------------------------
// 3. TOAST NOTIFICATIONS ENGINE
// --------------------------------------------------------------------------
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  if (window.lucide) {
    lucide.createIcons();
  }

  // Trigger fade out
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3500);
}

// --------------------------------------------------------------------------
// 4. MODALS OVERLAYS CONTROLLER
// --------------------------------------------------------------------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');

    // Clear forms inside modal on open
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// --------------------------------------------------------------------------
// 5. SEARCH & CLIENT-SIDE FILTERS
// --------------------------------------------------------------------------
function setupSearchFilters() {
  // Students Search
  const studentSearchInput = document.getElementById('student-search');
  if (studentSearchInput) {
    studentSearchInput.addEventListener('input', () => {
      const term = studentSearchInput.value.toLowerCase();
      const rows = document.querySelectorAll('#students-table-body tr');
      let foundAny = false;

      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(term)) {
          row.classList.remove('hidden');
          foundAny = true;
        } else {
          row.classList.add('hidden');
        }
      });

      const emptyEl = document.getElementById('students-empty');
      if (emptyEl) {
        if (!foundAny && rows.length > 0) emptyEl.classList.remove('hidden');
        else emptyEl.classList.add('hidden');
      }
    });
  }

  // Tutors Search
  const tutorSearchInput = document.getElementById('tutor-search');
  if (tutorSearchInput) {
    tutorSearchInput.addEventListener('input', () => {
      const term = tutorSearchInput.value.toLowerCase();
      const rows = document.querySelectorAll('#tutors-table-body tr');
      let foundAny = false;

      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(term)) {
          row.classList.remove('hidden');
          foundAny = true;
        } else {
          row.classList.add('hidden');
        }
      });

      const emptyEl = document.getElementById('tutors-empty');
      if (emptyEl) {
        if (!foundAny && rows.length > 0) emptyEl.classList.remove('hidden');
        else emptyEl.classList.add('hidden');
      }
    });
  }

  // Fees Search
  const feesSearchInput = document.getElementById('fees-search');
  if (feesSearchInput) {
    feesSearchInput.addEventListener('input', () => {
      const term = feesSearchInput.value.toLowerCase();
      const rows = document.querySelectorAll('#fees-table-body tr');
      let foundAny = false;

      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(term)) {
          row.classList.remove('hidden');
          foundAny = true;
        } else {
          row.classList.add('hidden');
        }
      });

      const emptyEl = document.getElementById('fees-empty');
      if (emptyEl) {
        if (!foundAny && rows.length > 0) emptyEl.classList.remove('hidden');
        else emptyEl.classList.add('hidden');
      }
    });
  }
}

// --------------------------------------------------------------------------
// 6. PAGE REDIRECT & LOADING SCRIPTS
// --------------------------------------------------------------------------

// --- PAGE: DASHBOARD ---
async function loadDashboardStats() {
  const stats = await API.getDashboardStats();

  // Bind Totals
  document.getElementById('stat-students').textContent = stats.total_students;
  document.getElementById('stat-tutors').textContent = stats.total_tutors;
  document.getElementById('stat-batches').textContent = stats.total_batches;
  document.getElementById('stat-fees').textContent = `$${stats.pending_amount.toLocaleString()}`;

  // Bind Activity Feed
  const activityFeed = document.getElementById('activity-feed-list');
  if (activityFeed) {
    activityFeed.innerHTML = '';

    if (stats.activities.length === 0) {
      activityFeed.innerHTML = '<li class="empty-state-msg">No recent activity logged in the database yet.</li>';
    } else {
      stats.activities.forEach(act => {
        let badgeClass = 'bg-secondary-light text-secondary';
        if (act.type.includes('Joined')) badgeClass = 'bg-indigo-light text-indigo';
        if (act.type.includes('Enrolled')) badgeClass = 'bg-teal-light text-teal';
        if (act.type.includes('Paid')) badgeClass = 'bg-success-light text-success';

        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `
          <div class="activity-details">
            <span class="badge ${badgeClass}">${act.type}</span>
            <span class="activity-name">${act.name}</span>
          </div>
          <span class="text-muted font-xs">Transaction ID: #${act.id}</span>
        `;
        activityFeed.appendChild(li);
      });
    }
  }

  // Load Dashboard Analytics Charts
  const chartsData = await API.getDashboardCharts();
  renderDashboardCharts(chartsData);
}

// --- PAGE: STUDENTS ---
async function loadStudents() {
  const students = await API.getStudents();
  State.students = students;

  const tbody = document.getElementById('students-table-body');
  const emptyState = document.getElementById('students-empty');
  tbody.innerHTML = '';

  if (students.length === 0) {
    emptyState.classList.remove('hidden');
    document.getElementById('students-table').classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    document.getElementById('students-table').classList.remove('hidden');

    students.forEach(student => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${student.student_id}</strong></td>
        <td>${student.name}</td>
        <td>${student.email}</td>
        <td>${student.phone}</td>
        <td>${new Date(student.dob).toLocaleDateString('en-US')}</td>
        <td><span class="text-secondary font-sm">${student.address}</span></td>
        <td class="text-right">
          <button class="btn-sm-icon" onclick="triggerDelete('student', ${student.student_id})">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Submit Add Student
async function submitStudentForm(e) {
  e.preventDefault();
  const name = document.getElementById('student-name').value;
  const email = document.getElementById('student-email').value;
  const phone = document.getElementById('student-phone').value;
  const dob = document.getElementById('student-dob').value;
  const address = document.getElementById('student-address').value;

  try {
    await API.addStudent({ name, email, phone, dob, address });
    closeModal('modal-add-student');
    showToast('Student profile added successfully!');
    loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- PAGE: TUTORS ---
async function loadTutors() {
  const tutors = await API.getTutors();
  State.tutors = tutors;

  const tbody = document.getElementById('tutors-table-body');
  const emptyState = document.getElementById('tutors-empty');
  tbody.innerHTML = '';

  if (tutors.length === 0) {
    emptyState.classList.remove('hidden');
    document.getElementById('tutors-table').classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    document.getElementById('tutors-table').classList.remove('hidden');

    tutors.forEach(tutor => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${tutor.tutor_id}</strong></td>
        <td>${tutor.name}</td>
        <td>${tutor.email}</td>
        <td>${tutor.phone}</td>
        <td><span class="badge badge-subject">${tutor.subject_expertise}</span></td>
        <td><strong>$${parseFloat(tutor.salary).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
        <td class="text-right">
          <button class="btn-sm-icon" onclick="triggerDelete('tutor', ${tutor.tutor_id})">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Submit Add Tutor
async function submitTutorForm(e) {
  e.preventDefault();
  const name = document.getElementById('tutor-name').value;
  const email = document.getElementById('tutor-email').value;
  const phone = document.getElementById('tutor-phone').value;
  const subject_expertise = document.getElementById('tutor-expertise').value;
  const salary = parseFloat(document.getElementById('tutor-salary').value);

  try {
    await API.addTutor({ name, email, phone, subject_expertise, salary });
    closeModal('modal-add-tutor');
    showToast('Tutor profile created successfully!');
    loadTutors();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- PAGE: BATCHES ---
async function loadBatches() {
  const batches = await API.getBatches();
  State.batches = batches;

  const grid = document.getElementById('batches-grid');
  const emptyState = document.getElementById('batches-empty');
  grid.innerHTML = '';

  if (batches.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    batches.forEach(batch => {
      // Calculate capacity indicators
      const enrolled = batch.enrolled_count;
      const max = batch.max_strength;
      const pct = Math.min((enrolled / max) * 100, 100);

      let fillClass = '';
      if (enrolled >= max) {
        fillClass = 'full';
      } else if (enrolled >= max - 2) {
        fillClass = 'warning';
      }

      const card = document.createElement('div');
      card.className = 'batch-card';
      card.innerHTML = `
        <div class="batch-header">
          <div>
            <h4 class="batch-title">${batch.subject_name}</h4>
            <span class="badge bg-indigo-light text-indigo font-xs mt-xs">${batch.subject_level} Level</span>
          </div>
          <span class="text-secondary font-xs font-semibold">ID: #${batch.batch_id}</span>
        </div>
        
        <div class="batch-tutor">
          <i data-lucide="user"></i>
          <span>Tutor: <strong>${batch.tutor_name}</strong></span>
        </div>

        <div class="batch-meta-row">
          <div class="batch-meta-item">
            <i data-lucide="clock"></i>
            <span>${batch.timings}</span>
          </div>
          <div class="batch-meta-item">
            <i data-lucide="calendar-days"></i>
            <span>${batch.days}</span>
          </div>
          <div class="batch-meta-item">
            <i data-lucide="map-pin"></i>
            <span>${batch.room_name} (Max cap: ${batch.room_capacity})</span>
          </div>
        </div>

        <div class="batch-strength-container">
          <div class="batch-strength-label">
            <span>Enrolled Strength</span>
            <span>${enrolled} / ${max} Students</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill ${fillClass}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  // Pre-load Form Dropdowns when batches are fetched to make scheduling batches smoother
  await loadBatchLookups();
}

async function loadBatchLookups() {
  const [subjects, tutors, rooms] = await Promise.all([
    API.getSubjects(),
    API.getTutors(),
    API.getRooms()
  ]);

  // Subjects Selector
  const subjectSelect = document.getElementById('batch-subject');
  if (subjectSelect) {
    subjectSelect.innerHTML = '<option value="">-- Choose Subject --</option>';
    subjects.forEach(sub => {
      subjectSelect.innerHTML += `<option value="${sub.subject_id}">${sub.subject_name} (${sub.level})</option>`;
    });
  }

  // Tutors Selector
  const tutorSelect = document.getElementById('batch-tutor');
  if (tutorSelect) {
    tutorSelect.innerHTML = '<option value="">-- Choose Tutor --</option>';
    tutors.forEach(tut => {
      tutorSelect.innerHTML += `<option value="${tut.tutor_id}">${tut.name} (${tut.subject_expertise})</option>`;
    });
  }

  // Rooms Selector
  const roomSelect = document.getElementById('batch-room');
  if (roomSelect) {
    roomSelect.innerHTML = '<option value="">-- Choose Room --</option>';
    rooms.forEach(rm => {
      roomSelect.innerHTML += `<option value="${rm.room_id}">${rm.room_name} (Capacity: ${rm.capacity})</option>`;
    });
  }
}

// Submit Add Batch Schedule
async function submitBatchForm(e) {
  e.preventDefault();
  const subject_id = parseInt(document.getElementById('batch-subject').value);
  const tutor_id = parseInt(document.getElementById('batch-tutor').value);
  const room_id = parseInt(document.getElementById('batch-room').value);
  const timings = document.getElementById('batch-timings').value;
  const days = document.getElementById('batch-days').value;
  const max_strength = parseInt(document.getElementById('batch-strength').value);

  try {
    await API.addBatch({ subject_id, tutor_id, room_id, timings, days, max_strength });
    closeModal('modal-add-batch');
    showToast('Class batch scheduled successfully!');
    loadBatches();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- PAGE: ENROLLMENTS ---
async function loadEnrollmentsPage() {
  const [students, batches, enrollments] = await Promise.all([
    API.getStudents(),
    API.getBatches(),
    API.getEnrollments()
  ]);

  // Populate dynamic student select option
  const studentSelect = document.getElementById('enroll-student-select');
  studentSelect.innerHTML = '<option value="">-- Choose Student --</option>';
  students.forEach(st => {
    studentSelect.innerHTML += `<option value="${st.student_id}">${st.name} (${st.email})</option>`;
  });

  // Populate dynamic batch select option
  const batchSelect = document.getElementById('enroll-batch-select');
  batchSelect.innerHTML = '<option value="">-- Choose Batch Schedule --</option>';
  batches.forEach(b => {
    const isFullText = b.enrolled_count >= b.max_strength ? ' [FULL]' : '';
    batchSelect.innerHTML += `<option value="${b.batch_id}" data-enrolled="${b.enrolled_count}" data-max="${b.max_strength}">${b.subject_name} (${b.timings} | ${b.days})${isFullText}</option>`;
  });

  // Render Enrollment list
  const tbody = document.getElementById('enrollments-table-body');
  const emptyState = document.getElementById('enrollments-empty');
  tbody.innerHTML = '';

  if (enrollments.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    enrollments.forEach(en => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${en.student_name}</strong><br><span class="text-secondary font-xs">${en.student_email}</span></td>
        <td><span class="badge bg-secondary-light text-secondary">Batch #${en.batch_id}</span></td>
        <td><strong>${en.subject_name}</strong><br><span class="badge bg-indigo-light text-indigo font-xs mt-xs">${en.subject_level}</span></td>
        <td><span class="font-sm font-semibold">${en.days}</span><br><span class="text-secondary font-xs">${en.timings}</span></td>
        <td>${new Date(en.join_date).toLocaleDateString('en-US')}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Reset capacity warning banner state
  document.getElementById('enrollment-capacity-warning').classList.add('hidden');
}

// Triggered when selection in batch enrollment form changes
function checkBatchCapacityWarning() {
  const select = document.getElementById('enroll-batch-select');
  const warningBanner = document.getElementById('enrollment-capacity-warning');
  const warningText = document.getElementById('capacity-warning-text');

  if (!select.value) {
    warningBanner.classList.add('hidden');
    return;
  }

  const selectedOpt = select.options[select.selectedIndex];
  const enrolled = parseInt(selectedOpt.getAttribute('data-enrolled') || '0');
  const max = parseInt(selectedOpt.getAttribute('data-max') || '0');

  if (enrolled >= max) {
    warningBanner.classList.remove('hidden');
    warningText.textContent = `CRITICAL: This batch is fully populated (${enrolled}/${max}). Relational Stored Procedure constraint will block this enrollment!`;
    warningBanner.style.backgroundColor = 'var(--red-light)';
    warningBanner.style.color = 'var(--red)';
  } else if (enrolled >= max - 2) {
    warningBanner.classList.remove('hidden');
    warningText.textContent = `WARNING: Selected batch is near maximum capacity (${enrolled}/${max} filled). Enroll soon.`;
    warningBanner.style.backgroundColor = 'var(--orange-light)';
    warningBanner.style.color = 'var(--orange)';
  } else {
    warningBanner.classList.add('hidden');
  }
}

// Form Enrollment Submit (Calls Stored Procedure)
const enrollForm = document.getElementById('enrollment-form');
if (enrollForm) {
  enrollForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const studentId = parseInt(document.getElementById('enroll-student-select').value);
    const batchId = parseInt(document.getElementById('enroll-batch-select').value);

    try {
      await API.enrollStudent(studentId, batchId);
      showToast('Student enrolled successfully via DB Stored Procedure!');
      loadEnrollmentsPage();
    } catch (err) {
      showToast(`Database Restriction: ${err.message}`, 'error');
    }
  });
}

// --- PAGE: ATTENDANCE ---
async function loadAttendancePage() {
  const batches = await API.getBatches();

  const batchSelect = document.getElementById('attendance-batch-select');
  batchSelect.innerHTML = '<option value="">-- Select Batch Schedule --</option>';
  batches.forEach(b => {
    batchSelect.innerHTML += `<option value="${b.batch_id}">${b.subject_name} (${b.timings} | ${b.days})</option>`;
  });

  // Default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('attendance-date-input').value = today;

  // Clear Roster table initially
  const tbody = document.getElementById('attendance-table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="3" class="text-center text-secondary py-lg">
        Please select a batch and log date to open the attendance register sheet.
      </td>
    </tr>
  `;
  document.getElementById('save-attendance-btn').classList.add('hidden');
}

// Loads attendance roll call roster list
async function loadAttendanceRoll() {
  const batchId = document.getElementById('attendance-batch-select').value;
  const date = document.getElementById('attendance-date-input').value;

  if (!batchId || !date) return;

  const roster = await API.getAttendance(batchId, date);
  const tbody = document.getElementById('attendance-table-body');
  const saveBtn = document.getElementById('save-attendance-btn');
  const metaInfo = document.getElementById('attendance-meta-info');
  tbody.innerHTML = '';

  if (roster.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-lg text-secondary">
          No students are currently enrolled in this batch. Go to the Enrollments tab first.
        </td>
      </tr>
    `;
    saveBtn.classList.add('hidden');
    metaInfo.textContent = 'Roster sheet is empty.';
  } else {
    saveBtn.classList.remove('hidden');
    metaInfo.textContent = `Logged: ${roster.length} active students enrolled. Select statuses and save changes.`;

    roster.forEach(item => {
      // Default state is Present if not logged yet
      const status = item.attendance_status || 'Present';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.student_name}</strong></td>
        <td><span class="text-secondary font-sm">${item.student_email}</span></td>
        <td>
          <div class="attendance-toggle-group" data-student-id="${item.student_id}">
            <button class="attendance-toggle-btn ${status === 'Present' ? 'active' : ''}" data-status="Present">Present</button>
            <button class="attendance-toggle-btn ${status === 'Absent' ? 'active' : ''}" data-status="Absent">Absent</button>
            <button class="attendance-toggle-btn ${status === 'Late' ? 'active' : ''}" data-status="Late">Late</button>
          </div>
        </td>
      `;

      // Bind interactive toggle clicks
      const buttons = tr.querySelectorAll('.attendance-toggle-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      tbody.appendChild(tr);
    });
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Submits attendance roll states
async function saveAttendanceLogs() {
  const batchId = parseInt(document.getElementById('attendance-batch-select').value);
  const date = document.getElementById('attendance-date-input').value;

  if (!batchId || !date) return;

  const rows = document.querySelectorAll('#attendance-table-body tr');
  const logs = [];

  rows.forEach(row => {
    const group = row.querySelector('.attendance-toggle-group');
    if (group) {
      const studentId = parseInt(group.getAttribute('data-student-id'));
      const activeBtn = group.querySelector('.attendance-toggle-btn.active');
      const status = activeBtn ? activeBtn.getAttribute('data-status') : 'Present';

      logs.push({ student_id: studentId, status });
    }
  });

  try {
    await API.saveAttendance(batchId, date, logs);
    showToast('Attendance roll logs saved successfully!');
    loadAttendanceRoll();
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// --- PAGE: FEES ---
async function loadFees() {
  const fees = await API.getFees();
  State.fees = fees;

  const tbody = document.getElementById('fees-table-body');
  const emptyState = document.getElementById('fees-empty');
  tbody.innerHTML = '';

  if (fees.length === 0) {
    emptyState.classList.remove('hidden');
    document.getElementById('fees-table').classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    document.getElementById('fees-table').classList.remove('hidden');

    fees.forEach(fee => {
      // Setup status tag colors
      let badgeClass = '';
      if (fee.status === 'Paid') badgeClass = 'badge-paid';
      else if (fee.status === 'Pending') badgeClass = 'badge-pending';
      else if (fee.status === 'Overdue') badgeClass = 'badge-overdue';

      const actionBtn = fee.status !== 'Paid'
        ? `<button class="btn btn-teal btn-sm-icon font-xs p-xs" onclick="payFeeBill(${fee.payment_id})" style="width: auto; padding: 0.25rem 0.5rem;"><i data-lucide="check" style="width:14px;height:14px;"></i> Mark Paid</button>`
        : `<span class="text-secondary font-xs">Settled</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#INV-${fee.payment_id}</strong></td>
        <td><strong>${fee.student_name}</strong><br><span class="text-secondary font-xs">${fee.student_email}</span></td>
        <td><strong>$${parseFloat(fee.amount).toFixed(2)}</strong></td>
        <td>${new Date(fee.due_date).toLocaleDateString('en-US')}</td>
        <td><span class="badge ${badgeClass}">${fee.status}</span></td>
        <td>${fee.payment_date ? new Date(fee.payment_date).toLocaleDateString('en-US') : '<span class="text-muted font-xs">—</span>'}</td>
        <td class="text-right">${actionBtn}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Preload student recipient dropdown when modal fee opens
  const students = await API.getStudents();
  const select = document.getElementById('fee-student');
  if (select) {
    select.innerHTML = '<option value="">-- Choose Student --</option>';
    students.forEach(st => {
      select.innerHTML += `<option value="${st.student_id}">${st.name} (${st.email})</option>`;
    });
  }
}

// Mark Fee Paid
async function payFeeBill(id) {
  try {
    await API.payFee(id);
    showToast('Invoice marked as Paid. Transaction recorded.');
    loadFees();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Create fee bill submit
async function submitFeeForm(e) {
  e.preventDefault();
  const studentId = parseInt(document.getElementById('fee-student').value);
  const amount = parseFloat(document.getElementById('fee-amount').value);
  const dueDate = document.getElementById('fee-due-date').value;

  try {
    await API.addFee(studentId, amount, dueDate);
    closeModal('modal-add-fee');
    showToast('Bill generated successfully! Database trigger will evaluate statuses.');
    loadFees();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- PAGE: REPORTS ---
async function loadStudentPerformanceReport() {
  const [reportData, chartsData] = await Promise.all([
    API.getStudentPerformanceReport(),
    API.getDashboardCharts()
  ]);
  State.reports = reportData;

  const tbody = document.getElementById('reports-table-body');
  const emptyState = document.getElementById('reports-empty');
  tbody.innerHTML = '';

  if (reportData.length === 0) {
    emptyState.classList.remove('hidden');
    document.getElementById('reports-table').classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    document.getElementById('reports-table').classList.remove('hidden');

    reportData.forEach(row => {
      const attendanceRate = parseFloat(row.attendance_percentage);
      let attendanceClass = 'text-success font-semibold';
      if (attendanceRate < 75) {
        attendanceClass = 'text-red font-semibold';
      } else if (attendanceRate < 90) {
        attendanceClass = 'text-orange font-semibold';
      }

      let feeBadgeClass = '';
      if (row.overall_fee_status === 'Paid') feeBadgeClass = 'badge-paid';
      else if (row.overall_fee_status === 'Pending') feeBadgeClass = 'badge-pending';
      else if (row.overall_fee_status === 'Overdue') feeBadgeClass = 'badge-overdue';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#ST-${row.student_id}</strong></td>
        <td><strong>${row.student_name}</strong></td>
        <td>${row.student_email}</td>
        <td class="text-center"><span class="${attendanceClass}">${attendanceRate}%</span></td>
        <td class="text-center font-semibold text-success">${row.paid_fees_count}</td>
        <td class="text-center font-semibold text-orange">${row.pending_fees_count}</td>
        <td class="text-center font-semibold text-red">${row.overdue_fees_count}</td>
        <td class="text-center"><span class="badge ${feeBadgeClass}">${row.overall_fee_status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Render the dynamic reports page charts
  renderReportsCharts(chartsData);
}

// Table column sort utility for report rates
let sortDirection = false; // false = desc, true = asc
function sortTable(columnIndex) {
  const table = document.getElementById('reports-table');
  const rows = Array.from(table.querySelectorAll('tbody tr'));

  if (rows.length === 0) return;

  sortDirection = !sortDirection;

  rows.sort((rowA, rowB) => {
    const cellA = rowA.cells[columnIndex].innerText.replace('%', '');
    const cellB = rowB.cells[columnIndex].innerText.replace('%', '');

    return sortDirection
      ? parseFloat(cellA) - parseFloat(cellB)
      : parseFloat(cellB) - parseFloat(cellA);
  });

  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  rows.forEach(row => tbody.appendChild(row));
}


// --------------------------------------------------------------------------
// 7. CASCADE DELETE PROCESSOR
// --------------------------------------------------------------------------
function triggerDelete(type, id) {
  State.deleteTarget = { type, id };
  openModal('modal-delete-confirm');
}

async function executeDeleteTarget() {
  const { type, id } = State.deleteTarget;
  if (!type || !id) return;

  try {
    if (type === 'student') {
      await API.deleteStudent(id);
      showToast('Student profile and associated data deleted.');
      loadStudents();
    } else if (type === 'tutor') {
      await API.deleteTutor(id);
      showToast('Tutor profile deleted from registry.');
      loadTutors();
    } else if (type === 'subject') {
      await API.deleteSubject(id);
      showToast('Subject deleted successfully.');
      loadSubjectsPage();
    } else if (type === 'room') {
      await API.deleteRoom(id);
      showToast('Classroom room deleted successfully.');
      loadRoomsPage();
    }
    closeModal('modal-delete-confirm');
  } catch (err) {
    showToast(`Deletion Error: ${err.message}`, 'error');
  } finally {
    State.deleteTarget = { type: null, id: null };
  }
}

// --- PAGE: SUBJECTS ---
async function loadSubjectsPage() {
  const subjects = await API.getSubjects();
  State.subjects = subjects;

  const tbody = document.getElementById('subjects-table-body');
  const emptyState = document.getElementById('subjects-empty');
  tbody.innerHTML = '';

  if (subjects.length === 0) {
    emptyState.classList.remove('hidden');
    const tbl = document.getElementById('subjects-table');
    if (tbl) tbl.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    const tbl = document.getElementById('subjects-table');
    if (tbl) tbl.classList.remove('hidden');

    subjects.forEach(sub => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#SUB-${sub.subject_id}</strong></td>
        <td><strong>${sub.subject_name}</strong></td>
        <td><span class="badge badge-subject">${sub.level}</span></td>
        <td class="text-right">
          <button class="btn-sm-icon" onclick="triggerDelete('subject', ${sub.subject_id})">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Submit Add Subject Form
async function submitSubjectForm(e) {
  e.preventDefault();
  const subject_name = document.getElementById('subject-name-input').value;
  const level = document.getElementById('subject-level-input').value;

  try {
    await API.addSubject({ subject_name, level });
    closeModal('modal-add-subject');
    showToast('New academic subject added successfully!');
    document.getElementById('form-add-subject').reset();
    loadSubjectsPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- PAGE: ROOMS ---
async function loadRoomsPage() {
  const rooms = await API.getRooms();
  State.rooms = rooms;

  const tbody = document.getElementById('rooms-table-body');
  const emptyState = document.getElementById('rooms-empty');
  tbody.innerHTML = '';

  if (rooms.length === 0) {
    emptyState.classList.remove('hidden');
    const tbl = document.getElementById('rooms-table');
    if (tbl) tbl.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    const tbl = document.getElementById('rooms-table');
    if (tbl) tbl.classList.remove('hidden');

    rooms.forEach(room => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#RM-${room.room_id}</strong></td>
        <td><strong>${room.room_name}</strong></td>
        <td><span class="badge bg-indigo-light text-indigo">${room.capacity} students max</span></td>
        <td class="text-right">
          <button class="btn-sm-icon" onclick="triggerDelete('room', ${room.room_id})">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// Submit Add Room Form
async function submitRoomForm(e) {
  e.preventDefault();
  const room_name = document.getElementById('room-name-input').value;
  const capacity = parseInt(document.getElementById('room-capacity-input').value);

  try {
    await API.addRoom({ room_name, capacity });
    closeModal('modal-add-room');
    showToast('New classroom configured successfully!');
    document.getElementById('form-add-room').reset();
    loadRoomsPage();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Global filter functions
function filterSubjectsTable() {
  const searchInput = document.getElementById('search-subjects');
  if (!searchInput) return;
  const term = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll('#subjects-table-body tr');
  let foundAny = false;

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    if (text.includes(term)) {
      row.classList.remove('hidden');
      foundAny = true;
    } else {
      row.classList.add('hidden');
    }
  });

  const emptyEl = document.getElementById('subjects-empty');
  if (emptyEl) {
    if (!foundAny && rows.length > 0) emptyEl.classList.remove('hidden');
    else emptyEl.classList.add('hidden');
  }
}

function filterRoomsTable() {
  const searchInput = document.getElementById('search-rooms');
  if (!searchInput) return;
  const term = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll('#rooms-table-body tr');
  let foundAny = false;

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    if (text.includes(term)) {
      row.classList.remove('hidden');
      foundAny = true;
    } else {
      row.classList.add('hidden');
    }
  });

  const emptyEl = document.getElementById('rooms-empty');
  if (emptyEl) {
    if (!foundAny && rows.length > 0) emptyEl.classList.remove('hidden');
    else emptyEl.classList.add('hidden');
  }
}
