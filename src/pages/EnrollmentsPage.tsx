import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Enrollment } from '@/types';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import { Button, Field, Select } from '@/components/Form';
import { ClipboardList, Plus, Trash2, Search } from 'lucide-react';

type EnrollmentRow = Enrollment & {
  student: { id: string; first_name: string; last_name: string; parent_name: string; grade_level: number };
  course: { id: string; name: string; code: string };
};

export function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadEnrollments();
    supabase.from('students').select('*').order('last_name').then(({ data }) => setStudents(data ?? []));
    supabase.from('courses').select('*').order('name').then(({ data }) => setCourses(data ?? []));
  }, []);

  async function loadEnrollments() {
    setLoading(true);
    const { data } = await supabase
      .from('enrollments')
      .select('*, student:students(*), course:courses(*)')
      .order('enrolled_at', { ascending: false });
    setEnrollments(data ?? []);
    setLoading(false);
  }

  async function enroll() {
    setSaving(true);
    await supabase.from('enrollments').insert({
      student_id: studentId,
      course_id: courseId,
    });
    setSaving(false);
    setModalOpen(false);
    setStudentId('');
    setCourseId('');
    await loadEnrollments();
  }

  async function remove() {
    if (!deleteId) return;
    await supabase.from('enrollments').delete().eq('id', deleteId);
    setDeleteId(null);
    await loadEnrollments();
  }

  const filtered = enrollments.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.student.first_name.toLowerCase().includes(q) ||
      e.student.last_name.toLowerCase().includes(q) ||
      e.course.name.toLowerCase().includes(q) ||
      e.course.code.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Enrollments"
        subtitle={`${enrollments.length} active enrollments`}
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={18} /> Enroll Student
          </Button>
        }
      />

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by student or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No enrollments found"
          message={search ? "No enrollments match your search." : "Enroll a student in a course to get started."}
          action={
            !search ? (
              <Button onClick={() => setModalOpen(true)}>
                <Plus size={18} /> Enroll Student
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-5 py-3 font-medium">Enrolled On</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((e) => (
                <tr key={e.id} className="transition hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                        {e.student.first_name[0]}
                        {e.student.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">
                          {e.student.first_name} {e.student.last_name}
                        </p>
                        <p className="text-xs text-slate-400">Grade {e.student.grade_level}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-700">{e.course.name}</p>
                    <p className="text-xs text-violet-600">{e.course.code}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(e.enrolled_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setDeleteId(e.id)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Enroll Student in Course">
        <div className="space-y-4">
          <Field label="Student" required>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select a student...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} (Grade {s.grade_level})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Course" required>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Select a course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={enroll} disabled={saving || !studentId || !courseId}>
              {saving ? 'Enrolling...' : 'Enroll'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title="Remove Enrollment"
        message="This will also remove all attendance and grades for this enrollment. This cannot be undone."
      />
    </div>
  );
}
