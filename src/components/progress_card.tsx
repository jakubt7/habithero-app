type Props = { completed: number; total: number; progress: number };

export default function ProgressCard({ completed, total, progress }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Today’s Progress</h2>
        <span className="text-sm text-slate-600">
          {completed} / {total} completed
        </span>
      </div>
      <div className="mt-3 h-3 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-sm font-medium text-slate-700">{progress}%</div>
    </section>
  );
}
