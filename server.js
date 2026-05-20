const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Initialize configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create MySQL connection pool
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tuition_center_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function connectDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    // Test connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database pool successfully.');

    // Periodically update Overdue status in case days pass
    await connection.query(`
      UPDATE Fee_Payment 
      SET status = 'Overdue' 
      WHERE due_date < CURDATE() AND status = 'Pending'
    `);
    console.log('Synchronized fee payment overdue statuses.');

    connection.release();
  } catch (error) {
    console.error('Database connection failed. Make sure MySQL is running and schema.sql is executed.');
    console.error(error.message);
  }
}

connectDatabase();

// Helper to handle async route errors
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==========================================
// REST API ROUTES
// ==========================================

// ------------------------------------------
// 1. STUDENTS API
// ------------------------------------------

// Get all students
app.get('/api/students', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM Student ORDER BY student_id DESC');
  res.json(rows);
}));

// Add a student
app.post('/api/students', asyncHandler(async (req, res) => {
  const { name, email, phone, address, dob } = req.body;
  if (!name || !email || !phone || !address || !dob) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const [result] = await pool.query(
    'INSERT INTO Student (name, email, phone, address, dob) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, address, dob]
  );

  res.status(201).json({
    message: 'Student added successfully',
    student_id: result.insertId
  });
}));

// Delete a student
app.delete('/api/students/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query('DELETE FROM Student WHERE student_id = ?', [id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Student not found' });
  }
  res.json({ message: 'Student deleted successfully' });
}));


// ------------------------------------------
// 2. TUTORS API
// ------------------------------------------

// Get all tutors
app.get('/api/tutors', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM Tutor ORDER BY tutor_id DESC');
  res.json(rows);
}));

// Add a tutor
app.post('/api/tutors', asyncHandler(async (req, res) => {
  const { name, email, phone, subject_expertise, salary } = req.body;
  if (!name || !email || !phone || !subject_expertise || salary === undefined) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const [result] = await pool.query(
    'INSERT INTO Tutor (name, email, phone, subject_expertise, salary) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, subject_expertise, salary]
  );

  res.status(201).json({
    message: 'Tutor added successfully',
    tutor_id: result.insertId
  });
}));

// Delete a tutor
app.delete('/api/tutors/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query('DELETE FROM Tutor WHERE tutor_id = ?', [id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Tutor not found' });
  }
  res.json({ message: 'Tutor deleted successfully' });
}));


// ------------------------------------------
// 3. AUXILIARY DATA LOOKUPS (Rooms & Subjects)
// ------------------------------------------

app.get('/api/subjects', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM Subject ORDER BY subject_name ASC');
  res.json(rows);
}));

app.post('/api/subjects', asyncHandler(async (req, res) => {
  const { subject_name, level } = req.body;
  if (!subject_name || !level) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const [result] = await pool.query(
    'INSERT INTO Subject (subject_name, level) VALUES (?, ?)',
    [subject_name, level]
  );
  res.status(201).json({
    message: 'Subject added successfully',
    subject_id: result.insertId
  });
}));

app.delete('/api/subjects/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM Subject WHERE subject_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Cannot delete Subject because it is associated with an active Batch schedule.' });
    }
    res.status(500).json({ error: 'Failed to delete Subject.' });
  }
}));

app.get('/api/rooms', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM Room ORDER BY room_name ASC');
  res.json(rows);
}));

app.post('/api/rooms', asyncHandler(async (req, res) => {
  const { room_name, capacity } = req.body;
  if (!room_name || !capacity) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const [result] = await pool.query(
    'INSERT INTO Room (room_name, capacity) VALUES (?, ?)',
    [room_name, capacity]
  );
  res.status(201).json({
    message: 'Room added successfully',
    room_id: result.insertId
  });
}));

app.delete('/api/rooms/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM Room WHERE room_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Cannot delete Room because it is associated with an active Batch schedule.' });
    }
    res.status(500).json({ error: 'Failed to delete Room.' });
  }
}));


// ------------------------------------------
// 4. BATCHES API
// ------------------------------------------

// Get all batches with detailed Joins
app.get('/api/batches', asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      b.batch_id,
      b.timings,
      b.days,
      b.max_strength,
      s.subject_name,
      s.level AS subject_level,
      t.name AS tutor_name,
      t.subject_expertise,
      r.room_name,
      r.capacity AS room_capacity,
      (SELECT COUNT(*) FROM Enrollment e WHERE e.batch_id = b.batch_id) AS enrolled_count
    FROM Batch b
    INNER JOIN Subject s ON b.subject_id = s.subject_id
    INNER JOIN Tutor t ON b.tutor_id = t.tutor_id
    INNER JOIN Room r ON b.room_id = r.room_id
    ORDER BY b.batch_id DESC
  `;
  const [rows] = await pool.query(query);
  res.json(rows);
}));

// Add a batch
app.post('/api/batches', asyncHandler(async (req, res) => {
  const { subject_id, tutor_id, room_id, timings, days, max_strength } = req.body;
  if (!subject_id || !tutor_id || !room_id || !timings || !days || !max_strength) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Verify that batch max_strength doesn't exceed room capacity
  const [roomRows] = await pool.query('SELECT capacity FROM Room WHERE room_id = ?', [room_id]);
  if (roomRows.length === 0) {
    return res.status(404).json({ error: 'Selected Room does not exist' });
  }
  const roomCapacity = roomRows[0].capacity;
  if (parseInt(max_strength) > roomCapacity) {
    return res.status(400).json({
      error: `Batch size (${max_strength}) cannot exceed room capacity (${roomCapacity})`
    });
  }

  const [result] = await pool.query(
    'INSERT INTO Batch (subject_id, tutor_id, room_id, timings, days, max_strength) VALUES (?, ?, ?, ?, ?, ?)',
    [subject_id, tutor_id, room_id, timings, days, max_strength]
  );

  res.status(201).json({
    message: 'Batch created successfully',
    batch_id: result.insertId
  });
}));


// ------------------------------------------
// 5. ENROLLMENTS API (Utilizes Stored Procedure)
// ------------------------------------------

// Get all enrollments
app.get('/api/enrollments', asyncHandler(async (req, res) => {
  const query = `
    SELECT 
      e.enrollment_id,
      e.join_date,
      s.name AS student_name,
      s.email AS student_email,
      sub.subject_name,
      sub.level AS subject_level,
      b.batch_id,
      b.timings,
      b.days
    FROM Enrollment e
    INNER JOIN Student s ON e.student_id = s.student_id
    INNER JOIN Batch b ON e.batch_id = b.batch_id
    INNER JOIN Subject sub ON b.subject_id = sub.subject_id
    ORDER BY e.enrollment_id DESC
  `;
  const [rows] = await pool.query(query);
  res.json(rows);
}));

// Enroll a student using the `enroll_student` Stored Procedure
app.post('/api/enrollments', asyncHandler(async (req, res) => {
  const { student_id, batch_id } = req.body;
  if (!student_id || !batch_id) {
    return res.status(400).json({ error: 'Student and Batch selection are required' });
  }

  try {
    // Call MySQL Stored Procedure
    await pool.query('CALL enroll_student(?, ?)', [student_id, batch_id]);
    res.status(201).json({ message: 'Student enrolled successfully' });
  } catch (error) {
    // Elegant retrieval of Stored Procedure Capacity Signal (SQLSTATE 45000)
    console.error('Enrollment stored procedure error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to enroll student.' });
  }
}));


// ------------------------------------------
// 6. ATTENDANCE API
// ------------------------------------------

// Get attendance logs for a batch and specific date
app.get('/api/attendance/:batchId/:date', asyncHandler(async (req, res) => {
  const { batchId, date } = req.params;

  const query = `
    SELECT 
      s.student_id,
      s.name AS student_name,
      s.email AS student_email,
      a.status AS attendance_status,
      a.attendance_id
    FROM Student s
    INNER JOIN Enrollment e ON s.student_id = e.student_id
    LEFT JOIN Attendance a ON s.student_id = a.student_id AND a.batch_id = ? AND a.date = ?
    WHERE e.batch_id = ?
    ORDER BY s.name ASC
  `;

  const [rows] = await pool.query(query, [batchId, date, batchId]);
  res.json(rows);
}));

// Save or Update Attendance logs
app.post('/api/attendance', asyncHandler(async (req, res) => {
  const { batch_id, date, logs } = req.body; // logs: [{student_id, status}]
  if (!batch_id || !date || !logs || !Array.isArray(logs)) {
    return res.status(400).json({ error: 'Batch, Date, and student logs list are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const upsertQuery = `
      INSERT INTO Attendance (student_id, batch_id, date, status) 
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;

    for (const log of logs) {
      await connection.query(upsertQuery, [log.student_id, batch_id, date, log.status]);
    }

    await connection.commit();
    res.json({ message: 'Attendance saved successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving attendance:', error.message);
    res.status(500).json({ error: 'Failed to save attendance records' });
  } finally {
    connection.release();
  }
}));


// ------------------------------------------
// 7. FEES PAYMENT API
// ------------------------------------------

// Get all fee payments
app.get('/api/fees', asyncHandler(async (req, res) => {
  // Sync overdue status first
  await pool.query(`
    UPDATE Fee_Payment 
    SET status = 'Overdue' 
    WHERE due_date < CURDATE() AND status = 'Pending'
  `);

  const query = `
    SELECT 
      f.payment_id,
      f.amount,
      f.payment_date,
      f.due_date,
      f.status,
      s.name AS student_name,
      s.email AS student_email,
      s.student_id
    FROM Fee_Payment f
    INNER JOIN Student s ON f.student_id = s.student_id
    ORDER BY f.due_date DESC, f.payment_id DESC
  `;
  const [rows] = await pool.query(query);
  res.json(rows);
}));

// Create a fee record (Add bill)
app.post('/api/fees', asyncHandler(async (req, res) => {
  const { student_id, amount, due_date } = req.body;
  if (!student_id || !amount || !due_date) {
    return res.status(400).json({ error: 'Student, Amount, and Due Date are required' });
  }

  const [result] = await pool.query(
    'INSERT INTO Fee_Payment (student_id, amount, due_date, status) VALUES (?, ?, ?, "Pending")',
    [student_id, amount, due_date]
  );

  res.status(201).json({
    message: 'Fee bill generated successfully',
    payment_id: result.insertId
  });
}));

// Mark fee as Paid
app.put('/api/fees/:id/pay', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query(
    "UPDATE Fee_Payment SET status = 'Paid', payment_date = CURDATE() WHERE payment_id = ?",
    [id]
  );
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'Fee record not found' });
  }
  res.json({ message: 'Fee marked as Paid successfully' });
}));


// ------------------------------------------
// 8. DASHBOARD METRICS & CHARTS API
// ------------------------------------------

// Fetch dashboard card totals
app.get('/api/dashboard/stats', asyncHandler(async (req, res) => {
  // Sync overdue status first
  await pool.query("UPDATE Fee_Payment SET status = 'Overdue' WHERE due_date < CURDATE() AND status = 'Pending'");

  const [[{ total_students }]] = await pool.query('SELECT COUNT(*) AS total_students FROM Student');
  const [[{ total_tutors }]] = await pool.query('SELECT COUNT(*) AS total_tutors FROM Tutor');
  const [[{ total_batches }]] = await pool.query('SELECT COUNT(*) AS total_batches FROM Batch');
  const [[{ pending_fees_count }]] = await pool.query("SELECT COUNT(*) AS pending_fees_count FROM Fee_Payment WHERE status IN ('Pending', 'Overdue')");

  // Pending fee collection projection
  const [[{ pending_amount }]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS pending_amount FROM Fee_Payment WHERE status IN ('Pending', 'Overdue')");
  const [[{ paid_amount }]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM Fee_Payment WHERE status = 'Paid'");

  // Recent activity logs (Mocking dynamic activities based on actual database logs for rich realism)
  const [recentStudents] = await pool.query('SELECT name, "Student Joined" AS type, student_id AS id FROM Student ORDER BY student_id DESC LIMIT 3');
  const [recentEnrollments] = await pool.query(`
    SELECT s.name, "Enrolled in Batch" AS type, e.enrollment_id AS id 
    FROM Enrollment e
    INNER JOIN Student s ON e.student_id = s.student_id
    ORDER BY e.enrollment_id DESC LIMIT 3
  `);
  const [recentPayments] = await pool.query(`
    SELECT s.name, "Paid Fees" AS type, f.payment_id AS id 
    FROM Fee_Payment f
    INNER JOIN Student s ON f.student_id = s.student_id
    WHERE f.status = 'Paid'
    ORDER BY f.payment_date DESC LIMIT 3
  `);

  const activities = [...recentStudents, ...recentEnrollments, ...recentPayments]
    .sort(() => 0.5 - Math.random()) // Shuffle simply for dashboard realism
    .slice(0, 5);

  res.json({
    total_students,
    total_tutors,
    total_batches,
    pending_fees_count,
    pending_amount: parseFloat(pending_amount),
    total_collected: parseFloat(paid_amount),
    activities
  });
}));

// Fetch analytics charts data
app.get('/api/dashboard/charts', asyncHandler(async (req, res) => {
  // 1. Fee collection over time (group by month)
  const [feeCollection] = await pool.query(`
    SELECT 
      DATE_FORMAT(payment_date, '%M %Y') AS month,
      SUM(amount) AS total_collected
    FROM Fee_Payment
    WHERE status = 'Paid' AND payment_date IS NOT NULL
    GROUP BY DATE_FORMAT(payment_date, '%Y-%m'), DATE_FORMAT(payment_date, '%M %Y')
    ORDER BY DATE_FORMAT(payment_date, '%Y-%m') ASC
    LIMIT 6
  `);

  // 2. Attendance Status summary
  const [attendanceDistribution] = await pool.query(`
    SELECT status, COUNT(*) AS count
    FROM Attendance
    GROUP BY status
  `);

  // 3. Batch distribution (students per batch)
  const [batchDistribution] = await pool.query(`
    SELECT 
      s.subject_name,
      b.timings,
      COUNT(e.enrollment_id) AS student_count
    FROM Batch b
    INNER JOIN Subject s ON b.subject_id = s.subject_id
    LEFT JOIN Enrollment e ON b.batch_id = e.batch_id
    GROUP BY b.batch_id, s.subject_name, b.timings
  `);

  res.json({
    feeCollection,
    attendanceDistribution,
    batchDistribution
  });
}));


// ------------------------------------------
// 9. STUDENT PERFORMANCE REPORTS API (Uses Views)
// ------------------------------------------

app.get('/api/reports/student-performance', asyncHandler(async (req, res) => {
  // Sync overdue status first
  await pool.query("UPDATE Fee_Payment SET status = 'Overdue' WHERE due_date < CURDATE() AND status = 'Pending'");

  // Pull directly from student_dashboard_view (DBMS View requirement)
  const [rows] = await pool.query('SELECT * FROM student_dashboard_view ORDER BY attendance_percentage DESC');
  res.json(rows);
}));


// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: err.message || 'An internal server error occurred'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running in production mode on http://localhost:${PORT}`);
});
