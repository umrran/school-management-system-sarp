import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AttendanceStatus, Teacher } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { Badge, PageHeader, Spinner } from '@/components/ui';
import { Field, Select } from '@/components/Form';
import { ClipboardList, Check, X, Clock, Mail } from 'lucide-react';

type TeacherAttendanceRow = {
  id: string;
  teacher: { id: string; first_name: string; last_name: string; department: string | null };
};

const statusConfig: Record<
  AttendanceStatus,
  { label: string; icon: React.ReactNode; activeClass: string }
> = {
  present: { label: 'Present', icon: <Check size={16} />, activeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' },
  absent: { label: 'Absent', icon: <X size={16} />, activeClass: 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20' },
  late: { label: 'Late', icon: <Clock size={16} />, activeClass: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20' },
  excused: { label: 'Excused', icon: <Mail size={16} />, activeClass: 'bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-600/20' },
};

const statusOrder: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export function AttendancePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherRows, setTeacherRows] = useState<TeacherAttendanceRow[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from('teachers')
      .select('*')
      .order('last_name')
      .then(({ data }) => {
        const rows = data ?? [];
        setTeachers(rows);
        if (!selectedTeacher && rows[0]) {
          setSelectedTeacher(rows[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedTeacher) {
      setTeacherRows([]);
      setAttendanceMap({});
      return;
    }
    loadTeacherAttendance();
  }, [selectedTeacher, date]);

  async function loadTeacherAttendance() {
    setLoading(true);
    setSaved(false);

    const teacherList = teachers.length > 0 ? teachers : await supabase.from('teachers').select('*').order('last_name').then(({ data }) => data ?? []);

    const rows: TeacherAttendanceRow[] = teacherList.map((teacher) => ({
      id: teacher.id,
      teacher,
    }));

    setTeacherRows(rows);

    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date)
      .eq('teacher_id', selectedTeacher);

    const map: Record<string, AttendanceStatus> = {};
    existing?.forEach((a: any) => {
      if (a.teacher_id) map[a.teacher_id] = a.status as AttendanceStatus;
    });

    setAttendanceMap(map);
    setLoading(false);
  }

  function setStatus(teacherId: string, status: AttendanceStatus) {
    setAttendanceMap((prev) => ({ ...prev, [teacherId]: status }));
    setSaved(false);
  }

  function markAll(status: AttendanceStatus) {
    const map: Record<string, AttendanceStatus> = {};
    teacherRows.forEach((row) => (map[row.id] = status));
    setAttendanceMap(map);
    setSaved(false);
  }

  async function save() {
    if (!selectedTeacher) return;

    setSaving(true);
    setSaved(false);
    const record = {
      teacher_id: selectedTeacher,
      enrollment_id: null,
      date,
      status: attendanceMap[selectedTeacher] ?? 'present',
    };

    const { data: existing, error: lookupError } = await supabase
      .from('attendance')
      .select('id')
      .eq('teacher_id', selectedTeacher)
      .eq('date', date)
      .limit(1)
      .maybeSingle();

    let error: any = lookupError;
    if (!error) {
      if (existing) {
        const result = await supabase.from('attendance').update({ status: record.status }).eq('id', existing.id);
        error = result.error;
      } else {
        const result = await supabase.from('attendance').insert(record);
        error = result.error;
      }
    }

    setSaving(false);
    if (error) {
      alert(`Failed to save attendance: ${error.message}`);
      return;
    }

    // Re-read from the server so the UI reflects what is actually stored.
    await loadTeacherAttendance();
    setSaved(true);
  }

  const presentCount = Object.values(attendanceMap).filter((s) => s === 'present').length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === 'absent').length;
  const lateCount = Object.values(attendanceMap).filter((s) => s === 'late').length;

  const selectedTeacherData = teachers.find((teacher) => teacher.id === selectedTeacher);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark and track daily attendance for teachers" />

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Teacher">
              <Select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
                <option value="">Select a teacher...</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </Field>
          </div>
        </div>
      </div>

      {!selectedTeacher ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="Select a teacher"
          message="Choose a teacher and date above to mark daily attendance."
        />
      ) : loading ? (
        <Spinner />
      ) : !selectedTeacherData ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="Teacher not found"
          message="This teacher is not available to mark attendance."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge color="green">{presentCount} present</Badge>
              <Badge color="amber">{lateCount} late</Badge>
              <Badge color="red">{absentCount} absent</Badge>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus(selectedTeacher, 'present')}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                Mark present
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          {saved && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Attendance saved successfully.
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3 font-medium">Teacher</th>
                  <th className="whitespace-nowrap px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr className="transition hover:bg-slate-50/50">
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                        {selectedTeacherData.first_name[0]}
                        {selectedTeacherData.last_name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-700">
                          {selectedTeacherData.first_name} {selectedTeacherData.last_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {selectedTeacherData.department || 'No department'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="flex gap-1.5">
                      {statusOrder.map((s) => {
                        const config = statusConfig[s];
                        const active = (attendanceMap[selectedTeacher] ?? 'present') === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setStatus(selectedTeacher, s)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                              active
                                ? config.activeClass
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {config.icon}
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
