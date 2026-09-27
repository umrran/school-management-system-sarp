import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Student, Attendance, AttendanceStatus, Teacher } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader, Spinner } from '@/components/ui';
import { Button } from '@/components/Form';
import { ClipboardList, Check, X, Clock, AlertCircle, Save } from 'lucide-react';

type StudentRow = {
  id: string;
  student: Student;
};

const statusConfig: Record<
  AttendanceStatus,
  { label: string; icon: React.ReactNode; activeClass: string }
> = {
  present: {
    label: 'Present',
    icon: <Check size={16} />,
    activeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
  },
  absent: {
    label: 'Absent',
    icon: <X size={16} />,
    activeClass: 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20',
  },
  late: {
    label: 'Late',
    icon: <Clock size={16} />,
    activeClass: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20',
  },
  excused: {
    label: 'Excused',
    icon: <AlertCircle size={16} />,
    activeClass: 'bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-600/20',
  },
};

const statusOrder: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export function StudentAttendancePage({ teacherEmail }: { teacherEmail?: string | null }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Maps student id -> enrollment id (attendance rows are keyed by enrollment)
  const [enrollmentByStudent, setEnrollmentByStudent] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadTeacher();
  }, [teacherEmail]);

  async function loadTeacher() {
    const normalizedEmail = (teacherEmail ?? '').trim().toLowerCase();
    if (!normalizedEmail) return;

    const { data: teacherData } = await supabase
      .from('teachers')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (teacherData) {
      setTeacher(teacherData);
      if (teacherData.class) {
        await loadStudents(teacherData.id, teacherData.class);
      }
    }
  }

  async function loadStudents(teacherId: string, classForm: string) {
    setLoading(true);
    setSaved(false);

    const { data: studentList } = await supabase
      .from('students')
      .select('*')
      .eq('class', classForm)
      .eq('status', 'active')
      .order('last_name');

    const rows: StudentRow[] = (studentList ?? []).map((s) => ({
      id: s.id,
      student: s,
    }));

    setStudents(rows);

    // Attendance rows are keyed by student_id, so resolve each student directly.
    const studentIds = rows.map((r) => r.id);

    // Load attendance for those students on the selected date
    const map: Record<string, AttendanceStatus> = {};
    const notesMap: Record<string, string> = {};

    if (studentIds.length > 0) {
      const { data: existing } = await supabase
        .from('attendance')
        .select('student_id, status, notes')
        .eq('date', date)
        .is('teacher_id', null)
        .in('student_id', studentIds);

      existing?.forEach((a: Pick<Attendance, 'student_id' | 'status' | 'notes'>) => {
        if (a.student_id) {
          map[a.student_id] = a.status as AttendanceStatus;
          if (a.notes) notesMap[a.student_id] = a.notes;
        }
      });
    }

    setAttendanceMap(map);
    setNotes(notesMap);
    setLoading(false);
  }

  function setStatus(enrollmentId: string, status: AttendanceStatus) {
    setAttendanceMap((prev) => ({ ...prev, [enrollmentId]: status }));
    setSaved(false);
  }

  function markAll(status: AttendanceStatus) {
    const map: Record<string, AttendanceStatus> = {};
    students.forEach((row) => {
      // Create a simple enrollment ID based on student ID
      map[row.id] = status;
    });
    setAttendanceMap(map);
    setSaved(false);
  }

  async function save() {
    if (!teacher) return;

    setSaving(true);
    setSaveError(null);

    const records = Object.entries(attendanceMap)
      .filter(([studentId, status]) => status)
      .map(([studentId, status]) => ({
        student_id: studentId,
        enrollment_id: null,
        teacher_id: null,
        date,
        status,
        notes: notes[studentId] || null,
      }));

    if (records.length === 0) {
      setSaving(false);
      setSaveError('No students have an attendance status set.');
      return;
    }

    const studentIds = records.map((r) => r.student_id);

    // Replace only this class's attendance for the date. Never touch rows that
    // belong to a teacher check-in (those have teacher_id set).
    const { error: deleteError } = await supabase
      .from('attendance')
      .delete()
      .eq('date', date)
      .is('teacher_id', null)
      .in('student_id', studentIds);

    if (deleteError) {
      setSaving(false);
      setSaveError(deleteError.message);
      return;
    }

    const { error: insertError } = await supabase.from('attendance').insert(records);

    if (insertError) {
      setSaving(false);
      setSaveError(insertError.message);
      return;
    }

    setSaved(true);
    setSaving(false);

    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <Spinner />;
  }

  if (!teacher || !teacher.class) {
    return (
      <EmptyState
        icon={<ClipboardList size={28} />}
        title="No Class Assigned"
        message="You need to be assigned a class to mark student attendance."
      />
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={28} />}
        title="No Students in Your Class"
        message="There are no active students in your assigned class."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Mark Student Attendance"
        subtitle={`${teacher.class} · ${students.length} students`}
        action={
          <div className="flex gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (teacher.id) {
                  loadStudents(teacher.id, teacher.class!);
                }
              }}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <Button onClick={save} disabled={saving || Object.keys(attendanceMap).length === 0}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        }
      />

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          ✓ Attendance saved successfully at {new Date().toLocaleTimeString()}
        </div>
      )}

      {saveError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          Failed to save attendance: {saveError}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6 flex gap-2">
        <Button variant="secondary" onClick={() => markAll('present')}>
          Mark All Present
        </Button>
        <Button variant="secondary" onClick={() => markAll('absent')}>
          Mark All Absent
        </Button>
      </div>

      {/* Attendance Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-5 py-3 font-medium">Student</th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">Class</th>
              <th className="whitespace-nowrap px-5 py-3 font-medium text-center">Status</th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map((row) => {
              const status = attendanceMap[row.id];
              return (
                <tr key={row.id} className="transition hover:bg-slate-50/50">
                  <td className="whitespace-nowrap px-5 py-3">
                    <p className="font-medium text-slate-700">
                      {row.student.first_name} {row.student.last_name}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">{row.student.class}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-center gap-1">
                      {statusOrder.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(row.id, s)}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                            status === s
                              ? statusConfig[s].activeClass
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                          title={statusConfig[s].label}
                        >
                          {statusConfig[s].icon}
                          <span className="hidden sm:inline">{statusConfig[s].label}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <input
                      type="text"
                      value={notes[row.id] || ''}
                      onChange={(e) => {
                        setNotes((prev) => ({ ...prev, [row.id]: e.target.value }));
                        setSaved(false);
                      }}
                      placeholder="Notes..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {statusOrder.map((status) => {
          const count = Object.values(attendanceMap).filter((s) => s === status).length;
          return (
            <div
              key={status}
              className={`rounded-lg border px-4 py-3 ${
                status === 'present'
                  ? 'border-emerald-200 bg-emerald-50'
                  : status === 'absent'
                    ? 'border-red-200 bg-red-50'
                    : status === 'late'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-sky-200 bg-sky-50'
              }`}
            >
              <p className="text-xs text-slate-600">{statusConfig[status].label}</p>
              <p className="text-xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
