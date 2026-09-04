import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  Award,
  FileText,
  Receipt,
  LogOut,
} from 'lucide-react';
import logo from '/Sarp_Logo.jpg';

export type PageId =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'courses'
  | 'attendance'
  | 'grades'
  | 'report-cards'
  | 'fees';

type NavItem = {
  id: PageId;
  label: string;
  icon: React.ReactNode;
  dividerBefore?: boolean;
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'students', label: 'Students', icon: <GraduationCap size={20} /> },
  { id: 'teachers', label: 'Teachers', icon: <Users size={20} /> },
  { id: 'courses', label: 'Courses', icon: <BookOpen size={20} /> },
  { id: 'attendance', label: 'Attendance', icon: <ClipboardList size={20} /> },
  { id: 'grades', label: 'Grades', icon: <Award size={20} /> },
  { id: 'report-cards', label: 'Report Cards', icon: <FileText size={20} />, dividerBefore: true },
  { id: 'fees', label: 'Fees & Receipts', icon: <Receipt size={20} /> },
];

type SidebarProps = {
  current: PageId;
  onNavigate: (page: PageId) => void;
  className?: string;
  role: 'admin' | 'teacher';
  teacherName?: string | null;
};

export function Sidebar({ current, onNavigate, className, role, teacherName }: SidebarProps) {
  return (
    <aside className={`flex h-screen w-64 flex-col border-r border-slate-200 bg-white ${className ?? ''}`}>
      <div className="flex items-center gap-3 px-6 py-5">
        <img src={logo} alt="SARP Logo" className="h-12 w-12 rounded-xl object-cover" />
        <div>
          <h1 className="text-base font-bold leading-tight text-slate-800">SARP</h1>
          <p className="text-xs text-slate-400">Educational Complex</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => role === 'admin' || !['teachers', 'attendance', 'fees'].includes(item.id))
          .map((item) => {
          const active = current === item.id;
          return (
            <div key={item.id}>
              {item.dividerBefore && <div className="my-2 border-t border-slate-100" />}
              <button
                onClick={() => onNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className={active ? 'text-sky-600' : 'text-slate-400'}>{item.icon}</span>
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-6 py-4">
        <p className="mb-3 text-xs text-slate-400">
          {role === 'admin' 
            ? 'Administrator' 
            : teacherName 
            ? `Teacher · ${teacherName}`
            : 'Teacher'} · Academic Year 2024-2025
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('sarp_role');
            localStorage.removeItem('sarp_teacher_email');
            localStorage.removeItem('sarp_teacher_name');
            window.location.reload();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
