import React from "react";

type Props = {
  newHabit: string;
  setNewHabit: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export default function AddHabitForm({
  newHabit,
  setNewHabit,
  onSubmit,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold mb-3 text-slate-800">Add a Habit</h2>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="e.g., Drink water, Read 10 pages"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:ring-4 focus:ring-sky-200/80"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-sky-600 text-white px-4 py-2.5 hover:bg-sky-700 transition shadow-sm"
          >
            Add
          </button>
          {newHabit && (
            <button
              type="button"
              onClick={() => setNewHabit("")}
              className="rounded-xl border border-slate-300 px-4 py-2.5 hover:bg-slate-50 transition"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
