import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';
import { GraduationCap, Users, BookOpen, ClipboardList, TrendingUp, Award } from 'lucide-react';

type Stats = {
  students: number;
  teachers: number;
  courses: number;
  enrollments: number;
  avgGrade: number;
  attendanceRate: number;
};

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [students, teachers, courses, enrollments, grades, attendance] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        supabase.from('grades').select('score, max_score'),
        supabase.from('attendance').select('status'),
      ]);

      const avgGrade =
        grades.data && grades.data.length > 0
          ? Math.round(
              (grades.data.reduce((acc, g) => acc + (g.score / g.max_score) * 100, 0) /
                grades.data.length) *
                10,
            ) / 10
          : 0;

      const present = attendance.data?.filter((a) => a.status === 'present').length ?? 0;
      const total = attendance.data?.length ?? 0;
      const attendanceRate = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

      setStats({
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        courses: courses.count ?? 0,
        enrollments: enrollments.count ?? 0,
        avgGrade,
        attendanceRate,
      });

      const { data: recent } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentStudents(recent ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) return <Spinner />;

  const cards = [
    { label: 'Total Students', value: stats.students, icon: <GraduationCap />, color: 'sky' },
    { label: 'Teachers', value: stats.teachers, icon: <Users />, color: 'emerald' },
    { label: 'Courses', value: stats.courses, icon: <BookOpen />, color: 'violet' },
    { label: 'Enrollments', value: stats.enrollments, icon: <ClipboardList />, color: 'amber' },
  ];

  const colorMap: Record<string, string> = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of your school's key metrics</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[card.color]}`}>
                {card.icon}
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-800">{card.value}</p>
            <p className="mt-1 text-sm text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Attendance Rate</p>
              <p className="text-2xl font-bold text-slate-800">{stats.attendanceRate}%</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${stats.attendanceRate}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Award size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Average Grade</p>
              <p className="text-2xl font-bold text-slate-800">{stats.avgGrade}%</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${stats.avgGrade}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Recently Added Students</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {recentStudents.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No students yet</p>
          ) : (
            recentStudents.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                {s.image_url ? (
                  <img
                    src={s.image_url}
                    alt={`${s.first_name} ${s.last_name}`}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-semibold text-sky-700">
                    {s.first_name[0]}
                    {s.last_name[0]}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">
                    {s.first_name} {s.last_name}
                  </p>
                  <p className="text-xs text-slate-400">{s.parent_name}</p>
                </div>
                <span className="text-xs text-slate-400">{s.class}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
