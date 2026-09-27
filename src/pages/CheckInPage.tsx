import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Teacher, AttendanceStatus } from '@/types';
import { PageHeader, Spinner, Badge } from '@/components/ui';
import { Button } from '@/components/Form';
import { Clock, Check, X, AlertCircle } from 'lucide-react';

const statusConfig: Record<
  AttendanceStatus,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  present: {
    label: 'Present',
    icon: <Check size={20} />,
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
  },
  absent: {
    label: 'Absent',
    icon: <X size={20} />,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  late: {
    label: 'Late',
    icon: <Clock size={20} />,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  excused: {
    label: 'Excused',
    icon: <AlertCircle size={20} />,
    color: 'text-sky-700',
    bgColor: 'bg-sky-100',
  },
};

export function CheckInPage({ teacherEmail }: { teacherEmail?: string | null }) {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [today, setToday] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTeacher();
  }, [teacherEmail]);

  async function loadTeacher() {
    setLoading(true);
    const normalizedEmail = (teacherEmail ?? '').trim().toLowerCase();

    if (!normalizedEmail) {
      setLoading(false);
      return;
    }

    const { data: teacherData } = await supabase
      .from('teachers')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (teacherData) {
      setTeacher(teacherData);
      await loadTodayCheckIn(teacherData.id);
    }

    setLoading(false);
  }

  async function loadTodayCheckIn(teacherId: string) {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('date', today)
      .limit(1)
      .maybeSingle();

    if (data) {
      setStatus(data.status as AttendanceStatus);
      setNotes(data.notes || '');
    } else {
      setStatus(null);
      setNotes('');
    }
  }

  async function handleCheckIn(selectedStatus: AttendanceStatus) {
    if (!teacher) return;

    setChecking(true);
    setMessage(null);

    try {
      const { data: existing, error: lookupError } = await supabase
        .from('attendance')
        .select('id')
        .eq('teacher_id', teacher.id)
        .eq('date', today)
        .limit(1)
        .maybeSingle();

      if (lookupError) throw lookupError;

      const payload = {
        status: selectedStatus,
        notes: notes || null,
      };

      let writeError: { message: string } | null = null;

      if (existing) {
        // Update existing
        const { error } = await supabase.from('attendance').update(payload).eq('id', existing.id);
        writeError = error;
      } else {
        // Insert new
        const { error } = await supabase.from('attendance').insert({
          teacher_id: teacher.id,
          date: today,
          status: selectedStatus,
          notes: notes || null,
          enrollment_id: null,
        });
        writeError = error;
      }

      if (writeError) throw writeError;

      // Re-read from the server so the UI only shows what was actually stored.
      await loadTodayCheckIn(teacher.id);

      setMessage({ type: 'success', text: `Checked in as ${selectedStatus} at ${new Date().toLocaleTimeString()}` });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `Failed to save check-in${error?.message ? `: ${error.message}` : '. Please try again.'}`,
      });
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return <Spinner />;
  }

  if (!teacher) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Clock size={48} className="mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-800">Unable to Load Teacher Profile</h2>
        <p className="mt-2 text-slate-500">Please ensure you are logged in as a teacher.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Morning Check-In"
        subtitle={`${teacher.first_name} ${teacher.last_name}`}
      />

      {/* Today's Date */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Today's Date</p>
            <p className="text-2xl font-bold text-slate-800">
              {new Date(today).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          {status && (
            <div className={`flex items-center gap-2 rounded-lg px-4 py-2 ${statusConfig[status].bgColor}`}>
              <span className={statusConfig[status].color}>{statusConfig[status].icon}</span>
              <span className={`font-semibold ${statusConfig[status].color}`}>
                Checked in as {statusConfig[status].label}
              </span>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 ${
              message.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Status Buttons */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.entries(statusConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleCheckIn(key as AttendanceStatus)}
              disabled={checking}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 transition ${
                status === key
                  ? `${config.bgColor} border-${key === 'present' ? 'emerald' : key === 'absent' ? 'red' : key === 'late' ? 'amber' : 'sky'}-600 ${config.color}`
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{config.icon}</span>
              <span className="text-xs font-semibold">{config.label}</span>
            </button>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Doctor's appointment, car trouble..."
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            rows={3}
          />
        </div>
      </div>

      {/* Teacher Info Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-800">Teacher Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="text-slate-800">{teacher.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Department</p>
            <p className="text-slate-800">{teacher.department || 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Class</p>
            <p className="text-slate-800">{teacher.class || 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Hire Date</p>
            <p className="text-slate-800">
              {teacher.hire_date
                ? new Date(teacher.hire_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Not set'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
