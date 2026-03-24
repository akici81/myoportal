-- Create leave_requests table
CREATE TABLE public.leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instructor_id UUID REFERENCES public.instructors(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type TEXT NOT NULL, -- 'annual', 'sick', 'excuse', 'conference'
    reason TEXT,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Instructors can view their own leave requests"
  ON public.leave_requests FOR SELECT
  USING (
    instructor_id IN (
        SELECT id FROM public.instructors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and Secretaries can view all leave requests"
  ON public.leave_requests FOR SELECT
  USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('system_admin', 'sekreter', 'mudur', 'mudur_yardimcisi')
    )
  );

CREATE POLICY "Instructors can insert leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (
    instructor_id IN (
        SELECT id FROM public.instructors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins can update leave requests"
  ON public.leave_requests FOR UPDATE
  USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('system_admin', 'sekreter', 'mudur', 'mudur_yardimcisi')
    )
  );
