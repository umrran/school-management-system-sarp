import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Student, StudentStatus } from '@/types';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { Badge, ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import { Button, Field, Select, TextInput } from '@/components/Form';
import { GraduationCap, Plus, Pencil, Trash2, Search, Upload, X, ArrowUpCircle, ArrowRightCircle } from 'lucide-react';

type StudentForm = {
  first_name: string;
  last_name: string;
  parent_name: string;
  phone: string;
  class: string;
  status: StudentStatus;
  image_url: string | null;
};

const CLASSES = [
  'Nursery',
  'KG1',
  'KG2',
  'Basic 1',
  'Basic 2',
  'Basic 3',
  'Basic 4',
  'Basic 5',
  'Basic 6',
  'JHS 1',
  'JHS 2',
  'JHS 3',
];

const emptyForm: StudentForm = {
  first_name: '',
  last_name: '',
  parent_name: '',
  phone: '',
  class: '',
  status: 'active',
  image_url: null,
};

function Avatar({ student, size = 36 }: { student: Student; size?: number }) {
  if (student.image_url) {
    return (
      <img
        src={student.image_url}
        alt={`${student.first_name} ${student.last_name}`}
        className="rounded-full object-cover ring-2 ring-slate-100"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {student.first_name[0]}
      {student.last_name[0]}
    </div>
  );
}

export function StudentsPage({ teacherEmail }: { teacherEmail?: string | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [newClass, setNewClass] = useState<string>('');
  const [teacherClass, setTeacherClass] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStudents();
  }, [teacherEmail]);

  async function loadStudents() {
    setLoading(true);
    const normalizedTeacherEmail = (teacherEmail ?? '').trim().toLowerCase();
    
    if (normalizedTeacherEmail) {
      // Filter students by teacher's assigned class
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('class')
        .ilike('email', normalizedTeacherEmail)
        .maybeSingle();

      if (!teacherData || !teacherData.class) {
        setStudents([]);
        setTeacherClass(null);
        setLoading(false);
        return;
      }

      setTeacherClass(teacherData.class);

      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('class', teacherData.class)
        .order('last_name');

      setStudents(data ?? []);
    } else {
      // Admin view: show all students
      setTeacherClass(null);
      const { data } = await supabase.from('students').select('*').order('last_name');
      setStudents(data ?? []);
    }
    
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      first_name: s.first_name,
      last_name: s.last_name,
      parent_name: s.parent_name ?? '',
      phone: s.phone ?? '',
      class: s.class ?? '',
      status: s.status as StudentStatus,
      image_url: s.image_url,
    });
    setModalOpen(true);
  }

  async function handleImageUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be 5MB or smaller.');
      return;
    }

    setUploading(true);

    const bucketName = 'student-photos';
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `student-${Date.now()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

    if (uploadError) {
      setUploading(false);

      if (uploadError.message.toLowerCase().includes('not found') || uploadError.message.toLowerCase().includes('bucket')) {
        alert(
          'The student photo bucket is missing. Create a public Supabase storage bucket called "student-photos", then retry.'
        );
        return;
      }

      alert(`Failed to upload image: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  }

  function removeImage() {
    setForm((f) => ({ ...f, image_url: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function save() {
    setSaving(true);
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      parent_name: form.parent_name,
      phone: form.phone || null,
      class: form.class,
      status: form.status,
      image_url: form.image_url,
    };

    try {
      if (editing) {
        const { error: updateError } = await supabase.from('students').update(payload).eq('id', editing.id);
        if (updateError) {
          alert(`Could not update student: ${updateError.message}`);
          setSaving(false);
          return;
        }
      } else {
        const { data: newStudent, error: insertError } = await supabase.from('students').insert(payload).select().single();
        if (insertError || !newStudent) {
          alert(`Could not add student: ${insertError?.message ?? 'Unknown error'}`);
          setSaving(false);
          return;
        }

        try {
          await autoEnrollStudent(newStudent.id, form.class);
        } catch {
          // Student creation succeeded; do not interrupt the flow for optional course auto-enrollment.
        }
      }
    } catch (error: any) {
      alert(`Unexpected error while saving student: ${error?.message ?? 'Unknown error'}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    setModalOpen(false);
    await loadStudents();
  }

  async function autoEnrollStudent(studentId: string, studentClass: string) {
    const { data: allCourses, error: fetchError } = await supabase
      .from('courses')
      .select('id, level, class');

    if (fetchError) throw fetchError;

    const matchingCourses = (allCourses ?? []).filter((course: any) => {
      const levelValue = (course.level ?? '').toString().trim();
      const classValue = (course.class ?? '').toString().trim();
      return levelValue === studentClass || classValue === studentClass;
    });

    const coursesToEnroll = matchingCourses.length > 0 ? matchingCourses : (allCourses ?? []);

    if (coursesToEnroll.length > 0) {
      const enrollments = coursesToEnroll.map((c: any) => ({ student_id: studentId, course_id: c.id }));
      const { error: enrollError } = await supabase.from('enrollments').insert(enrollments);
      if (enrollError) throw enrollError;
    }
  }

  async function promoteStudent() {
    if (!promoteId) return;
    const student = students.find((s) => s.id === promoteId);
    if (!student) return;
    const currentIndex = CLASSES.indexOf(student.class ?? '');
    const nextClass = currentIndex >= 0 && currentIndex < CLASSES.length - 1 ? CLASSES[currentIndex + 1] : student.class;
    await supabase.from('students').update({ class: nextClass }).eq('id', promoteId);
    await supabase.from('enrollments').delete().eq('student_id', promoteId);
    if (nextClass) await autoEnrollStudent(promoteId, nextClass);
    setPromoteId(null);
    await loadStudents();
  }

  async function transferStudent() {
    if (!transferId) return;
    await supabase.from('students').update({ class: newClass }).eq('id', transferId);
    await supabase.from('enrollments').delete().eq('student_id', transferId);
    await autoEnrollStudent(transferId, newClass);
    setTransferId(null);
    setNewClass('');
    await loadStudents();
  }

  async function remove() {
    if (!deleteId) return;
    await supabase.from('students').delete().eq('id', deleteId);
    setDeleteId(null);
    await loadStudents();
  }

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      (s.parent_name ?? '').toLowerCase().includes(q)
    );
  });

  const statusColor: Record<string, 'green' | 'amber' | 'slate'> = {
    active: 'green',
    inactive: 'amber',
    graduated: 'slate',
  };

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={teacherClass 
          ? `${students.length} students in ${teacherClass}`
          : `${students.length} students enrolled`
        }
        action={
          <Button onClick={openAdd}>
            <Plus size={18} /> Add Student
          </Button>
        }
      />

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or parent name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={28} />}
          title="No students found"
          message={search ? "No students match your search." : "Add your first student to get started."}
          action={
            !search ? (
              <Button onClick={openAdd}>
                <Plus size={18} /> Add Student
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
                <th className="px-5 py-3 font-medium">Parent Name</th>
                <th className="px-5 py-3 font-medium">Class</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((s) => (
                <tr key={s.id} className="transition hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar student={s} />
                      <span className="font-medium text-slate-700">
                        {s.first_name} {s.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{s.parent_name}</td>
                  <td className="px-5 py-3 text-slate-600">{s.class}</td>
                  <td className="px-5 py-3">
                    <Badge color={statusColor[s.status] ?? 'slate'}>{s.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setPromoteId(s.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                        title="Promote to next grade"
                      >
                        <ArrowUpCircle size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setTransferId(s.id);
                          setNewClass(s.class ?? '');
                        }}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                        title="Transfer to another class"
                      >
                        <ArrowRightCircle size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(s.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Student' : 'Add Student'}>
        <div className="space-y-4">
          {/* Image Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt="Student"
                  className="h-20 w-20 rounded-2xl object-cover ring-2 ring-slate-200"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <GraduationCap size={32} />
                </div>
              )}
              {form.image_url && (
                <button
                  onClick={removeImage}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-600"
                  type="button"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {form.image_url ? 'Change Photo' : 'Upload Photo'}
                  </>
                )}
              </button>
              <p className="mt-1.5 text-xs text-slate-400">JPG, PNG, or GIF. Max 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <TextInput
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </Field>
            <Field label="Last Name" required>
              <TextInput
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Parent Name" required>
            <TextInput
              value={form.parent_name}
              onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
              placeholder="e.g. John Mensah"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <TextInput
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Class" required>
              <Select
                value={form.class}
                onChange={(e) => setForm({ ...form, class: e.target.value })}
              >
                <option value="">Select class</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as StudentStatus })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.first_name || !form.last_name || !form.parent_name}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title="Delete Student"
        message="This will also remove all enrollments, attendance, and grades for this student. This cannot be undone."
      />

      <Modal open={!!promoteId} onClose={() => setPromoteId(null)} title="Promote Student">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will promote the student to the next class and automatically enroll them in the
            courses for that class.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPromoteId(null)}>
              Cancel
            </Button>
            <Button onClick={promoteStudent}>Promote</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!transferId} onClose={() => setTransferId(null)} title="Transfer Student">
        <div className="space-y-4">
          <Field label="Transfer to Class">
            <Select value={newClass} onChange={(e) => setNewClass(e.target.value)}>
              <option value="">Select class</option>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-sm text-slate-500">
            The student will be enrolled in courses matching the new class.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setTransferId(null)}>
              Cancel
            </Button>
            <Button onClick={transferStudent} disabled={!newClass}>Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
