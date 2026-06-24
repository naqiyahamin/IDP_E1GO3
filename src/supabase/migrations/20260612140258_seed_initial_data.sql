-- Seed equipment rows
INSERT INTO equipment_rows (code, no, last_date_used, lab_location, status, verification_by) VALUES
('AGT567', 1, '2026-05-10', 'P04 LEVEL 3', 'AVAILABLE', 'RAZALI AHMAD'),
('AGT568', 2, '2026-05-09', 'P04 LEVEL 3', 'AVAILABLE', 'RAZALI AHMAD'),
('AGT569', 3, '2026-05-08', 'P03 LEVEL 2', 'BORROWED', 'NORHAYATI IDRIS'),
('AGT570', 4, '2026-05-11', 'P04 LEVEL 3', 'AVAILABLE', 'RAZALI AHMAD'),
('AGT571', 5, '2026-05-07', 'P03 LEVEL 2', 'AVAILABLE', 'NORHAYATI IDRIS'),
('AGT572', 6, '2026-05-06', 'P05 LEVEL 1', 'AVAILABLE', 'KAMARUZAMAN YUSOF'),
('AGT573', 7, '2026-05-05', 'P05 LEVEL 1', 'RETURN_PENDING', 'KAMARUZAMAN YUSOF'),
('AGT574', 8, '2026-05-12', 'P04 LEVEL 3', 'AVAILABLE', 'RAZALI AHMAD')
ON CONFLICT (code) DO NOTHING;

-- Seed component inventory
INSERT INTO component_inventory (name, total_units, units_out, units_on_shelf) VALUES
('Digital Oscilloscope', 8, 2, 6),
('Arduino Uno', 12, 3, 9),
('ESP32 Microcontroller', 10, 1, 9),
('Ultrasonic Sensor', 20, 4, 16),
('Digital Multimeter', 15, 2, 13)
ON CONFLICT (name) DO NOTHING;

-- Seed blacklisted emails
INSERT INTO blacklisted_emails (email) VALUES ('badstudent@utm.my')
ON CONFLICT (email) DO NOTHING;

-- Seed transaction history
INSERT INTO transaction_history (id, equipment_code, component_type, student_name, student_email, borrow_date, return_due_time, borrow_timestamp, status, returned_date) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AGT566', 'Digital Oscilloscope', 'NAQIYAH BINTI AHMAD', 'naqiyah@graduate.utm.my', '2026-04-15', '16:00', '2026-04-15T08:30:00Z', 'RETURNED', '2026-04-15'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'ARD-01', 'Arduino Uno', 'AMIRUL BIN MOHD', 'amirul@graduate.utm.my', '2026-05-01', '16:00', '2026-05-01T09:15:00Z', 'RETURNED', '2026-05-02')
ON CONFLICT (id) DO NOTHING;

-- Seed initial applications
INSERT INTO applications (id, student_email, student_name, student_phone, student_year_course, equipment_code, equipment_name, borrow_date, duration, return_target, status, stage, is_blacklisted, is_approved, is_returned, is_return_verified, submitted_at, approved_at, processed_at, return_submitted_at, return_verified_at, return_date_returned, return_overseeing_staff, return_equipment_image) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'divya@graduate.utm.my', 'DIVYA A/P RAMAN', '0187654321', '1/SKEEH', 'AGT570', 'Digital Oscilloscope', '2026-06-03', '3 hours', '17:00', 'PENDING', 'PENDING', false, false, false, false, '2026-06-03T09:30:00Z', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02', 'amirul@graduate.utm.my', 'AMIRUL BIN MOHD', '0176543210', '2/SKEEH', 'AGT569', 'Digital Oscilloscope', '2026-06-02', '2 hours', '16:00', 'APPROVED', 'ACTIVE_BORROW', false, true, false, false, '2026-06-02T10:15:00Z', '2026-06-02T10:45:00Z', '2026-06-02T10:45:00Z', NULL, NULL, NULL, NULL, NULL),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'farhana@graduate.utm.my', 'FARHANA BINTI ZULKIFLI', '0195555555', '4/SKELH', 'AGT573', 'Digital Oscilloscope', '2026-06-01', '1.5 hours', '15:30', 'PENDING', 'RETURN_PENDING', false, true, true, false, '2026-06-01T11:00:00Z', '2026-06-01T11:30:00Z', '2026-06-01T11:30:00Z', '2026-06-03T14:20:00Z', NULL, '2026-06-03', 'RAZALI AHMAD', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'naqiyah@graduate.utm.my', 'NAQIYAH BINTI AHMAD', '0198765432', '3/SKELH', 'AGT567', 'Digital Oscilloscope', '2026-05-29', '2 hours', '16:00', 'RETURNED', 'HISTORICAL', false, true, true, true, '2026-05-29T08:00:00Z', '2026-05-29T08:30:00Z', '2026-05-29T08:30:00Z', '2026-05-30T13:45:00Z', '2026-05-30T14:15:00Z', '2026-05-30', 'AMINAH SULAIMAN', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
ON CONFLICT (id) DO NOTHING;