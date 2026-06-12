-- Borrow applications table (shared across all devices)
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_phone TEXT NOT NULL DEFAULT '',
  student_year_course TEXT NOT NULL DEFAULT '',
  equipment_code TEXT NOT NULL,
  equipment_name TEXT NOT NULL DEFAULT '',
  borrow_date TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  return_target TEXT NOT NULL DEFAULT '',
  photo_attachment TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','RETURNED','BANNED')),
  stage TEXT NOT NULL DEFAULT 'PENDING' CHECK (stage IN ('PENDING','ACTIVE_BORROW','HISTORICAL','RETURN_PENDING','BANNED')),
  is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_returned BOOLEAN NOT NULL DEFAULT FALSE,
  is_return_verified BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  return_submitted_at TIMESTAMPTZ,
  return_verified_at TIMESTAMPTZ,
  return_date_returned TEXT,
  return_overseeing_staff TEXT,
  return_equipment_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equipment rows table
CREATE TABLE IF NOT EXISTS equipment_rows (
  code TEXT PRIMARY KEY,
  no INT NOT NULL,
  last_date_used TEXT NOT NULL DEFAULT '',
  lab_location TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','PENDING PICKUP','BORROWED','RETURN_PENDING','BROKEN','CALIBRATING')),
  verification_by TEXT NOT NULL DEFAULT ''
);

-- Component inventory table
CREATE TABLE IF NOT EXISTS component_inventory (
  name TEXT PRIMARY KEY,
  total_units INT NOT NULL DEFAULT 0,
  units_out INT NOT NULL DEFAULT 0,
  units_on_shelf INT NOT NULL DEFAULT 0
);

-- Blacklisted emails table
CREATE TABLE IF NOT EXISTS blacklisted_emails (
  email TEXT PRIMARY KEY
);

-- Transaction history table
CREATE TABLE IF NOT EXISTS transaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_code TEXT NOT NULL,
  component_type TEXT NOT NULL DEFAULT '',
  student_name TEXT NOT NULL DEFAULT '',
  student_email TEXT NOT NULL DEFAULT '',
  borrow_date TEXT NOT NULL DEFAULT '',
  return_due_time TEXT NOT NULL DEFAULT '',
  borrow_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'RETURNED' CHECK (status IN ('ACTIVE','RETURNED','PENDING_RETURN')),
  returned_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;