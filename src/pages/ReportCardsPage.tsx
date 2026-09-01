import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ReportCard, ReportCardSubject } from '@/types';
import { EmptyState } from '@/components/EmptyState';
import { Badge, PageHeader, Spinner } from '@/components/ui';
import { Button } from '@/components/Form';
import { FileText, Plus, Pencil, Trash2, Search, Printer, Eye } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui';
import { ReportCardEditor } from './ReportCardEditor';
import { ReportCardView } from './ReportCardView';

type CardWithSubjects = ReportCard & { subjects: ReportCardSubject[] };

export function ReportCardsPage({ teacherEmail }: { teacherEmail?: string | null }) {
  const [cards, setCards] = useState<CardWithSubjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'edit' | 'print'>('list');
  const [editingCard, setEditingCard] = useState<CardWithSubjects | undefined>(undefined);
  const [printingCard, setPrintingCard] = useState<CardWithSubjects | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, [teacherEmail]);

  async function loadCards() {
    setLoading(true);
    const normalizedTeacherEmail = (teacherEmail ?? '').trim().toLowerCase();
    
    if (normalizedTeacherEmail) {
      // Load only report cards for students in teacher's class
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('class')
        .ilike('email', normalizedTeacherEmail)
        .maybeSingle();

      if (!teacherData || !teacherData.class) {
        setCards([]);
        setLoading(false);
        return;
      }

      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('class', teacherData.class);

      if (!students || students.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      const studentIds = students.map((s) => s.id);

      const { data } = await supabase
        .from('report_cards')
        .select('*, subjects:report_card_subjects(*)')
        .in('student_id', studentIds)
        .order('created_at', { ascending: false });

      const sorted = (data ?? []).map((c: any) => ({
        ...c,
        subjects: (c.subjects ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
      setCards(sorted);
    } else {
      // Admin view: show all
      const { data } = await supabase
        .from('report_cards')
        .select('*, subjects:report_card_subjects(*)')
        .order('created_at', { ascending: false });

      const sorted = (data ?? []).map((c: any) => ({
        ...c,
        subjects: (c.subjects ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
      setCards(sorted);
    }
    
    setLoading(false);
  }

  async function remove() {
    if (!deleteId) return;
    await supabase.from('report_cards').delete().eq('id', deleteId);
    setDeleteId(null);
    await loadCards();
  }

  function openPrint(id: string) {
    const card = cards.find((c) => c.id === id);
    if (card) {
      setPrintingCard(card);
      setView('print');
    }
  }

  const filtered = cards.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.pupil_name.toLowerCase().includes(q) ||
      c.class_form.toLowerCase().includes(q) ||
      c.term.toLowerCase().includes(q)
    );
  });

  if (view === 'edit') {
    return (
      <ReportCardEditor
        card={editingCard}
        teacherEmail={teacherEmail}
        onBack={() => {
          setEditingCard(undefined);
          setView('list');
        }}
        onSaved={() => {
          setEditingCard(undefined);
          setView('list');
          loadCards();
        }}
        onPrint={openPrint}
      />
    );
  }

  if (view === 'print' && printingCard) {
    return (
      <ReportCardView
        card={printingCard}
        onBack={() => {
          setPrintingCard(undefined);
          setView('list');
        }}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Report Cards"
        subtitle={`${cards.length} report cards generated`}
        action={
          <Button onClick={() => { setEditingCard(undefined); setView('edit'); }}>
            <Plus size={18} /> New Report Card
          </Button>
        }
      />

      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by pupil name, class, or term..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="No report cards found"
          message={search ? "No report cards match your search." : "Create your first report card to get started."}
          action={
            !search ? (
              <Button onClick={() => { setEditingCard(undefined); setView('edit'); }}>
                <Plus size={18} /> New Report Card
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const grandTotal = c.subjects.reduce((a, s) => a + s.total, 0);
            return (
              <div
                key={c.id}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <FileText size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{c.pupil_name}</h3>
                      <p className="text-xs text-slate-400">{c.class_form} · {c.term} · {c.academic_year}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => openPrint(c.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="View & Print"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => { setEditingCard(c); setView('edit'); }}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                  <div>
                    <p className="text-xs text-slate-400">Total Score</p>
                    <p className="text-xl font-bold text-slate-800">{grandTotal}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Position</p>
                    <div className="flex items-center gap-1.5">
                      <Badge color={c.position && c.position <= 3 ? 'green' : 'blue'}>
                        {c.position ? `${ordinal(c.position)}` : '—'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openPrint(c.id)}
                    className="flex-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    <Printer size={13} className="mr-1 inline" /> Print
                  </button>
                  <button
                    onClick={() => { setEditingCard(c); setView('edit'); }}
                    className="flex-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    <Pencil size={13} className="mr-1 inline" /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title="Delete Report Card"
        message="This report card and all its subject scores will be permanently removed."
      />
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
