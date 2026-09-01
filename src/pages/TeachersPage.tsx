import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Teacher } from '@/types';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import { Button, Field, TextInput, Select } from '@/components/Form';
import { Users, Plus, Pencil, Trash2, Search, Key, Eye, EyeOff } from 'lucide-react';

type TeacherForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  class: string;
  hire_date: string;
};

const TEACHER_CLASSES = [
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

const emptyForm: TeacherForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department: '',
  class: '',
  hire_date: '',
};

type TeacherAccount = {
  id: string;
  email: string;
  password: string;
  name: string;
};

export function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    loadTeachers();
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoadingAccounts(true);
    const { data } = await supabase.from('teacher_accounts').select('*').order('name');
    setAccounts(data ?? []);
    setLoadingAccounts(false);
  }

  async function loadTeachers() {
    setLoading(true);
    const { data } = await supabase.from('teachers').select('*').order('last_name');
    setTeachers(data ?? []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(t: Teacher) {
    setEditing(t);
    setForm({
      first_name: t.first_name,
      last_name: t.last_name,
      email: t.email,
      phone: t.phone ?? '',
      department: t.department ?? '',
      class: t.class ?? '',
      hire_date: t.hire_date ?? '',
    });
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone || null,
      department: form.department || null,
      class: form.class || null,
      hire_date: form.hire_date || null,
    };
    if (editing) {
      await supabase.from('teachers').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('teachers').insert(payload);
    }
    setSaving(false);
    setModalOpen(false);
    await loadTeachers();
  }

  async function remove() {
    if (!deleteId) return;
    await supabase.from('teachers').delete().eq('id', deleteId);
    setDeleteId(null);
    await loadTeachers();
  }

  function openAccountModal() {
    setSelectedTeacherId('');
    setAccountPassword('');
    setShowPassword(false);
    setShowAccountModal(true);
  }

  async function createAccount() {
    if (!selectedTeacherId || !accountPassword) return;
    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    if (!teacher) return;
    const { error } = await supabase.from('teacher_accounts').insert({
      email: teacher.email,
      password: accountPassword,
      name: `${teacher.first_name} ${teacher.last_name}`,
    });
    if (error) {
      alert(`Failed to create account: ${error.message}`);
      return;
    }
    setShowAccountModal(false);
    await loadAccounts();
  }

  async function removeAccount(id: string) {
    await supabase.from('teacher_accounts').delete().eq('id', id);
    await loadAccounts();
  }

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.first_name.toLowerCase().includes(q) ||
      t.last_name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.department ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader
        title="Teachers"
        subtitle={`${teachers.length} teaching staff`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openAccountModal}>
              <Key size={18} /> Create Login
            </Button>
            <Button onClick={openAdd}>
              <Plus size={18} /> Add Teacher
            </Button>
          </div>
        }
      />

      {/* Teacher Login Accounts */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Teacher Login Accounts</h3>
            <p className="text-xs text-slate-500">Create credentials for teachers to sign in</p>
          </div>
          <Button variant="secondary" onClick={openAccountModal}>
            <Plus size={16} /> Add Account
          </Button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-slate-400">No teacher accounts created yet.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{a.name}</p>
                  <p className="text-xs text-slate-500">
                    {a.email} · Password: {a.password}
                  </p>
                </div>
                <button
                  onClick={() => removeAccount(a.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="No teachers found"
          message={search ? "No teachers match your search." : "Add your first teacher to get started."}
          action={
            !search ? (
              <Button onClick={openAdd}>
                <Plus size={18} /> Add Teacher
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    {t.first_name[0]}
                    {t.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      {t.first_name} {t.last_name}
                    </h3>
                    <p className="text-xs text-slate-400">{t.email}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(t)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                {t.department && (
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Department:</span> {t.department}
                  </p>
                )}
                {t.class && (
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Class:</span> {t.class}
                  </p>
                )}
                {t.phone && (
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Phone:</span> {t.phone}
                  </p>
                )}
                {t.hire_date && (
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Hired:</span>{' '}
                    {new Date(t.hire_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Teacher' : 'Add Teacher'}>
        <div className="space-y-4">
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
          <Field label="Email" required>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <TextInput
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Department">
              <TextInput
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Mathematics"
              />
            </Field>
          </div>
          <Field label="Class">
            <Select
              value={form.class}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
            >
              <option value="">Select class</option>
              {TEACHER_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hire Date">
            <TextInput
              type="date"
              value={form.hire_date}
              onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.first_name || !form.last_name || !form.email}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title="Delete Teacher"
        message="This teacher will be removed from all assigned courses. This cannot be undone."
      />

      <Modal open={showAccountModal} onClose={() => setShowAccountModal(false)} title="Create Teacher Login">
        <div className="space-y-4">
          <Field label="Select Teacher" required>
            <Select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)}>
              <option value="">Choose a teacher...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name} ({t.email})
                </option>
              ))}
            </Select>
          </Field>
          {selectedTeacherId && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-600">
                <span className="font-medium">Email:</span> {teachers.find((t) => t.id === selectedTeacherId)?.email}
              </p>
            </div>
          )}
          <Field label="Password" required>
            <div className="relative">
              <TextInput
                type={showPassword ? 'text' : 'password'}
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAccountModal(false)}>
              Cancel
            </Button>
            <Button onClick={createAccount} disabled={!selectedTeacherId || !accountPassword}>
              Create Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
