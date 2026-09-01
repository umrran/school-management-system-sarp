import type { FeePayment } from '@/types';
import { ArrowLeft, Printer } from 'lucide-react';

type Props = {
  payment: FeePayment;
  onBack: () => void;
};

export function ReceiptView({ payment, onBack }: Props) {
  function handlePrint() {
    window.print();
  }

  const date = new Date(payment.payment_date);
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft size={18} /> Back to Fees
        </button>
        <h1 className="text-xl font-bold text-slate-800">Receipt Preview</h1>
        <button
          onClick={handlePrint}
          className="ml-auto flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
        >
          <Printer size={16} /> Print Receipt
        </button>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border-2 border-slate-800 bg-white p-8 shadow-lg print:max-w-none print:border-0 print:shadow-none print:p-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-600 text-white">
                <span className="text-xl font-bold">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide text-slate-800">
                  Sarp Educational Complex
                </h1>
                <p className="text-xs text-slate-500">P.O. Box 1234, Accra · Tel: 030-000-0000</p>
                <p className="text-xs text-slate-500">Email: info@sarpedu.com</p>
              </div>
            </div>
            <div className="text-right">
              <div className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Official Receipt
              </div>
            </div>
          </div>

          {/* Receipt title */}
          <div className="mt-4 text-center">
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-700">
              Fee Payment Receipt
            </h2>
          </div>

          {/* Receipt info grid */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-400">Receipt No:</span>
              <span className="font-mono font-semibold text-slate-700">{payment.receipt_no}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-400">Date:</span>
              <span className="font-semibold text-slate-700">{dateStr}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-400">Student Name:</span>
              <span className="font-semibold text-slate-700">{payment.student_name}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-400">Class / Form:</span>
              <span className="font-semibold text-slate-700">{payment.class_form || '—'}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-400">Term:</span>
              <span className="font-semibold text-slate-700">{payment.term}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-400">Academic Year:</span>
              <span className="font-semibold text-slate-700">{payment.academic_year}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-400">Payment Type:</span>
              <span className="font-semibold capitalize text-slate-700">{payment.payment_type}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-400">Payment Method:</span>
              <span className="font-semibold capitalize text-slate-700">{payment.payment_method}</span>
            </div>
          </div>

          {/* Amount box */}
          <div className="mt-5 rounded-xl border-2 border-slate-800 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Amount Paid</p>
                <p className="mt-1 text-3xl font-bold text-slate-800">
                  GH¢ {Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </div>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Amount in Words</p>
              <p className="mt-0.5 text-sm font-medium text-slate-700">{payment.amount_in_words}</p>
            </div>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="mt-4 rounded-lg border border-slate-200 px-4 py-2.5">
              <p className="text-xs uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-0.5 text-sm text-slate-600">{payment.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 flex items-end justify-between">
            <div className="text-xs text-slate-400">
              <p>This is a computer-generated receipt.</p>
              <p>Valid without signature.</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-t border-slate-400 pt-1">
                <p className="text-sm font-medium text-slate-600">Authorized Signature</p>
              </div>
            </div>
          </div>

          {/* Stamp */}
          <div className="mt-4 flex justify-end">
            <div className="rotate-[-12deg] rounded-lg border-2 border-sky-200 px-4 py-1.5 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">Paid</p>
              <p className="text-[10px] text-sky-400">{dateStr}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
