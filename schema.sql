-- Tuition Center Management System Schema Definition

CREATE DATABASE IF NOT EXISTS tuition_center_db;
USE tuition_center_db;

-- -----------------------------------------------------
-- TABLE Subject (3NF)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Subject (
    subject_id INT AUTO_INCREMENT,
    subject_name VARCHAR(100) NOT NULL,
    level VARCHAR(50) NOT NULL,
    CONSTRAINT pk_subject PRIMARY KEY (subject_id),
    CONSTRAINT uq_subject_name UNIQUE (subject_name)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLE Tutor (3NF)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Tutor (
    tutor_id INT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    subject_expertise VARCHAR(100) NOT NULL,
    salary DECIMAL(10, 2) NOT NULL,
    CONSTRAINT pk_tutor PRIMARY KEY (tutor_id),
    CONSTRAINT uq_tutor_email UNIQUE (email),
    CONSTRAINT chk_tutor_salary CHECK (salary >= 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLE Room (3NF)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Room (
    room_id INT AUTO_INCREMENT,
    room_name VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    CONSTRAINT pk_room PRIMARY KEY (room_id),
    CONSTRAINT uq_room_name UNIQUE (room_name),
    CONSTRAINT chk_room_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLE Batch (3NF)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Batch (
    batch_id INT AUTO_INCREMENT,
    subject_id INT NOT NULL,
    tutor_id INT NOT NULL,
    room_id INT NOT NULL,
    timings VARCHAR(50) NOT NULL,
    days VARCHAR(100) NOT NULL,
    max_strength INT NOT NULL,
    CONSTRAINT pk_batch PRIMARY KEY (batch_id),
    CONSTRAINT fk_batch_subject FOREIGN KEY (subject_id) REFERENCES Subject(subject_id) ON DELETE RESTRICT,
    CONSTRAINT fk_batch_tutor FOREIGN KEY (tutor_id) REFERENCES Tutor(tutor_id) ON DELETE RESTRICT,
    CONSTRAINT fk_batch_room FOREIGN KEY (room_id) REFERENCES Room(room_id) ON DELETE RESTRICT,
    CONSTRAINT chk_batch_max_strength CHECK (max_strength > 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLE Student (3NF)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Student (
    student_id INT AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    dob DATE NOT NULL,
    CONSTRAINT pk_student PRIMARY KEY (student_id),
    CONSTRAINT uq_student_email UNIQUE (email)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLE Enrollment (3NF - M:N junction between Student & Batch)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Enrollment (
    enrollment_id INT AUTO_INCREMENT,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    join_date DATE NOT NULL,
    CONSTRAINT pk_enrollment PRIMARY KEY (enrollment_id),
    CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollment_batch FOREIGN KEY (batch_id) REFERENCES Batch(batch_id) ON DELETE CASCADE,
    CONSTRAINT uq_student_batch UNIQUE (student_id, batch_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLE Attendance (3NF)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Attendance (
    attendance_id INT AUTO_INCREMENT,
    student_id INT NOT NULL,
    batch_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late') NOT NULL,
    CONSTRAINT pk_attendance PRIMARY KEY (attendance_id),
    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_batch FOREIGN KEY (batch_id) REFERENCES Batch(batch_id) ON DELETE CASCADE,
    CONSTRAINT uq_student_batch_date UNIQUE (student_id, batch_id, date)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLE Fee_Payment (3NF)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Fee_Payment (
    payment_id INT AUTO_INCREMENT,
    student_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE DEFAULT NULL,
    due_date DATE NOT NULL,
    status ENUM('Paid', 'Pending', 'Overdue') NOT NULL DEFAULT 'Pending',
    CONSTRAINT pk_fee_payment PRIMARY KEY (payment_id),
    CONSTRAINT fk_fee_payment_student FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE,
    CONSTRAINT chk_fee_amount CHECK (amount >= 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- INDEXES FOR FREQUENTLY QUERIED COLUMNS
-- -----------------------------------------------------
CREATE INDEX idx_enrollment_student ON Enrollment(student_id);
CREATE INDEX idx_enrollment_batch ON Enrollment(batch_id);
CREATE INDEX idx_attendance_student ON Attendance(student_id);
CREATE INDEX idx_attendance_batch ON Attendance(batch_id);
CREATE INDEX idx_fee_payment_student ON Fee_Payment(student_id);
CREATE INDEX idx_fee_payment_due_date ON Fee_Payment(due_date);

-- -----------------------------------------------------
-- TRIGGERS TO AUTO-MARK OVERDUE STATUS
-- -----------------------------------------------------
DELIMITER //

CREATE TRIGGER trg_fee_insert
BEFORE INSERT ON Fee_Payment
FOR EACH ROW
BEGIN
    IF NEW.due_date < CURDATE() AND NEW.status = 'Pending' THEN
        SET NEW.status = 'Overdue';
    END IF;
END //

CREATE TRIGGER trg_fee_update
BEFORE UPDATE ON Fee_Payment
FOR EACH ROW
BEGIN
    IF NEW.due_date < CURDATE() AND NEW.status = 'Pending' THEN
        SET NEW.status = 'Overdue';
    END IF;
END //

DELIMITER ;

-- -----------------------------------------------------
-- STORED PROCEDURE FOR ENROLLING STUDENT WITH CAPACITY CHECK
-- -----------------------------------------------------
DELIMITER //

CREATE PROCEDURE enroll_student(IN p_student_id INT, IN p_batch_id INT)
BEGIN
    DECLARE v_current_strength INT;
    DECLARE v_max_strength INT;
    DECLARE v_already_enrolled INT;
    
    -- Check if student is already enrolled in this batch
    SELECT COUNT(*) INTO v_already_enrolled 
    FROM Enrollment 
    WHERE student_id = p_student_id AND batch_id = p_batch_id;
    
    IF v_already_enrolled > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Student is already enrolled in this batch';
    ELSE
        -- Get current batch size
        SELECT COUNT(*) INTO v_current_strength 
        FROM Enrollment 
        WHERE batch_id = p_batch_id;
        
        -- Get batch max capacity
        SELECT max_strength INTO v_max_strength 
        FROM Batch 
        WHERE batch_id = p_batch_id;
        
        IF v_current_strength >= v_max_strength THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Batch capacity limit reached. Cannot enroll student.';
        ELSE
            -- Perform Enrollment
            INSERT INTO Enrollment (student_id, batch_id, join_date) 
            VALUES (p_student_id, p_batch_id, CURDATE());
        END IF;
    END IF;
END //

DELIMITER ;

-- -----------------------------------------------------
-- VIEW: student_dashboard_view
-- -----------------------------------------------------
CREATE OR REPLACE VIEW student_dashboard_view AS
SELECT 
    s.student_id,
    s.name AS student_name,
    s.email AS student_email,
    -- Calculate attendance percentage
    ROUND(
        COALESCE(
            (SUM(CASE WHEN a.status IN ('Present', 'Late') THEN 1 ELSE 0 END) * 100.0) / 
            NULLIF(COUNT(a.attendance_id), 0), 
            100.0
        ), 
        1
    ) AS attendance_percentage,
    -- Summary of fees
    SUM(CASE WHEN f.status = 'Paid' THEN 1 ELSE 0 END) AS paid_fees_count,
    SUM(CASE WHEN f.status = 'Pending' THEN 1 ELSE 0 END) AS pending_fees_count,
    SUM(CASE WHEN f.status = 'Overdue' THEN 1 ELSE 0 END) AS overdue_fees_count,
    -- Overall status representation
    CASE 
        WHEN SUM(CASE WHEN f.status = 'Overdue' THEN 1 ELSE 0 END) > 0 THEN 'Overdue'
        WHEN SUM(CASE WHEN f.status = 'Pending' THEN 1 ELSE 0 END) > 0 THEN 'Pending'
        ELSE 'Paid'
    END AS overall_fee_status
FROM Student s
LEFT JOIN Enrollment e ON s.student_id = e.student_id
LEFT JOIN Attendance a ON s.student_id = a.student_id AND e.batch_id = a.batch_id
LEFT JOIN Fee_Payment f ON s.student_id = f.student_id
GROUP BY s.student_id, s.name, s.email;

-- -----------------------------------------------------
-- SEED DATA (At least 20 records per table)
-- -----------------------------------------------------

-- 1. Insert Subjects (20 rows)
INSERT INTO Subject (subject_name, level) VALUES
('Mathematics', 'Advanced'),
('Physics', 'Intermediate'),
('Chemistry', 'Intermediate'),
('English Literature', 'Beginner'),
('Computer Science', 'Advanced'),
('Biology', 'Advanced'),
('History', 'Intermediate'),
('Geography', 'Beginner'),
('Economics', 'Advanced'),
('Spanish', 'Beginner'),
('French', 'Beginner'),
('Art & Design', 'Beginner'),
('Statistics', 'Advanced'),
('Calculus', 'Advanced'),
('Organic Chemistry', 'Advanced'),
('Mechanics', 'Advanced'),
('Civics', 'Beginner'),
('Creative Writing', 'Intermediate'),
('Music Theory', 'Beginner'),
('World History', 'Intermediate');

-- 2. Insert Tutors (20 rows)
INSERT INTO Tutor (name, email, phone, subject_expertise, salary) VALUES
('Dr. Alan Turing', 'alan.turing@tuition.com', '+1234567890', 'Computer Science', 7500.00),
('Prof. Marie Curie', 'marie.curie@tuition.com', '+1234567891', 'Chemistry', 6800.00),
('Albert Einstein', 'albert.einstein@tuition.com', '+1234567892', 'Physics', 8000.00),
('Isaac Newton', 'isaac.newton@tuition.com', '+1234567893', 'Mathematics', 7200.00),
('Charles Darwin', 'charles.darwin@tuition.com', '+1234567894', 'Biology', 6500.00),
('Ada Lovelace', 'ada.lovelace@tuition.com', '+1234567895', 'Computer Science', 7800.00),
('Galileo Galilei', 'galileo.galilei@tuition.com', '+1234567896', 'Physics', 7000.00),
('Nikola Tesla', 'nikola.tesla@tuition.com', '+1234567897', 'Physics', 7300.00),
('Stephen Hawking', 'stephen.hawking@tuition.com', '+1234567898', 'Physics', 8500.00),
('Jane Austen', 'jane.austen@tuition.com', '+1234567899', 'English Literature', 5500.00),
('William Shakespeare', 'william.s@tuition.com', '+1234567900', 'English Literature', 6200.00),
('Adam Smith', 'adam.smith@tuition.com', '+1234567901', 'Economics', 7100.00),
('Pythagoras of Samos', 'pythagoras@tuition.com', '+1234567902', 'Mathematics', 6400.00),
('Gregor Mendel', 'gregor.mendel@tuition.com', '+1234567903', 'Biology', 5800.00),
('Jane Goodall', 'jane.goodall@tuition.com', '+1234567904', 'Biology', 6000.00),
('Richard Feynman', 'richard.feynman@tuition.com', '+1234567905', 'Physics', 7900.00),
('Grace Hopper', 'grace.hopper@tuition.com', '+1234567906', 'Computer Science', 7600.00),
('Thomas Edison', 'thomas.edison@tuition.com', '+1234567907', 'Chemistry', 5200.00),
('Aristotle of Athens', 'aristotle@tuition.com', '+1234567908', 'History', 6100.00),
('Leonardo da Vinci', 'leonardo.vinci@tuition.com', '+1234567909', 'Art & Design', 9000.00);

-- 3. Insert Rooms (20 rows)
INSERT INTO Room (room_name, capacity) VALUES
('Alpha Room', 15),
('Beta Lab', 8),
('Gamma Hall', 30),
('Sigma Study', 4),
('Delta Classroom', 20),
('Epsilon Lab', 12),
('Zeta Lecture Hall', 40),
('Eta Room', 15),
('Theta Seminar', 10),
('Iota Den', 6),
('Kappa Studio', 12),
('Lambda Lab', 16),
('Mu Classroom', 25),
('Nu Study', 8),
('Xi Space', 15),
('Omicron Hall', 35),
('Pi Room', 10),
('Rho Studio', 18),
('Tau Lab', 14),
('Omega Hall', 50);

-- 4. Insert Batches (20 rows)
INSERT INTO Batch (subject_id, tutor_id, room_id, timings, days, max_strength) VALUES
(1, 4, 1, '15:00 - 17:00', 'Monday, Wednesday', 15),
(2, 3, 3, '17:30 - 19:30', 'Monday, Wednesday', 20),
(3, 2, 1, '16:00 - 18:00', 'Tuesday, Thursday', 12),
(5, 1, 2, '14:00 - 16:00', 'Friday', 8),
(4, 11, 4, '09:00 - 11:00', 'Saturday', 4),
(6, 5, 5, '10:00 - 12:00', 'Monday, Wednesday', 10),
(7, 19, 13, '13:00 - 15:00', 'Tuesday, Thursday', 15),
(8, 19, 15, '11:00 - 13:00', 'Saturday', 15),
(9, 12, 13, '16:00 - 18:00', 'Monday, Wednesday', 15),
(10, 10, 17, '14:00 - 16:00', 'Tuesday, Thursday', 8),
(11, 11, 10, '15:30 - 17:30', 'Monday, Wednesday', 6),
(12, 20, 11, '09:00 - 11:00', 'Friday', 12),
(13, 13, 18, '10:00 - 12:00', 'Saturday', 18),
(14, 13, 18, '13:30 - 15:30', 'Tuesday, Thursday', 15),
(15, 2, 12, '16:30 - 18:30', 'Monday, Wednesday', 8),
(16, 16, 19, '14:00 - 16:00', 'Friday', 12),
(17, 19, 14, '09:30 - 11:30', 'Saturday', 10),
(18, 11, 17, '16:00 - 18:00', 'Tuesday, Thursday', 15),
(19, 20, 18, '11:00 - 13:00', 'Friday', 20),
(20, 20, 20, '15:00 - 17:00', 'Saturday', 15);

-- 5. Insert Students (20 rows)
INSERT INTO Student (name, email, phone, address, dob) VALUES
('John Doe', 'john.doe@gmail.com', '+1987654321', '123 Baker Street, London', '2010-05-15'),
('Jane Smith', 'jane.smith@gmail.com', '+1987654322', '456 Oak Avenue, Manchester', '2011-08-20'),
('Robert Johnson', 'robert.j@gmail.com', '+1987654323', '789 Pine Road, Birmingham', '2009-12-05'),
('Emily Davis', 'emily.d@gmail.com', '+1987654324', '101 Maple Drive, Leeds', '2010-03-25'),
('Michael Brown', 'michael.b@gmail.com', '+1987654325', '202 Birch Lane, Bristol', '2011-11-12'),
('William Wilson', 'will.w@gmail.com', '+1987654326', '303 Cedar Court, Sheffield', '2009-06-18'),
('David Jones', 'david.j@gmail.com', '+1987654327', '404 Elm Way, Liverpool', '2010-09-30'),
('Sarah Miller', 'sarah.m@gmail.com', '+1987654328', '505 Walnut Street, Newcastle', '2011-02-14'),
('James Taylor', 'james.t@gmail.com', '+1987654329', '606 Ash Boulevard, Nottingham', '2009-07-22'),
('Linda Thomas', 'linda.t@gmail.com', '+1987654330', '707 Cherry Close, Leicester', '2010-10-05'),
('Alice Johnson', 'alice.j@gmail.com', '+1987654331', '808 Cedar Street, Cambridge', '2011-04-12'),
('Bob Vance', 'bob.vance@gmail.com', '+1987654332', '909 Pine Avenue, Oxford', '2010-01-20'),
('Charlie Green', 'charlie.g@gmail.com', '+1987654333', '111 Oak Road, London', '2009-11-15'),
('Diana Prince', 'diana.p@gmail.com', '+1987654334', '222 Maple Way, London', '2010-06-30'),
('Bruce Wayne', 'bruce.wayne@gmail.com', '+1987654335', '1007 Mountain Drive, Gotham', '2009-02-19'),
('Clark Kent', 'clark.kent@gmail.com', '+1987654336', '344 Clinton Street, Metropolis', '2010-04-18'),
('Peter Parker', 'peter.parker@gmail.com', '+1987654337', '20 Ingram Street, Queens NY', '2011-08-10'),
('Tony Stark', 'tony.stark@gmail.com', '+1987654338', '10880 Malibu Point, California', '2009-05-29'),
('Steve Rogers', 'steve.rogers@gmail.com', '+1987654339', '569 Lefferts Ave, Brooklyn NY', '2010-07-04'),
('Natasha Romanoff', 'natasha.r@gmail.com', '+1987654340', '12 Wall Street, New York NY', '2010-12-22');

-- 6. Insert Enrollments (20 rows)
INSERT INTO Enrollment (student_id, batch_id, join_date) VALUES
(1, 1, '2026-05-01'),
(2, 1, '2026-05-01'),
(3, 1, '2026-05-02'),
(4, 2, '2026-05-01'),
(5, 2, '2026-05-01'),
(6, 2, '2026-05-03'),
(7, 3, '2026-05-01'),
(8, 3, '2026-05-02'),
(9, 4, '2026-05-01'),
(10, 4, '2026-05-01'),
(11, 5, '2026-05-01'),
(12, 6, '2026-05-01'),
(13, 7, '2026-05-01'),
(14, 8, '2026-05-02'),
(15, 9, '2026-05-01'),
(16, 10, '2026-05-01'),
(17, 11, '2026-05-02'),
(18, 12, '2026-05-01'),
(19, 13, '2026-05-01'),
(20, 14, '2026-05-01');

-- 7. Insert Attendance Records (20 rows)
INSERT INTO Attendance (student_id, batch_id, date, status) VALUES
(1, 1, '2026-05-10', 'Present'),
(2, 1, '2026-05-10', 'Present'),
(3, 1, '2026-05-10', 'Absent'),
(1, 1, '2026-05-17', 'Present'),
(2, 1, '2026-05-17', 'Late'),
(3, 1, '2026-05-17', 'Present'),
(4, 2, '2026-05-10', 'Present'),
(5, 2, '2026-05-10', 'Absent'),
(6, 2, '2026-05-10', 'Present'),
(7, 3, '2026-05-11', 'Present'),
(8, 3, '2026-05-11', 'Present'),
(9, 4, '2026-05-12', 'Present'),
(10, 4, '2026-05-12', 'Late'),
(11, 5, '2026-05-13', 'Present'),
(12, 6, '2026-05-14', 'Present'),
(13, 7, '2026-05-15', 'Absent'),
(14, 8, '2026-05-16', 'Present'),
(15, 9, '2026-05-17', 'Late'),
(16, 10, '2026-05-18', 'Present'),
(17, 11, '2026-05-19', 'Present');

-- 8. Insert Fee Payments (20 rows)
INSERT INTO Fee_Payment (student_id, amount, payment_date, due_date, status) VALUES
(1, 350.00, '2026-05-02', '2026-05-10', 'Paid'),
(2, 350.00, NULL, '2026-05-28', 'Pending'),
(3, 350.00, NULL, '2026-05-05', 'Overdue'),
(4, 400.00, '2026-05-04', '2026-05-10', 'Paid'),
(5, 400.00, NULL, '2026-05-28', 'Pending'),
(6, 400.00, NULL, '2026-05-01', 'Overdue'),
(7, 300.00, '2026-05-03', '2026-05-12', 'Paid'),
(8, 300.00, NULL, '2026-05-30', 'Pending'),
(9, 450.00, '2026-05-02', '2026-05-10', 'Paid'),
(10, 450.00, NULL, '2026-05-01', 'Overdue'),
(11, 250.00, '2026-05-01', '2026-05-10', 'Paid'),
(12, 300.00, NULL, '2026-05-29', 'Pending'),
(13, 320.00, NULL, '2026-05-02', 'Overdue'),
(14, 280.00, '2026-05-03', '2026-05-15', 'Paid'),
(15, 400.00, NULL, '2026-05-30', 'Pending'),
(16, 350.00, NULL, '2026-05-01', 'Overdue'),
(17, 300.00, '2026-05-04', '2026-05-14', 'Paid'),
(18, 450.00, NULL, '2026-05-28', 'Pending'),
(19, 500.00, NULL, '2026-05-03', 'Overdue'),
(20, 380.00, '2026-05-02', '2026-05-12', 'Paid');

