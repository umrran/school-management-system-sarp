import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Course, Teacher } from '@/types';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import { Button, Field, Select, TextArea, TextInput } from '@/components/Form';
import { BookOpen, Plus, Pencil, Trash2, Search } from 'lucide-react';

type CourseForm = {
  name: string;
  code: string;
  description: string;
  teacher_id: string;
  level: string;
  class: string;
};

const emptyForm: CourseForm = {
  name: '',
  code: '',
  description: '',
  teacher_id: '',
  level: '',
  class: '',
};

const LEVELS = [
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

export function CoursesPage() {
  const [courses, setCourses] = useState<(Course & { teacher: Teacher | null })[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
    supabase.from('teachers').select('*').order('last_name').then(({ data }) => setTeachers(data ?? []));
  }, []);

  async function loadCourses() {
    setLoading(true);
    const { data } = await supabase
      .from('courses')
      .select('*, teacher:teachers(*)')
      .order('name');
    setCourses(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(c: Course) {
    setEditing(c);
    setForm({
      name: c.name,
      code: c.code,
      description: c.description ?? '',
      teacher_id: c.teacher_id ?? '',
      level: c.level ?? '',
      class: c.class ?? '',
    });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      name: form.name,
      code: form.code,
      description: form.description || null,
      teacher_id: form.teacher_id || null,
      level: form.level || null,
      class: form.class || null,
    };
    if (editing) {
      await supabase.from('courses').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('courses').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    await loadCourses();
  }

  async function remove() {
    if (!deleteId) return;
    await supabase.from('courses').delete().eq('id', deleteId);
    setDeleteId(null);
    await loadCourses();
  }

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.teacher?.first_name ?? '').toLowerCase().includes(q) ||
      (c.teacher?.last_name ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle={`${courses.length} courses offered`}
        action={
          <Button onClick={openAdd}>
            <Plus size={18} /> Add Course
          </Button>
        }
      />

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, code, or teacher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="No courses found"
          message={search ? "No courses match your search." : "Add your first course to get started."}
          action={
            !search ? (
              <Button onClick={openAdd}>
                <Plus size={18} /> Add Course
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <BookOpen size={22} />
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-800">{c.name}</h3>
              <p className="text-xs font-medium text-violet-600">{c.code}</p>
              {c.description && (
                <p className="mt-2 text-sm text-slate-500 line-clamp-2">{c.description}</p>
              )}
              <div className="mt-4 space-y-1.5 border-t border-slate-50 pt-3">
                <p className="text-sm text-slate-600">
                  <span className="text-slate-400">Teacher:</span>{' '}
                  {c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : 'Unassigned'}
                </p>
                <div className="flex gap-4">
                  {c.level && (
                    <p className="text-sm text-slate-600">
                      <span className="text-slate-400">Level:</span> {c.level}
                    </p>
                  )}
                  {c.class && (
                    <p className="text-sm text-slate-600">
                      <span className="text-slate-400">Class:</span> {c.class}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Course' : 'Add Course'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Course Name" required>
              <TextInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Algebra II"
              />
            </Field>
            <Field label="Course Code" required>
              <TextInput
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. MATH-201"
              />
            </Field>
          </div>
          <Field label="Description">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief course description..."
            />
          </Field>
          <Field label="Teacher">
            <Select
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} {t.department ? `(${t.department})` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Level">
              <Select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                <option value="">Select level</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Class">
              <Select
                value={form.class}
                onChange={(e) => setForm({ ...form, class: e.target.value })}
              >
                <option value="">Select class</option>
                {LEVELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.name || !form.code}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title="Delete Course"
        message="This will also remove all enrollments, attendance, and grades for this course. This cannot be undone."
      />
    </div>
  );
}
