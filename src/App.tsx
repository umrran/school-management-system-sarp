import { useState } from 'react';
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
    <div className="flex h-screen bg-slate-50 text-slate-900 print:bg-white">
      <Sidebar current={page} onNavigate={setPage} className="print:hidden" role={role} teacherName={teacherName} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 print:max-w-none print:p-0">
          {page === 'dashboard' && <DashboardPage />}
          {page === 'students' && <StudentsPage teacherEmail={teacherEmail} />}
          {page === 'teachers' && role === 'admin' && <TeachersPage />}
          {page === 'courses' && <CoursesPage />}
          {page === 'attendance' && <AttendancePage />}
          {page === 'grades' && <GradesPage teacherEmail={teacherEmail} />}
          {page === 'report-cards' && <ReportCardsPage teacherEmail={teacherEmail} />}
          {page === 'fees' && <FeesPage teacherEmail={teacherEmail} />}
        </div>
      </main>
    </div>
  );
}

export default App;
