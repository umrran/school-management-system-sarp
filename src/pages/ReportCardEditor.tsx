import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getSubjectsByClass, calcGrade } from '@/types';
import type { ReportCard, ReportCardSubject, Student } from '@/types';
import { Button, Field, Select, TextInput } from '@/components/Form';
import { ArrowLeft, Printer, Upload, X } from 'lucide-react';

type SubjectRow = {
  id?: string;
  subject_name: string;
  class_score: string;
  exam_score: string;
  total: number;
  grade: number;
  grade_label: string;
  teacher_remarks: string;
  sort_order: number;
};

type Props = {
  card?: ReportCard & { subjects: ReportCardSubject[] };
  teacherEmail?: string | null;
  onBack: () => void;
  onSaved: () => void;
  onPrint: (id: string) => void;
};

const emptySubjects = (classForm: string = ''): SubjectRow[] => {
  const subjectList = getSubjectsByClass(classForm);
  return subjectList.map((name, i) => ({
    subject_name: name,
    class_score: '0',
    exam_score: '0',
    total: 0,
    grade: 9,
    grade_label: 'Fail',
    teacher_remarks: '',
    sort_order: i,
  }));
};

export function ReportCardEditor({ card, teacherEmail, onBack, onSaved, onPrint }: Props) {
  const [form, setForm] = useState({
    pupil_name: card?.pupil_name ?? '',
    class_form: card?.class_form ?? '',
    term: card?.term ?? 'First Term',
    academic_year: card?.academic_year ?? '',
    vacation_date: card?.vacation_date ?? '',
    reopening_date: card?.reopening_date ?? '',
    next_term_fees: card?.next_term_fees ?? '',
    fees_in_arrears: card?.fees_in_arrears ?? '',
    total_fees_due: card?.total_fees_due ?? '',
    no_on_roll: String(card?.no_on_roll ?? ''),
    days_out: String(card?.days_out ?? ''),
    repeated: card?.repeated ?? false,
    promoted_to: card?.promoted_to ?? '',
    overall_grade: card?.overall_grade ?? '',
    attendance: String(card?.attendance ?? ''),
    conduct: card?.conduct ?? '',
    interest: card?.interest ?? '',
    teachers_remarks: card?.teachers_remarks ?? '',
    headmaster_remarks: card?.headmaster_remarks ?? '',
  });

  const [subjects, setSubjects] = useState<SubjectRow[]>(
    card?.subjects
      ? [...card.subjects]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((s) => ({
            id: s.id,
            subject_name: s.subject_name,
            class_score: String(s.class_score ?? 0),
            exam_score: String(s.exam_score ?? 0),
            total: s.total ?? 0,
            grade: s.grade ?? 9,
            grade_label: s.grade_label ?? '',
            teacher_remarks: s.teacher_remarks ?? '',
            sort_order: s.sort_order,
          }))
      : emptySubjects(card?.class_form ?? '')
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(card?.student_id ?? '');
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(card?.header_image_url ?? null);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  // Update subjects when class form changes (new report cards only)
  useEffect(() => {
    if (!card && form.class_form) {
      setSubjects(emptySubjects(form.class_form));
    }
  }, [form.class_form, card]);

  useEffect(() => {
    async function loadStudents() {
      const normalizedTeacherEmail = (teacherEmail ?? '').trim().toLowerCase();
      if (normalizedTeacherEmail) {
        // Load students in teacher's class
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('class')
          .ilike('email', normalizedTeacherEmail)
          .maybeSingle();

        if (!teacherData || !teacherData.class) {
          setStudents([]);
          return;
        }

        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('class', teacherData.class)
          .order('last_name');

        setStudents(data ?? []);
      } else {
        // Admin view: show all students
        const { data } = await supabase
          .from('students')
          .select('*')
          .order('last_name');

        setStudents(data ?? []);
      }
    }

    loadStudents();
  }, [teacherEmail]);

  function updateScore(idx: number, field: 'class_score' | 'exam_score', value: string) {
    setSubjects((prev) => {
      const updated = [...prev];
      const row = { ...updated[idx], [field]: value };
      const cs = parseFloat(field === 'class_score' ? value : row.class_score) || 0;
      const es = parseFloat(field === 'exam_score' ? value : row.exam_score) || 0;
      const total = cs + es;
      const { grade, label, remark } = calcGrade(total);
      updated[idx] = { ...row, total, grade, grade_label: remark, teacher_remarks: row.teacher_remarks };
      return updated;
    });
  }

  function updateRemark(idx: number, value: string) {
    setSubjects((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], teacher_remarks: value };
      return updated;
    });
  }

  const grandClassTotal = subjects.reduce((a, s) => a + (parseFloat(s.class_score) || 0), 0);
  const grandExamTotal = subjects.reduce((a, s) => a + (parseFloat(s.exam_score) || 0), 0);
  const grandTotal = subjects.reduce((a, s) => a + s.total, 0);

  async function handleHeaderImageUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be 5MB or smaller.');
      return;
    }

    setUploadingHeader(true);
    const bucketName = 'student-photos';
    const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filePath = `report-card-header/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

    if (uploadError) {
      setUploadingHeader(false);
      alert(`Failed to upload header image: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    setHeaderImageUrl(urlData.publicUrl);
    setUploadingHeader(false);
    if (headerInputRef.current) headerInputRef.current.value = '';
  }

  async function save() {
    setSaving(true);
    const payload = {
      student_id: selectedStudentId || null,
      pupil_name: form.pupil_name,
      class_form: form.class_form,
      term: form.term,
      academic_year: form.academic_year,
      vacation_date: form.vacation_date,
      reopening_date: form.reopening_date,
      next_term_fees: form.next_term_fees,
      fees_in_arrears: form.fees_in_arrears,
      total_fees_due: form.total_fees_due,
      no_on_roll: parseInt(form.no_on_roll) || 0,
      days_out: parseInt(form.days_out) || 0,
      repeated: form.repeated,
      promoted_to: form.promoted_to,
      overall_grade: form.overall_grade,
      attendance: parseInt(form.attendance) || 0,
      conduct: form.conduct,
      interest: form.interest,
      teachers_remarks: form.teachers_remarks,
      headmaster_remarks: form.headmaster_remarks,
      header_image_url: headerImageUrl,
    };

    let cardId = card?.id;
    if (cardId) {
      const { error: updateError } = await supabase.from('report_cards').update(payload).eq('id', cardId);
      if (updateError) {
        setSaving(false);
        alert(`Could not update report card: ${updateError.message}`);
        return;
      }

      const { error: deleteError } = await supabase.from('report_card_subjects').delete().eq('report_card_id', cardId);
      if (deleteError) {
        setSaving(false);
        alert(`Could not refresh report card subjects: ${deleteError.message}`);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase.from('report_cards').insert(payload).select().single();
      if (insertError) {
        setSaving(false);
        alert(`Could not create report card: ${insertError.message}`);
        return;
      }
      cardId = data?.id;
    }

    if (cardId) {
      const { error: subjectsError } = await supabase.from('report_card_subjects').insert(
        subjects.map((s) => ({
          report_card_id: cardId,
          subject_name: s.subject_name,
          class_score: parseFloat(s.class_score) || 0,
          exam_score: parseFloat(s.exam_score) || 0,
          grade: s.grade,
          grade_label: s.grade_label,
          teacher_remarks: s.teacher_remarks,
          sort_order: s.sort_order,
        }))
      );

      if (subjectsError) {
        setSaving(false);
        alert(`Could not save subject scores: ${subjectsError.message}`);
        return;
      }

      // Recalculate positions for this class+term+year group
      const { data: siblings } = await supabase
        .from('report_cards')
        .select('id')
        .eq('class_form', form.class_form)
        .eq('term', form.term)
        .eq('academic_year', form.academic_year);

      if (siblings && siblings.length > 1) {
        const siblingIds = siblings.map((s: any) => s.id);
        const { data: subjectTotals } = await supabase
          .from('report_card_subjects')
          .select('report_card_id, total')
          .in('report_card_id', siblingIds);

        const grandTotals: Record<string, number> = {};
        subjectTotals?.forEach((r: any) => {
          grandTotals[r.report_card_id] = (grandTotals[r.report_card_id] ?? 0) + (r.total ?? 0);
        });

        const ranked = Object.entries(grandTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([id], i) => ({ id, position: i + 1 }));

        for (const { id, position } of ranked) {
          await supabase.from('report_cards').update({ position }).eq('id', id);
        }
      } else if (cardId) {
        await supabase.from('report_cards').update({ position: 1 }).eq('id', cardId);
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            {card ? 'Edit Report Card' : 'New Report Card'}
          </h1>
          <p className="text-sm text-slate-500">Fill in scores — totals and grades auto-calculate</p>
        </div>
        <div className="ml-auto flex gap-2">
          {card && (
            <Button variant="secondary" onClick={() => onPrint(card.id)}>
              <Printer size={16} /> Preview & Print
            </Button>
          )}
          <Button onClick={save} disabled={saving || !form.pupil_name}>
            {saving ? 'Saving...' : 'Save Report Card'}
          </Button>
        </div>
      </div>

      {/* Pupil Info */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pupil Information</h2>
          <div className="flex items-center gap-3">
            <input
              ref={headerInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleHeaderImageUpload(file);
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => headerInputRef.current?.click()}
              disabled={uploadingHeader}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              {uploadingHeader ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={14} /> {headerImageUrl ? 'Replace right image' : 'Upload right image'}
                </>
              )}
            </button>
            {headerImageUrl && (
              <button
                type="button"
                onClick={() => setHeaderImageUrl(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100"
              >
                <X size={12} /> Remove
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-end">
          <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
            {headerImageUrl ? (
              <img src={headerImageUrl} alt="Report card right side" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-center text-[10px] uppercase tracking-wide text-slate-400">Right-side image</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Link to Student (optional)">
            <Select
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                const s = students.find((st) => st.id === e.target.value);
                if (s) setForm((f) => ({ ...f, pupil_name: `${s.first_name} ${s.last_name}` }));
              }}
            >
              <option value="">Manual entry</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pupil's Name" required>
            <TextInput
              value={form.pupil_name}
              onChange={(e) => setForm({ ...form, pupil_name: e.target.value })}
              placeholder="APOSTLE GEORGE Y.N."
            />
          </Field>
          <Field label="Class / Form">
            <TextInput
              value={form.class_form}
              onChange={(e) => setForm({ ...form, class_form: e.target.value })}
              placeholder="BS 1"
            />
          </Field>
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
              placeholder="2024"
            />
          </Field>
          <Field label="No. on Roll">
            <TextInput
              type="number"
              value={form.no_on_roll}
              onChange={(e) => setForm({ ...form, no_on_roll: e.target.value })}
            />
          </Field>
          <Field label="Vacation Date">
            <TextInput
              value={form.vacation_date}
              onChange={(e) => setForm({ ...form, vacation_date: e.target.value })}
              placeholder="20-Dec-24"
            />
          </Field>
          <Field label="Re-opening Date">
            <TextInput
              value={form.reopening_date}
              onChange={(e) => setForm({ ...form, reopening_date: e.target.value })}
              placeholder="08-Jan-25"
            />
          </Field>
          <Field label="Next Term Fees">
            <TextInput
              value={form.next_term_fees}
              onChange={(e) => setForm({ ...form, next_term_fees: e.target.value })}
            />
          </Field>
          <Field label="Fees in Arrears">
            <TextInput
              value={form.fees_in_arrears}
              onChange={(e) => setForm({ ...form, fees_in_arrears: e.target.value })}
            />
          </Field>
          <Field label="Total Fees Due">
            <TextInput
              value={form.total_fees_due}
              onChange={(e) => setForm({ ...form, total_fees_due: e.target.value })}
            />
          </Field>
          <Field label="Days Out">
            <TextInput
              type="number"
              value={form.days_out}
              onChange={(e) => setForm({ ...form, days_out: e.target.value })}
            />
          </Field>
          <Field label="Attendance (Days)">
            <TextInput
              type="number"
              value={form.attendance}
              onChange={(e) => setForm({ ...form, attendance: e.target.value })}
            />
          </Field>
          <Field label="Promoted To">
            <TextInput
              value={form.promoted_to}
              onChange={(e) => setForm({ ...form, promoted_to: e.target.value })}
            />
          </Field>
          <Field label="Overall Grade">
            <TextInput
              value={form.overall_grade}
              onChange={(e) => setForm({ ...form, overall_grade: e.target.value })}
            />
          </Field>
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="repeated"
              checked={form.repeated}
              onChange={(e) => setForm({ ...form, repeated: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <label htmlFor="repeated" className="text-sm font-medium text-slate-700">Repeated</label>
          </div>
        </div>
      </div>

      {/* Subject Scores */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Subject Scores</h2>
          <p className="text-xs text-slate-400">Class Score and Exam Score are each out of 50. Total and Grade auto-calculate.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-800 text-white text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold w-44">Subject</th>
                <th className="px-4 py-3 text-center font-semibold">Class Score /50</th>
                <th className="px-4 py-3 text-center font-semibold">Exam Score /50</th>
                <th className="px-4 py-3 text-center font-semibold">Total</th>
                <th className="px-4 py-3 text-center font-semibold">Grade</th>
                <th className="px-4 py-3 text-left font-semibold">Teacher's Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subjects.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{s.subject_name}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={s.class_score}
                      onChange={(e) => updateScore(i, 'class_score', e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-center text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 mx-auto block"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={s.exam_score}
                      onChange={(e) => updateScore(i, 'exam_score', e.target.value)}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-center text-sm text-slate-800 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 mx-auto block"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold text-slate-800">{s.total}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                      s.grade <= 2 ? 'bg-emerald-100 text-emerald-700' :
                      s.grade <= 4 ? 'bg-sky-100 text-sky-700' :
                      s.grade <= 6 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {s.grade} — {s.grade_label}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={s.teacher_remarks}
                      onChange={(e) => updateRemark(i, e.target.value)}
                      placeholder="e.g. Excellent"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-300 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 text-white">
                <td className="px-4 py-3 font-bold text-sm">GRAND TOTAL</td>
                <td className="px-4 py-3 text-center font-bold text-sm">{grandClassTotal}</td>
                <td className="px-4 py-3 text-center font-bold text-sm">{grandExamTotal}</td>
                <td className="px-4 py-3 text-center font-bold text-lg text-yellow-300">{grandTotal}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bottom section */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Remarks & Signatures</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Conduct">
            <TextInput
              value={form.conduct}
              onChange={(e) => setForm({ ...form, conduct: e.target.value })}
              placeholder="e.g. Active in class"
            />
          </Field>
          <Field label="Interest">
            <TextInput
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
              placeholder="e.g. Making Friends"
            />
          </Field>
          <Field label="Teacher's Remarks">
            <TextInput
              value={form.teachers_remarks}
              onChange={(e) => setForm({ ...form, teachers_remarks: e.target.value })}
            />
          </Field>
          <Field label="Headmaster's Remarks">
            <TextInput
              value={form.headmaster_remarks}
              onChange={(e) => setForm({ ...form, headmaster_remarks: e.target.value })}
              placeholder="e.g. Keep it up"
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onBack}>Cancel</Button>
        <Button onClick={save} disabled={saving || !form.pupil_name}>
          {saving ? 'Saving...' : 'Save Report Card'}
        </Button>
      </div>
    </div>
  );
}
