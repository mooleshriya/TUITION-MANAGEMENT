/**
 * Tuition Center Management System — API Client Layer
 * Handles asynchronous communications with Express REST backend.
 */

const API_BASE = '/api';

// Helper to execute standard fetches with robust error reporting
async function request(url, options = {}) {
  const showSpinner = document.getElementById('loading-spinner');
  if (showSpinner) showSpinner.classList.remove('hidden');

  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! Status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Error [${url}]:`, error);
    throw error;
  } finally {
    if (showSpinner) showSpinner.classList.add('hidden');
  }
}

const API = {
  // Students API
  getStudents: () => request('/students'),
  addStudent: (studentData) => request('/students', {
    method: 'POST',
    body: JSON.stringify(studentData)
  }),
  deleteStudent: (id) => request(`/students/${id}`, {
    method: 'DELETE'
  }),

  // Tutors API
  getTutors: () => request('/tutors'),
  addTutor: (tutorData) => request('/tutors', {
    method: 'POST',
    body: JSON.stringify(tutorData)
  }),
  deleteTutor: (id) => request(`/tutors/${id}`, {
    method: 'DELETE'
  }),

  // Subjects & Rooms (Lookup Tables)
  getSubjects: () => request('/subjects'),
  addSubject: (subjectData) => request('/subjects', {
    method: 'POST',
    body: JSON.stringify(subjectData)
  }),
  deleteSubject: (id) => request(`/subjects/${id}`, {
    method: 'DELETE'
  }),

  getRooms: () => request('/rooms'),
  addRoom: (roomData) => request('/rooms', {
    method: 'POST',
    body: JSON.stringify(roomData)
  }),
  deleteRoom: (id) => request(`/rooms/${id}`, {
    method: 'DELETE'
  }),

  // Batches API
  getBatches: () => request('/batches'),
  addBatch: (batchData) => request('/batches', {
    method: 'POST',
    body: JSON.stringify(batchData)
  }),

  // Enrollments API
  getEnrollments: () => request('/enrollments'),
  enrollStudent: (studentId, batchId) => request('/enrollments', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, batch_id: batchId })
  }),

  // Attendance API
  getAttendance: (batchId, date) => request(`/attendance/${batchId}/${date}`),
  saveAttendance: (batchId, date, logs) => request('/attendance', {
    method: 'POST',
    body: JSON.stringify({ batch_id: batchId, date, logs })
  }),

  // Fees API
  getFees: () => request('/fees'),
  addFee: (studentId, amount, dueDate) => request('/fees', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, amount, due_date: dueDate })
  }),
  payFee: (paymentId) => request(`/fees/${paymentId}/pay`, {
    method: 'PUT'
  }),

  // Dashboard API
  getDashboardStats: () => request('/dashboard/stats'),
  getDashboardCharts: () => request('/dashboard/charts'),

  // Reports API (Combines views & aggregate stats)
  getStudentPerformanceReport: () => request('/reports/student-performance')
};
