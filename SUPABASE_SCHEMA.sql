-- Library System Database Schema
-- Run this in Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    full_name TEXT NOT NULL,
    email_library TEXT NOT NULL UNIQUE,
    grade TEXT,
    roll_id TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    parent_phone TEXT,
    is_responsible BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    password TEXT,
    last_password_change TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT,
    category TEXT,
    subcategory TEXT,
    rate TEXT,
    shelf_location TEXT,
    language TEXT DEFAULT 'English',
    price TEXT,
    cover_image_url TEXT,
    isbn TEXT,
    pages TEXT,
    description TEXT,
    how_much_value TEXT,
    which_value TEXT,
    archive_nomenclature TEXT,
    shelf TEXT,
    row TEXT,
    book_id TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'lost')),
    current_borrower_id UUID REFERENCES students(id),
    custom_fields JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create library_logs table (minimal version for compatibility with existing database)
CREATE TABLE IF NOT EXISTS library_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id),
    book_id UUID NOT NULL REFERENCES books(id),
    student_name TEXT NOT NULL,
    book_title TEXT NOT NULL,
    borrow_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    return_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    issued_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create library_reservations table
CREATE TABLE IF NOT EXISTS library_reservations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id),
    book_id UUID NOT NULL REFERENCES books(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);

-- Create library_settings table
CREATE TABLE IF NOT EXISTS library_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    categories JSONB DEFAULT '["General", "Reference", "الْكُتُب"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO library_settings (id, categories)
VALUES ('global', '["General", "Reference", "الْكُتُب"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_library_logs_student_id ON library_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_library_logs_book_id ON library_logs(book_id);
CREATE INDEX IF NOT EXISTS idx_library_logs_return_date ON library_logs(return_date);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_library_reservations_status ON library_reservations(status);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all access for authenticated users - adjust as needed for production)
CREATE POLICY "Enable all access for authenticated users" ON students
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON books
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON library_logs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON library_reservations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON library_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Optional: ALTER TABLE statements to add missing columns if you want them
-- Uncomment and run these if you want to add condition_notes column to library_logs:
-- ALTER TABLE library_logs ADD COLUMN IF NOT EXISTS condition_notes TEXT;
