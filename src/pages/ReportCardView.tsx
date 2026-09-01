import type { ReportCard, ReportCardSubject } from '@/types';
import { ArrowLeft, Printer } from 'lucide-react';
import logo from '/Sarp_Logo.jpg';

type Props = {
  card: ReportCard & { subjects: ReportCardSubject[] };
  onBack: () => void;
};

export function ReportCardView({ card, onBack }: Props) {
  const grandClassTotal = card.subjects.reduce((a, s) => a + s.class_score, 0);
  const grandExamTotal = card.subjects.reduce((a, s) => a + s.exam_score, 0);
  const grandTotal = card.subjects.reduce((a, s) => a + s.total, 0);

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="text-xl font-bold text-slate-800">Report Card Preview</h1>
        <button
          onClick={handlePrint}
          className="ml-auto flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
        >
          <Printer size={16} /> Print
        </button>
      </div>

      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg print:max-w-none print:border-0 print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-4 text-left">
            <img
              src={logo}
              alt="School logo"
              className="h-20 w-20 rounded-xl object-cover ring-2 ring-slate-200 shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-800">
                Sarp Educational Complex
              </h1>
              <p className="mt-1 text-sm text-slate-600">P.O. Box 1234, Accra · Tel: 030-000-0000</p>
              <h2 className="mt-3 text-lg font-semibold uppercase text-slate-700">
                Terminal Report Sheet
              </h2>
            </div>
          </div>

          <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
            {card.header_image_url ? (
              <img src={card.header_image_url} alt="Report card right side image" className="h-full w-full object-cover print:visible" />
            ) : (
              <span className="px-2 text-center text-[10px] uppercase tracking-wide text-slate-400">Right-side image</span>
            )}
          </div>
        </div>

        {/* Pupil info grid */}
        <div className="mt-4">
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Pupil's Name</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{card.pupil_name}</p>
              <p className="mt-2 text-sm font-semibold text-sky-700">{card.class_form}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <InfoField label="Term" value={card.term} />
            <InfoField label="Academic Year" value={card.academic_year} />
            <InfoField label="No. on Roll" value={String(card.no_on_roll)} />
            <InfoField label="Days Out" value={String(card.days_out)} />
            <InfoField label="Vacation Date" value={card.vacation_date || '—'} />
            <InfoField label="Re-opening Date" value={card.reopening_date || '—'} />
            <InfoField label="Attendance" value={`${card.attendance} days`} />
          </div>
        </div>

        {/* Subject Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-2 border-slate-800 text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="border border-slate-600 px-3 py-2 text-left font-semibold">Subject</th>
                <th className="border border-slate-600 px-3 py-2 text-center font-semibold">Class Score<br /><span className="text-xs font-normal opacity-80">/50</span></th>
                <th className="border border-slate-600 px-3 py-2 text-center font-semibold">Exam Score<br /><span className="text-xs font-normal opacity-80">/50</span></th>
                <th className="border border-slate-600 px-3 py-2 text-center font-semibold">Total</th>
                <th className="border border-slate-600 px-3 py-2 text-center font-semibold">Grade</th>
                <th className="border border-slate-600 px-3 py-2 text-left font-semibold">Teacher's Remarks</th>
              </tr>
            </thead>
            <tbody>
              {card.subjects.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-300 px-3 py-2 font-medium text-slate-700">{s.subject_name}</td>
                  <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">{s.class_score}</td>
                  <td className="border border-slate-300 px-3 py-2 text-center text-slate-600">{s.exam_score}</td>
                  <td className="border border-slate-300 px-3 py-2 text-center font-bold text-slate-800">{s.total}</td>
                  <td className="border border-slate-300 px-3 py-2 text-center">
                    <span className="font-semibold text-slate-700">{s.grade}</span>
                    <span className="ml-1 text-xs text-slate-500">{s.grade_label}</span>
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-slate-600">{s.teacher_remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-800 text-white">
                <td className="border border-slate-600 px-3 py-2.5 font-bold">GRAND TOTAL</td>
                <td className="border border-slate-600 px-3 py-2.5 text-center font-bold">{grandClassTotal}</td>
                <td className="border border-slate-600 px-3 py-2.5 text-center font-bold">{grandExamTotal}</td>
                <td className="border border-slate-600 px-3 py-2.5 text-center text-lg font-bold text-yellow-300">{grandTotal}</td>
                <td colSpan={2} className="border border-slate-600" />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Position & Overall */}
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">Position in Class</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">
              {card.position ? ordinal(card.position) : '—'}
            </p>
          </div>
          <div className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">Overall Grade</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{card.overall_grade || '—'}</p>
          </div>
          <div className="flex-1 rounded-lg border-2 border-slate-300 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">Promoted To</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{card.promoted_to || '—'}</p>
          </div>
        </div>

        {/* Conduct / Interest / Remarks */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RemarkField label="Conduct" value={card.conduct} />
          <RemarkField label="Interest" value={card.interest} />
          <RemarkField label="Class Teacher's Remarks" value={card.teachers_remarks} />
          <RemarkField label="Headmaster's Remarks" value={card.headmaster_remarks} />
        </div>

        {/* Fees */}
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Fees Summary</h3>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <InfoField label="Next Term Fees" value={card.next_term_fees} />
            <InfoField label="Fees in Arrears" value={card.fees_in_arrears} />
            <InfoField label="Total Fees Due" value={card.total_fees_due} />
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-1">
              <p className="font-medium text-slate-600">Class Teacher's Signature</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 pt-1">
              <p className="font-medium text-slate-600">Headmaster's Signature</p>
            </div>
          </div>
        </div>

        {card.repeated && (
          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-700">
            This pupil will repeat the class
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}: </span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function RemarkField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700">{value || '—'}</p>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
