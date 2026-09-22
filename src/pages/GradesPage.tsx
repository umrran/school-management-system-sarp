import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import { Button, Field, Select, TextInput } from '@/components/Form';
import { Award, Plus, Trash2 } from 'lucide-react';

type EnrollmentRow = {
  id: string;
  student: { id: string; first_name: string; last_name: string };
  course: { id: string; name: string; code: string };
};

type GradeRow = {
  id: string;
  enrollment_id: string;
  title: string;
  score: number;
  max_score: number;
  graded_at: string | null;
};

type GradeForm = {
  title: string;
  score: string;
  max_score: string;
  graded_at: string;
};

const emptyForm: GradeForm = {
  title: '',
  score: '',
  max_score: '100',
  graded_at: new Date().toISOString().split('T')[0],
};

function letterGrade(pct: number): string {
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 70) return 'C';
  if (pct >= 60) return 'D';
  return 'F';
}

function gradeColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600 bg-emerald-50';
  if (pct >= 80) return 'text-sky-600 bg-sky-50';
  if (pct >= 70) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

export function GradesPage({ teacherEmail }: { teacherEmail?: string | null }) {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [form, setForm] = useState<GradeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [teacherEmail]);

  async function loadData() {
    setLoading(true);
    const normalizedTeacherEmail = (teacherEmail ?? '').trim().toLowerCase();
    
    if (normalizedTeacherEmail) {
      // Load teacher's class and students in that class
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('class')
        .ilike('email', normalizedTeacherEmail)
        .maybeSingle();

      if (!teacherData || !teacherData.class) {
        setLoading(false);
        return;
      }

      // Get all students in the teacher's class
      const { data: studentList } = await supabase
        .from('students')
        .select('*')
        .eq('class', teacherData.class)
        .order('last_name');

      setStudents(studentList ?? []);

      // Get enrollments for these students
      if (studentList && studentList.length > 0) {
        const studentIds = studentList.map((s) => s.id);
        const { data: enrolls } = await supabase
          .from('enrollments')
          .select('*, student:students(*), course:courses(*)')
          .in('student_id', studentIds)
          .order('enrolled_at', { ascending: false });

        setEnrollments(enrolls ?? []);

        // Get all courses (admin can assign any course)
        const { data: courseList } = await supabase
          .from('courses')
          .select('*')
          .order('name');

        setCourses(courseList ?? []);

        // Get grades for these enrollments
        if (enrolls && enrolls.length > 0) {
          const { data: gradeData } = await supabase
            .from('grades')
            .select('*')
            .in('enrollment_id', enrolls.map((e: any) => e.id))
            .order('graded_at', { ascending: false });
          setGrades(gradeData ?? []);
        } else {
          setGrades([]);
        }
      } else {
        setEnrollments([]);
        setCourses([]);
        setGrades([]);
      }
    } else {
      // Admin view: show all
      const [{ data: enrolls }, { data: studentList }, { data: courseList }] = await Promise.all([
        supabase
          .from('enrollments')
          .select('*, student:students(*), course:courses(*)')
          .order('enrolled_at', { ascending: false }),
        supabase.from('students').select('*').order('last_name'),
        supabase.from('courses').select('*').order('name'),
      ]);

      setEnrollments(enrolls ?? []);
      setStudents(studentList ?? []);
      setCourses(courseList ?? []);

      if (enrolls && enrolls.length > 0) {
        const { data: gradeData } = await supabase
          .from('grades')
          .select('*')
          .in('enrollment_id', enrolls.map((e: any) => e.id))
          .order('graded_at', { ascending: false });
        setGrades(gradeData ?? []);
      } else {
        setGrades([]);
      }
    }
    
    setLoading(false);
  }

  async function save() {
    if (!selectedStudentId || !selectedCourseId) {
      alert('Please select both a student and a course.');
      return;
    }

    setSaving(true);

    let matchingEnrollment = enrollments.find(
      (e) => e.student.id === selectedStudentId && e.course.id === selectedCourseId
    );

    if (!matchingEnrollment) {
      const { data: newEnrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({ student_id: selectedStudentId, course_id: selectedCourseId })
        .select('id, student:students(*), course:courses(*)')
        .single();

      if (enrollmentError || !newEnrollment) {
        setSaving(false);
        alert(`Could not create enrollment: ${enrollmentError?.message ?? 'Unknown error'}`);
        return;
      }

      matchingEnrollment = newEnrollment as EnrollmentRow;
      setEnrollments((prev) => [matchingEnrollment, ...prev]);
    }

    const { error } = await supabase.from('grades').insert({
      enrollment_id: matchingEnrollment.id,
      title: form.title,
      score: parseFloat(form.score) || 0,
      max_score: parseFloat(form.max_score) || 100,
      graded_at: form.graded_at || null,
    });

    setSaving(false);
    if (error) {
      alert(`Could not save grade: ${error.message}`);
      return;
    }

    setModalOpen(false);
    setForm(emptyForm);
    setSelectedStudentId('');
    setSelectedCourseId('');
    await loadData();
  }

  async function remove() {
    if (!deleteId) return;
    await supabase.from('grades').delete().eq('id', deleteId);
    setDeleteId(null);
    await loadData();
  }

  const filteredEnrollments = filterCourse
    ? enrollments.filter((e) => e.course.id === filterCourse)
    : enrollments;

  // Group grades by enrollment
  const gradesByEnrollment: Record<string, GradeRow[]> = {};
  grades.forEach((g) => {
    if (!gradesByEnrollment[g.enrollment_id]) gradesByEnrollment[g.enrollment_id] = [];
    gradesByEnrollment[g.enrollment_id].push(g);
  });

  function avgPct(enrollmentId: string): number {
    const gs = gradesByEnrollment[enrollmentId];
    if (!gs || gs.length === 0) return 0;
    const total = gs.reduce((acc, g) => acc + (g.score / g.max_score) * 100, 0);
    return Math.round((total / gs.length) * 10) / 10;
  }

  return (
    <div>
      <PageHeader
        title="Grades"
        subtitle="Record and review student assessment grades"
        action={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setSelectedStudentId('');
              setSelectedCourseId('');
              setModalOpen(true);
            }}
          >
            <Plus size={18} /> Add Grade
          </Button>
        }
      />

      <div className="mb-4">
        <Field label="Filter by Course">
          <Select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {loading ? (
        <Spinner />
      ) : filteredEnrollments.length === 0 ? (
        <EmptyState
          icon={<Award size={28} />}
          title="No grades to display"
          message="Add a grade or change the course filter to see results."
        />
      ) : (
        <div className="space-y-4">
          {filteredEnrollments.map((e) => {
            const eGrades = gradesByEnrollment[e.id] ?? [];
            const avg = avgPct(e.id);
            return (
              <div
                key={e.id}
                className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">
                      {e.student.first_name[0]}
                      {e.student.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {e.student.first_name} {e.student.last_name}
                      </p>
                      <p className="text-xs text-violet-600">
                        {e.course.name} ({e.course.code})
                      </p>
                    </div>
                  </div>
                  {eGrades.length > 0 && (
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${gradeColor(avg)}`}>
                      <span className="text-lg font-bold">{avg}%</span>
                      <span className="text-sm font-medium">({letterGrade(avg)})</span>
                    </div>
                  )}
                </div>
                {eGrades.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-400">No grades recorded yet.</p>
                ) : (
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50/50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-2 font-medium">Assessment</th>
                        <th className="px-5 py-2 font-medium">Score</th>
                        <th className="px-5 py-2 font-medium">Grade</th>
                        <th className="px-5 py-2 font-medium">Date</th>
                        <th className="px-5 py-2 text-right font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {eGrades.map((g) => {
                        const pct = Math.round((g.score / g.max_score) * 1000) / 10;
                        return (
                          <tr key={g.id} className="transition hover:bg-slate-50/50">
                            <td className="px-5 py-2.5 font-medium text-slate-700">{g.title}</td>
                            <td className="px-5 py-2.5 text-slate-600">
                              {g.score} / {g.max_score}
                            </td>
                            <td className="px-5 py-2.5">
                              <span className={`rounded px-2 py-0.5 text-xs font-medium ${gradeColor(pct)}`}>
                                {pct}% ({letterGrade(pct)})
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-slate-500">
                              {g.graded_at
                                ? new Date(g.graded_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <button
                                onClick={() => setDeleteId(g.id)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Grade">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Student" required>
              <Select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">Select student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Course" required>
              <Select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">Select course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Assessment Title" required>
            <TextInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Midterm Exam"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Score" required>
              <TextInput
                type="number"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
                placeholder="85"
              />
            </Field>
            <Field label="Max Score" required>
              <TextInput
                type="number"
                value={form.max_score}
                onChange={(e) => setForm({ ...form, max_score: e.target.value })}
                placeholder="100"
              />
            </Field>
          </div>
          <Field label="Date">
            <input
              type="date"
              value={form.graded_at}
              onChange={(e) => setForm({ ...form, graded_at: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !selectedStudentId || !selectedCourseId || !form.title || !form.score}
            >
              {saving ? 'Saving...' : 'Save Grade'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title="Delete Grade"
        message="This grade entry will be permanently removed."
      />
    </div>
  );
}
