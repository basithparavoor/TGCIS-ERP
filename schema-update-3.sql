-- ============================================================================
-- THAIBA PUBLIC SCHOOL (TPS) ERP — Schema Migration Update 3
-- Fixes:
--   1. Role-Level Security (RLS) on `staff` table for Super Admin & Admin
--   2. Missing `user_sessions` table (fixes 404 in schema cache)
--   3. Missing `attendance_records` table (fixes 404 in schema cache)
--   4. Missing academic & operations tables:
--      - academic_classes, academic_subjects, academic_periods, academic_sessions
--      - exam_assessments, timetables, certificates, calendar_events
--      - assignments, student_merits, teacher_substitutions
--   5. Reload schema cache for PostgREST
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Upgrade public.has_role() to recognize super_admin, is_super_admin, and master email
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(roles TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active
      AND (
        role = ANY(roles)
        OR role = 'super_admin'
        OR is_super_admin = true
        OR lower(email) = lower('cmbasith786@gmail.com')
      )
  ) OR (
    lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
  );
$$;

-- Ensure cmbasith786@gmail.com has super_admin permissions in profiles if existing
UPDATE public.profiles
SET is_super_admin = true,
    is_active = true
WHERE lower(email) = lower('cmbasith786@gmail.com');

-- ----------------------------------------------------------------------------
-- 2. Fix Staff table RLS policies
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read staff" ON public.staff;
DROP POLICY IF EXISTS "Allow admin manage staff" ON public.staff;
DROP POLICY IF EXISTS "staff_select" ON public.staff;
DROP POLICY IF EXISTS "staff_manage" ON public.staff;

CREATE POLICY "staff_select" ON public.staff
  FOR SELECT TO authenticated
  USING (
    public.has_role(ARRAY['admin','principal','hr','super_admin'])
    OR user_id = auth.uid()
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
  );

CREATE POLICY "staff_manage" ON public.staff
  FOR ALL TO authenticated
  USING (
    public.has_role(ARRAY['admin','principal','hr','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
  )
  WITH CHECK (
    public.has_role(ARRAY['admin','principal','hr','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
  );

GRANT ALL ON TABLE public.staff TO authenticated;
GRANT SELECT ON TABLE public.staff TO anon;

-- ----------------------------------------------------------------------------
-- 3. Create user_sessions table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    user_name TEXT,
    user_role TEXT,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    logout_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    client_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON public.user_sessions(last_active_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_sessions_select" ON public.user_sessions;
CREATE POLICY "user_sessions_select" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "user_sessions_insert" ON public.user_sessions;
CREATE POLICY "user_sessions_insert" ON public.user_sessions
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_sessions_update" ON public.user_sessions;
CREATE POLICY "user_sessions_update" ON public.user_sessions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_sessions_delete" ON public.user_sessions;
CREATE POLICY "user_sessions_delete" ON public.user_sessions
  FOR DELETE TO authenticated
  USING (public.has_role(ARRAY['admin','principal','super_admin']));

GRANT ALL ON TABLE public.user_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_sessions TO anon;

-- ----------------------------------------------------------------------------
-- 4. Create attendance_records table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    admission_no TEXT,
    grade TEXT,
    section TEXT,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    punch_time TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_class ON public.attendance_records(grade, section);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_records_select" ON public.attendance_records;
CREATE POLICY "attendance_records_select" ON public.attendance_records
  FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "attendance_records_insert" ON public.attendance_records;
CREATE POLICY "attendance_records_insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(ARRAY['admin','principal','coordinator','teacher','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
  );

DROP POLICY IF EXISTS "attendance_records_update" ON public.attendance_records;
CREATE POLICY "attendance_records_update" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (
    public.has_role(ARRAY['admin','principal','coordinator','teacher','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
  )
  WITH CHECK (
    public.has_role(ARRAY['admin','principal','coordinator','teacher','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
  );

DROP POLICY IF EXISTS "attendance_records_delete" ON public.attendance_records;
CREATE POLICY "attendance_records_delete" ON public.attendance_records
  FOR DELETE TO authenticated
  USING (
    public.has_role(ARRAY['admin','principal','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
  );

GRANT ALL ON TABLE public.attendance_records TO authenticated;
GRANT SELECT ON TABLE public.attendance_records TO anon;

-- ----------------------------------------------------------------------------
-- 5. Create Academic & Operations Tables
-- ----------------------------------------------------------------------------

-- academic_classes
CREATE TABLE IF NOT EXISTS public.academic_classes (
    id TEXT PRIMARY KEY,
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    room_no TEXT,
    capacity INTEGER,
    teacher TEXT,
    periods INTEGER,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_classes_select" ON public.academic_classes;
CREATE POLICY "academic_classes_select" ON public.academic_classes FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "academic_classes_manage" ON public.academic_classes;
CREATE POLICY "academic_classes_manage" ON public.academic_classes FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.academic_classes TO authenticated;
GRANT SELECT ON TABLE public.academic_classes TO anon;

-- academic_subjects
CREATE TABLE IF NOT EXISTS public.academic_subjects (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    department TEXT,
    classification TEXT,
    credits NUMERIC,
    lab BOOLEAN DEFAULT false,
    hod TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_subjects_select" ON public.academic_subjects;
CREATE POLICY "academic_subjects_select" ON public.academic_subjects FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "academic_subjects_manage" ON public.academic_subjects;
CREATE POLICY "academic_subjects_manage" ON public.academic_subjects FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.academic_subjects TO authenticated;
GRANT SELECT ON TABLE public.academic_subjects TO anon;

-- academic_periods
CREATE TABLE IF NOT EXISTS public.academic_periods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    period_no INTEGER,
    order_index INTEGER,
    start_time TEXT,
    end_time TEXT,
    duration_mins INTEGER,
    is_break BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.academic_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_periods_select" ON public.academic_periods;
CREATE POLICY "academic_periods_select" ON public.academic_periods FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "academic_periods_manage" ON public.academic_periods;
CREATE POLICY "academic_periods_manage" ON public.academic_periods FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.academic_periods TO authenticated;
GRANT SELECT ON TABLE public.academic_periods TO anon;

-- academic_sessions
CREATE TABLE IF NOT EXISTS public.academic_sessions (
    id TEXT PRIMARY KEY,
    session_name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    terms JSONB DEFAULT '[]',
    is_current BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "academic_sessions_select" ON public.academic_sessions;
CREATE POLICY "academic_sessions_select" ON public.academic_sessions FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "academic_sessions_manage" ON public.academic_sessions;
CREATE POLICY "academic_sessions_manage" ON public.academic_sessions FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.academic_sessions TO authenticated;
GRANT SELECT ON TABLE public.academic_sessions TO anon;

-- exam_assessments
CREATE TABLE IF NOT EXISTS public.exam_assessments (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT,
    admission_no TEXT,
    grade TEXT,
    section TEXT,
    term TEXT,
    academic_year TEXT,
    subject_marks JSONB DEFAULT '{}',
    total_max NUMERIC,
    total_scored NUMERIC,
    percentage NUMERIC,
    overall_grade TEXT,
    attendance_ratio TEXT,
    teacher_remarks TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exam_assessments_student ON public.exam_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_assessments_term ON public.exam_assessments(term, grade);
ALTER TABLE public.exam_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exam_assessments_select" ON public.exam_assessments;
CREATE POLICY "exam_assessments_select" ON public.exam_assessments FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "exam_assessments_manage" ON public.exam_assessments;
CREATE POLICY "exam_assessments_manage" ON public.exam_assessments FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','teacher','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.exam_assessments TO authenticated;
GRANT SELECT ON TABLE public.exam_assessments TO anon;

-- timetables
CREATE TABLE IF NOT EXISTS public.timetables (
    id TEXT PRIMARY KEY,
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    academic_year TEXT,
    schedule JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timetables_select" ON public.timetables;
CREATE POLICY "timetables_select" ON public.timetables FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "timetables_manage" ON public.timetables;
CREATE POLICY "timetables_manage" ON public.timetables FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.timetables TO authenticated;
GRANT SELECT ON TABLE public.timetables TO anon;

-- certificates
CREATE TABLE IF NOT EXISTS public.certificates (
    id TEXT PRIMARY KEY,
    certificate_no TEXT NOT NULL,
    type TEXT NOT NULL,
    student_name TEXT NOT NULL,
    admission_no TEXT,
    grade TEXT,
    details JSONB DEFAULT '{}',
    issued_date DATE,
    issued_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "certificates_select" ON public.certificates;
CREATE POLICY "certificates_select" ON public.certificates FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "certificates_manage" ON public.certificates;
CREATE POLICY "certificates_manage" ON public.certificates FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.certificates TO authenticated;
GRANT SELECT ON TABLE public.certificates TO anon;

-- calendar_events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    target_audience TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "calendar_events_manage" ON public.calendar_events;
CREATE POLICY "calendar_events_manage" ON public.calendar_events FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.calendar_events TO authenticated;
GRANT SELECT ON TABLE public.calendar_events TO anon;

-- assignments (Homework)
CREATE TABLE IF NOT EXISTS public.assignments (
    id TEXT PRIMARY KEY,
    grade TEXT NOT NULL,
    section TEXT,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    assigned_by TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assignments_select" ON public.assignments;
CREATE POLICY "assignments_select" ON public.assignments FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "assignments_manage" ON public.assignments;
CREATE POLICY "assignments_manage" ON public.assignments FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','teacher','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.assignments TO authenticated;
GRANT SELECT ON TABLE public.assignments TO anon;

-- student_merits
CREATE TABLE IF NOT EXISTS public.student_merits (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT,
    admission_no TEXT,
    grade TEXT,
    type TEXT NOT NULL,
    category TEXT,
    points INTEGER DEFAULT 0,
    reason TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_merits_student ON public.student_merits(student_id);
ALTER TABLE public.student_merits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_merits_select" ON public.student_merits;
CREATE POLICY "student_merits_select" ON public.student_merits FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "student_merits_manage" ON public.student_merits;
CREATE POLICY "student_merits_manage" ON public.student_merits FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','teacher','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.student_merits TO authenticated;
GRANT SELECT ON TABLE public.student_merits TO anon;

-- teacher_substitutions
CREATE TABLE IF NOT EXISTS public.teacher_substitutions (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    absent_teacher_name TEXT,
    substitute_teacher_name TEXT,
    period INTEGER,
    grade TEXT,
    section TEXT,
    subject TEXT,
    status TEXT DEFAULT 'assigned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.teacher_substitutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_substitutions_select" ON public.teacher_substitutions;
CREATE POLICY "teacher_substitutions_select" ON public.teacher_substitutions FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "teacher_substitutions_manage" ON public.teacher_substitutions;
CREATE POLICY "teacher_substitutions_manage" ON public.teacher_substitutions FOR ALL TO authenticated USING (
    public.has_role(ARRAY['admin','principal','coordinator','super_admin'])
    OR lower(COALESCE(auth.jwt()->>'email', '')) = lower('cmbasith786@gmail.com')
);
GRANT ALL ON TABLE public.teacher_substitutions TO authenticated;
GRANT SELECT ON TABLE public.teacher_substitutions TO anon;

-- ----------------------------------------------------------------------------
-- 6. Reload schema cache for PostgREST
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
