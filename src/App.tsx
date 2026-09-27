import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, type PageId } from '@/components/Sidebar';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { TeachersPage } from '@/pages/TeachersPage';
import { CoursesPage } from '@/pages/CoursesPage';
import { AttendancePage } from '@/pages/AttendancePage';
import { GradesPage } from '@/pages/GradesPage';
import { ReportCardsPage } from '@/pages/ReportCardsPage';
import { FeesPage } from '@/pages/FeesPage';
import { CheckInPage } from '@/pages/CheckInPage';
import { StudentAttendancePage } from '@/pages/StudentAttendancePage';

const normalizeEmail = (value?: string | null) => (value ?? '').trim().toLowerCase();

function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [role, setRole] = useState<'admin' | 'teacher' | null>(
    () => (localStorage.getItem('sarp_role') as 'admin' | 'teacher') || null
  );
  const [teacherEmail, setTeacherEmail] = useState<string | null>(
    () => normalizeEmail(localStorage.getItem('sarp_teacher_email')) || null
  );
  const [teacherName, setTeacherName] = useState<string | null>(
    () => localStorage.getItem('sarp_teacher_name') || null
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!role) {
    return (
      <LoginPage
        onLogin={(r, email, name) => {
          setRole(r);
          localStorage.setItem('sarp_role', r);
          if (r === 'admin') {
            setTeacherEmail(null);
            setTeacherName(null);
            localStorage.removeItem('sarp_teacher_email');
            localStorage.removeItem('sarp_teacher_name');
          } else if (email) {
            const normalizedEmail = normalizeEmail(email);
            setTeacherEmail(normalizedEmail);
            setTeacherName(name ?? null);
            localStorage.setItem('sarp_teacher_email', normalizedEmail);
            if (name) localStorage.setItem('sarp_teacher_name', name);
          }
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 print:bg-white">
      <Sidebar
        current={page}
        onNavigate={setPage}
        className="print:hidden"
        role={role}
        teacherName={teacherName}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <main className="min-w-0 flex-1 overflow-x-auto overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 print:max-w-none print:p-0">
          <div className="mb-5 flex items-center gap-3 md:hidden print:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-semibold text-slate-700">SARP Educational Complex</span>
          </div>
          {page === 'dashboard' && <DashboardPage />}
          {page === 'students' && <StudentsPage teacherEmail={teacherEmail} />}
          {page === 'teachers' && role === 'admin' && <TeachersPage />}
          {page === 'courses' && <CoursesPage />}
          {page === 'attendance' && role === 'admin' && <AttendancePage />}
{page === 'student-attendance' && role === 'teacher' && <StudentAttendancePage teacherEmail={teacherEmail} />}
          {page === 'grades' && <GradesPage teacherEmail={teacherEmail} />}
          {page === 'report-cards' && <ReportCardsPage teacherEmail={teacherEmail} />}
          {page === 'fees' && role === 'admin' && <FeesPage teacherEmail={teacherEmail} />}
          {page === 'checkin' && role === 'teacher' && <CheckInPage teacherEmail={teacherEmail} />}
        </div>
      </main>
    </div>
  );
}

export default App;
