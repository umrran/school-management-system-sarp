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
          className="ml-auto flex items-center gap-2 rounded-lg bg-[#30369C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#28339A]"
        >
          <Printer size={16} /> Print
        </button>
      </div>

      {/* Gold background wrapper */}
      <div className="bg-[#FFD21A] p-3 print:p-2" style={{ backgroundColor: '#FFD21A', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div className="mx-auto max-w-4xl rounded-lg border-2 border-[#222222] bg-white p-4 shadow-lg print:max-w-none print:border-2 print:shadow-none print:p-3">
          {/* Header - School name bar (royal blue) */}
          <div className="bg-[#30369C] py-2 px-4 text-center rounded-t-md">
            <h1 className="text-xl font-bold uppercase tracking-wider text-white">
              Sarp Educational Complex
            </h1>
          </div>

          {/* Address / contact bar (darker blue) */}
          <div className="bg-[#28339A] py-1 px-3 text-center">
            <p className="text-[10px] text-white">P.O BOX 1015-SUAME.KSI</p>
            <p className="text-[10px] text-white">Tel: 0244833275/0253965361</p>
          </div>

          {/* Logo + Terminal Report title + image */}
          <div className="flex items-center justify-between gap-3 border-b-2 border-[#222222] py-2">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="School logo"
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider text-[#30369C]">
                  Sarp Educational Complex
                </h2>
                <p className="text-[10px] text-[#222222]">Academic Excellence Since 2000</p>
              </div>
            </div>

            <div className="flex h-16 w-20 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#DDDDDD] bg-[#DDDDDD]">
              {card.header_image_url ? (
                <img src={card.header_image_url} alt="Report card right side image" className="h-full w-full object-cover" />
              ) : (
                <span className="px-1 text-center text-[8px] uppercase tracking-wide text-slate-500">Image</span>
              )}
            </div>
          </div>

          {/* Pupil info grid */}
          <div className="mt-2">
            <div className="mb-2 rounded border-2 border-[#30369C] bg-white p-2">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wide text-[#30369C]">Pupil's Name</p>
                <p className="mt-0.5 text-lg font-bold text-[#050505]">{card.pupil_name}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#30369C]">{card.class_form}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
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
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-2 border-[#222222] text-sm">
              <thead>
                <tr className="bg-[#30369C] text-white">
                  <th className="border border-[#222222] px-2 py-1.5 text-left font-semibold text-sm">Subject</th>
                  <th className="border border-[#222222] px-2 py-1.5 text-center font-semibold text-sm">Class Score<br /><span className="text-[10px] font-normal opacity-90">/50</span></th>
                  <th className="border border-[#222222] px-2 py-1.5 text-center font-semibold text-sm">Exam Score<br /><span className="text-[10px] font-normal opacity-90">/50</span></th>
                  <th className="border border-[#222222] px-2 py-1.5 text-center font-semibold text-sm">Total</th>
                  <th className="border border-[#222222] px-2 py-1.5 text-center font-semibold text-sm">Grade</th>
                  <th className="border border-[#222222] px-2 py-1.5 text-left font-semibold text-sm">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {card.subjects.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#E7E7E7]/30'}>
                    <td className="border border-[#E7E7E7] bg-white px-2 py-1 font-medium text-[#050505] text-sm">{s.subject_name}</td>
                    <td className="border border-[#E7E7E7] px-2 py-1 text-center text-[#222222] text-sm">{s.class_score}</td>
                    <td className="border border-[#E7E7E7] px-2 py-1 text-center text-[#222222] text-sm">{s.exam_score}</td>
                    <td className="border border-[#E7E7E7] px-2 py-1 text-center font-bold text-[#050505] text-sm">{s.total}</td>
                    <td className="border border-[#E7E7E7] px-2 py-1 text-center text-sm">
                      <span className="font-semibold text-[#30369C]">{s.grade}</span>
                    </td>
                    <td className="border border-[#E7E7E7] px-2 py-1 text-[#222222] text-sm">
                      {s.teacher_remarks ? (
                        <span>
                          <span className="font-medium text-[#050505]">{s.grade_label}</span>
                          {s.teacher_remarks !== '—' && (
                            <span className="ml-1 text-[#222222]">· {s.teacher_remarks}</span>
                          )}
                        </span>
                      ) : (
                        <span className="font-medium text-[#050505]">{s.grade_label}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#222222] text-white">
                  <td className="border border-[#222222] px-2 py-1.5 font-bold text-sm">GRAND TOTAL</td>
                  <td className="border border-[#222222] px-2 py-1.5 text-center font-bold text-sm">{grandClassTotal}</td>
                  <td className="border border-[#222222] px-2 py-1.5 text-center font-bold text-sm">{grandExamTotal}</td>
                  <td className="border border-[#222222] px-2 py-1.5 text-center text-lg font-bold text-[#FFD21A]">{grandTotal}</td>
                  <td colSpan={2} className="border border-[#222222]" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Position & Overall */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex-1 rounded border-2 border-[#30369C] bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#30369C]">Position in Class</p>
              <p className="mt-0.5 text-lg font-bold text-[#050505]">
                {card.position ? ordinal(card.position) : '—'}
              </p>
            </div>
            <div className="flex-1 rounded border-2 border-[#30369C] bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#30369C]">Overall Grade</p>
              <p className="mt-0.5 text-lg font-bold text-[#050505]">{card.overall_grade || '—'}</p>
            </div>
            <div className="flex-1 rounded border-2 border-[#30369C] bg-white px-3 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#30369C]">Promoted To</p>
              <p className="mt-0.5 text-lg font-bold text-[#050505]">{card.promoted_to || '—'}</p>
            </div>
          </div>

          {/* Conduct / Interest / Remarks */}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <RemarkField label="Conduct" value={card.conduct} />
            <RemarkField label="Interest" value={card.interest} />
            <RemarkField label="Class Teacher's Remarks" value={card.teachers_remarks} />
            <RemarkField label="Headmaster's Remarks" value={card.headmaster_remarks} />
          </div>

          {/* Fees */}
          <div className="mt-2 rounded border-2 border-[#30369C] bg-white p-2">
            <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#30369C]">Fees Summary</h3>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <InfoField label="Next Term Fees" value={card.next_term_fees} />
              <InfoField label="Fees in Arrears" value={card.fees_in_arrears} />
              <InfoField label="Total Fees Due" value={card.total_fees_due} />
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-5 grid grid-cols-2 gap-6 text-sm">
            <div className="text-center">
              <div className="border-t-2 border-[#222222] pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#30369C]">Class Teacher's Signature</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-[#222222] pt-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#30369C]">Headmaster's Signature</p>
              </div>
            </div>
          </div>

          {card.repeated && (
            <div className="mt-3 rounded border-2 border-[#222222] bg-[#FFD21A] px-3 py-1.5 text-center text-sm font-bold text-[#222222]">
              This pupil will repeat the class
            </div>
          )}

          {/* Bottom decorative gold strip */}
          <div className="mt-3 h-2 rounded-b-md bg-[#FFD21A]"></div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#30369C]">{label}: </span>
      <span className="font-semibold text-[#050505]">{value}</span>
    </div>
  );
}

function RemarkField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border-2 border-[#30369C] bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#30369C]">{label}</p>
      <p className="mt-0.5 text-sm text-[#050505]">{value || '—'}</p>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
