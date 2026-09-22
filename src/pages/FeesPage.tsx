import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { FeePayment, Student } from '@/types';
import { numberToWords } from '@/types';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';
import { Badge, ConfirmDialog, PageHeader, Spinner } from '@/components/ui';
import { Button, Field, Select, TextInput, TextArea } from '@/components/Form';
import { Receipt, Plus, Trash2, Search, Printer, Eye, TrendingUp } from 'lucide-react';
import { ReceiptView } from './ReceiptView';

const CLASS_OPTIONS = [
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

type FeeWithStudent = FeePayment & { student: Student | null };

export function FeesPage({ teacherEmail }: { teacherEmail?: string | null }) {
  const [payments, setPayments] = useState<FeeWithStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<FeeWithStudent | null>(null);
  const [totalCollected, setTotalCollected] = useState(0);

  const [form, setForm] = useState({
    student_id: '',
    student_name: '',
    class_form: '',
    amount: '',
    payment_type: 'termly',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    term: 'First Term',
    academic_year: '2024',
    notes: '',
  });

  useEffect(() => {
    loadPayments();
  }, [teacherEmail]);

  async function loadPayments() {
    setLoading(true);
    const normalizedTeacherEmail = (teacherEmail ?? '').trim().toLowerCase();
    
    if (normalizedTeacherEmail) {
      // Load payments only for students in teacher's class
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('class')
        .ilike('email', normalizedTeacherEmail)
        .maybeSingle();

      if (!teacherData || !teacherData.class) {
        setPayments([]);
        setStudents([]);
        setLoading(false);
        return;
      }

      const { data: studentList } = await supabase
        .from('students')
        .select('*')
        .eq('class', teacherData.class)
        .order('last_name');

      setStudents(studentList ?? []);

      if (!studentList || studentList.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      const studentIds = studentList.map((s) => s.id);

      const { data: paymentData } = await supabase
        .from('fee_payments')
        .select('*, student:students(*)')
        .in('student_id', studentIds)
        .order('payment_date', { ascending: false });

      setPayments(paymentData ?? []);
      setTotalCollected((paymentData ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0));
    } else {
      // Admin view: show all
      const { data } = await supabase
        .from('fee_payments')
        .select('*, student:students(*)')
        .order('payment_date', { ascending: false });

      setPayments(data ?? []);
      setTotalCollected((data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0));

      const { data: studentList } = await supabase
        .from('students')
        .select('*')
        .order('last_name');

      setStudents(studentList ?? []);
    }
    
    setLoading(false);
  }

  function openAdd() {
    setForm({
      student_id: '',
      student_name: '',
      class_form: '',
      amount: '',
      payment_type: 'termly',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      term: 'First Term',
      academic_year: '2024',
      notes: '',
    });
    setModalOpen(true);
  }

  async function generateReceiptNo(): Promise<string> {
    const year = new Date().getFullYear();
    const { data: counter } = await supabase
      .from('receipt_counter')
      .select('*')
      .eq('year', year)
      .maybeSingle();

    const nextSeq = (counter?.last_seq ?? 0) + 1;

    if (counter) {
      await supabase.from('receipt_counter').update({ last_seq: nextSeq }).eq('year', year);
    } else {
      await supabase.from('receipt_counter').insert({ year, last_seq: nextSeq });
    }

    return `RCP-${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  async function save() {
    setSaving(true);
    const receiptNo = await generateReceiptNo();
    const amount = parseFloat(form.amount) || 0;

    await supabase.from('fee_payments').insert({
      receipt_no: receiptNo,
      student_id: form.student_id || null,
      student_name: form.student_name,
      class_form: form.class_form,
      amount,
      amount_in_words: numberToWords(amount),
      payment_type: form.payment_type,
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      term: form.term,
      academic_year: form.academic_year,
      notes: form.notes,
    });

    setSaving(false);
    setModalOpen(false);
    await loadPayments();
  }

  async function remove() {
    if (!deleteId) return;
    await supabase.from('fee_payments').delete().eq('id', deleteId);
    setDeleteId(null);
    await loadPayments();
  }

  function selectStudent(id: string) {
    const s = students.find((st) => st.id === id);
    setForm((f) => ({
      ...f,
      student_id: id,
      student_name: s ? `${s.first_name} ${s.last_name}` : '',
      class_form: s ? s.class : f.class_form,
    }));
  }

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.student_name.toLowerCase().includes(q) ||
      p.receipt_no.toLowerCase().includes(q) ||
      p.class_form.toLowerCase().includes(q)
    );
  });

  const methodColor: Record<string, 'green' | 'blue' | 'amber'> = {
    cash: 'green',
    online: 'blue',
    cheque: 'amber',
  };

  if (viewing) {
    return (
      <ReceiptView
        payment={viewing}
        onBack={() => setViewing(null)}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Fees & Receipts"
        subtitle={`${payments.length} payments recorded`}
        action={
          <Button onClick={openAdd}>
            <Plus size={18} /> Record Payment
          </Button>
        }
      />

      {/* Summary Card */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Collected</p>
              <p className="text-2xl font-bold text-slate-800">GH¢{totalCollected.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">Receipts Issued</p>
              <p className="text-2xl font-bold text-slate-800">{payments.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500">This Term</p>
              <p className="text-2xl font-bold text-slate-800">
                {payments.filter((p) => p.term === 'First Term').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by student, receipt no, or class..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt size={28} />}
          title="No payments recorded"
          message={search ? "No payments match your search." : "Record your first fee payment to generate a receipt."}
          action={
            !search ? (
              <Button onClick={openAdd}>
                <Plus size={18} /> Record Payment
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Receipt No</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Student</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Class</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Amount</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Method</th>
                <th className="whitespace-nowrap px-5 py-3 font-medium">Date</th>
                <th className="whitespace-nowrap px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p) => (
                <tr key={p.id} className="transition hover:bg-slate-50/50">
                  <td className="whitespace-nowrap px-5 py-3">
                    <span className="font-mono text-xs font-semibold text-sky-700">{p.receipt_no}</span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <p className="font-medium text-slate-700">{p.student_name}</p>
                    <p className="text-xs text-slate-400">{p.term} · {p.academic_year}</p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-600">{p.class_form}</td>
                  <td className="whitespace-nowrap px-5 py-3 font-bold text-slate-800">GH¢{Number(p.amount).toLocaleString()}</td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <Badge color={methodColor[p.payment_method] ?? 'slate'}>{p.payment_method}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                    {new Date(p.payment_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setViewing(p)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        title="View Receipt"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => setViewing(p)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        title="Print Receipt"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Delete"
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

      {/* Add Payment Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Fee Payment">
        <div className="space-y-4">
          <Field label="Select Student (optional)">
            <Select value={form.student_id} onChange={(e) => selectStudent(e.target.value)}>
              <option value="">Manual entry</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                   {s.first_name} {s.last_name} ({s.class})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Student Name" required>
              <TextInput
                value={form.student_name}
                onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                placeholder="e.g. John Mensah"
              />
            </Field>
            <Field label="Class / Form">
              <Select
                value={form.class_form}
                onChange={(e) => setForm({ ...form, class_form: e.target.value })}
              >
                <option value="">Select class</option>
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Amount (GH¢)" required>
            <TextInput
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 500"
            />
          </Field>

          {form.amount && parseFloat(form.amount) > 0 && (
            <div className="rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
              <span className="font-medium">In words: </span>
              {numberToWords(parseFloat(form.amount))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Payment Type">
              <Select
                value={form.payment_type}
                onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
              >
                <option value="termly">Termly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Payment Method">
              <Select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Term">
              <Select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                <option>First Term</option>
                <option>Second Term</option>
                <option>Third Term</option>
              </Select>
            </Field>
            <Field label="Academic Year">
              <TextInput
                value={form.academic_year}
                onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Payment Date">
            <input
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </Field>

          <Field label="Notes (optional)">
            <TextArea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Partial payment for first term"
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !form.student_name || !form.amount}>
              {saving ? 'Saving...' : 'Record & Generate Receipt'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title="Delete Payment Record"
        message="This payment record and its receipt will be permanently removed."
      />
    </div>
  );
}
