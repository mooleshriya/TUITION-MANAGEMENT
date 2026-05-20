# TuitionCenter. — Tuition Center Management System

A full-stack, state-of-the-art **Tuition Center Management System** designed as a database management system (DBMS) mini-project. This system features two equal priorities: a highly robust, fully normalized **MySQL relational database backend** and a premium, responsive **Notion & Linear-inspired website user interface**.

---

## 🏛️ Database Design & Relational Concepts

The database is built on highly normalized tables conforming strictly to **Third Normal Form (3NF)** to completely eliminate data redundancies and transitive functional dependencies. All CRUD operations are executed using **pure raw SQL parameterized queries** on the backend, without any ORM layers.

### Entity-Relationship (ER) Diagram Description

#### 1. Core Entities
*   **Student** (1:N with Enrollment, Fee_Payment, Attendance)
    *   *Attributes*: `student_id` (PK, Auto), `name` (Not Null), `email` (Unique, Not Null), `phone` (Not Null), `address` (Not Null), `dob` (Date, Not Null)
*   **Tutor** (1:N with Batch)
    *   *Attributes*: `tutor_id` (PK, Auto), `name` (Not Null), `email` (Unique, Not Null), `phone` (Not Null), `subject_expertise` (Not Null), `salary` (Decimal, Check >= 0)
*   **Subject** (1:N with Batch)
    *   *Attributes*: `subject_id` (PK, Auto), `subject_name` (Unique, Not Null), `level` (Not Null)
*   **Room** (1:N with Batch)
    *   *Attributes*: `room_id` (PK, Auto), `room_name` (Unique, Not Null), `capacity` (Int, Check > 0)

#### 2. Relational Junctions & Logs
*   **Batch** (1:N with Enrollment, Attendance)
    *   *Attributes*: `batch_id` (PK, Auto), `subject_id` (FK -> Subject), `tutor_id` (FK -> Tutor), `room_id` (FK -> Room), `timings` (Not Null), `days` (Not Null), `max_strength` (Int, Check > 0)
*   **Enrollment** (M:N Relationship junction between Student and Batch)
    *   *Attributes*: `enrollment_id` (PK, Auto), `student_id` (FK -> Student, Cascade Delete), `batch_id` (FK -> Batch, Cascade Delete), `join_date` (Date, Default Current)
    *   *Constraints*: `UNIQUE(student_id, batch_id)` to prevent double registrations.
*   **Attendance** (1:N Relationship with Student & Batch)
    *   *Attributes*: `attendance_id` (PK, Auto), `student_id` (FK -> Student, Cascade Delete), `batch_id` (FK -> Batch, Cascade Delete), `date` (Date, Not Null), `status` (Enum: 'Present', 'Absent', 'Late')
    *   *Constraints*: `UNIQUE(student_id, batch_id, date)` to prevent multiple listings per session.
*   **Fee_Payment** (1:N Relationship between Student and Fees)
    *   *Attributes*: `payment_id` (PK, Auto), `student_id` (FK -> Student, Cascade Delete), `amount` (Decimal, Check >= 0), `payment_date` (Date, Nullable), `due_date` (Date, Not Null), `status` (Enum: 'Paid', 'Pending', 'Overdue')

---

## ⚡ Advanced DBMS Concepts Implemented

1.  **Normalization (3NF)**: Redundancies are eliminated. For instance, student details reside exclusively in `Student`; the `Enrollment` junction table bridges students to `Batch` solely using foreign key indices. Subject metadata is kept in `Subject` rather than duplicated in batch files.
2.  **Referential Constraints**: Strict foreign key constraints with `ON DELETE CASCADE` ensure that deleting a student cleanly removes corresponding logs in attendance, fees, and enrollments, preserving database integrity. `ON DELETE RESTRICT` protects critical class-lookup anchors (tutors, subjects, rooms).
3.  **Indexes (Performance)**: High-speed querying indices are configured on heavily structured fields (`student_id`, `batch_id`, `due_date`) to optimize table JOIN operations and speed up execution under scale.
4.  **Database Views**: The view `student_dashboard_view` automatically aggregates student data, dynamically calculating:
    *   **Attendance percentage**: `(Present + Late sessions) / (Total sessions) * 100` (handling division-by-zero errors gracefully using `NULLIF`).
    *   **Invoicing Tallies**: SUM aggregates counting each student's Paid, Pending, and Overdue bills.
    *   **Overall status representation**: Group summaries flagging whether a student has outstanding obligations.
5.  **SQL Database Triggers**: Triggers `trg_fee_insert` and `trg_fee_update` validate the current calendar date (`CURDATE()`) against the invoice's due date. If an insert or update occurs on a bill that is past its due date while still flagged as `'Pending'`, the trigger overrides the record to `'Overdue'` automatically.
6.  **SQL Stored Procedure**: The `enroll_student(IN student_id, IN batch_id)` procedure manages student admissions safely:
    *   Validates whether a student is already enrolled.
    *   Computes current enrollment strength in the selected batch.
    *   Compares the value against the batch's `max_strength` limit.
    *   **Raises a database-level error signal** (`SQLSTATE '45000'`) containing a custom warning message if capacity is exhausted, preventing illegal inserts.

---

## 🎨 Premium Notion-Style Web Design

The frontend website is designed with a sleek, minimalist Notion/Linear layout prioritizing clarity, aesthetics, and high responsiveness:
*   **Dark Navy/Slate Sidebar**: Styled using `#1e293b` with beautifully clean Lucide icons.
*   **Interactive Cards**: Clean layouts with subtle border lines, rounded margins, and dynamic micro-animations on hover.
*   **Modals Overlay**: Standard form additions use beautiful background-blurring overlays (`backdrop-filter: blur(4px)`) instead of heavy page-reloads.
*   **Real-time Analytics**: Built with client-side **Chart.js** graphing collection trends and attendance distribution donut segments.
*   **Roster controls**: Renders live capacity warning banners when selecting near-full classes in enrollment dropdowns, and provides one-click `Present/Absent/Late` toggles in attendance logs.

---

## 🚀 Setup & Launch Instructions

### Prerequisites
*   [Node.js](https://nodejs.org/) (LTS recommended)
*   [MySQL Server](https://dev.mysql.com/downloads/installer/) running locally

### Step 1: Install Dependencies
Navigate to the project workspace and install the node dependencies:
```bash
npm install
```

### Step 2: Initialize the Database
1.  Log in to your MySQL terminal command line:
    ```bash
    mysql -u root -p
    ```
2.  Import the SQL schema script which automatically configures the database, tables, triggers, stored procedures, index optimizations, views, and inserts rich seed records:
    ```sql
    source schema.sql;
    ```

### Step 3: Configure Environment Variables
Verify the database connection credentials in the local `.env` file:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=tuition_center_db
```

### Step 4: Run the Application
Start the Node.js server using development nodemon hot-reloads:
```bash
npm run start
```
Alternatively, for hot-reloading development:
```bash
npm run dev
```

The application console will log:
```text
Connected to MySQL database pool successfully.
Synchronized fee payment overdue statuses.
Server is running in production mode on http://localhost:3000
```

### Step 5: Access the Web Interface
Open your web browser and navigate to:
```text
http://localhost:3000
```
You can now click through the different navigation links (Dashboard, Students, Tutors, Batches, Enrollments, Attendance, Fees, and Reports) and interact with the system!
