import Switch from "./switch.tsx";
import Skeleton from "./skeleton.tsx";

type Habit = {
  id: string;
  name: string;
  createdAt?: any;
  targetPerDay?: number;
};

type Props = {
  habits: Habit[];
  loading: boolean;
  checkins: Record<string, boolean>;
  onToggle: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
};

export default function HabitsList({
  habits,
  loading,
  checkins,
  onToggle,
  onEdit,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="p-4 space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="font-semibold text-slate-800">Your Habits</h2>
      </div>
      {habits.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <div className="mx-auto mb-3 text-3xl">🌱</div>
          <p className="text-slate-700">
            No habits yet — add your first one above.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200">
          {habits.map((h) => {
            const done = !!checkins[h.id];
            return (
              <li
                key={h.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    id={`chk-${h.id}`}
                    checked={done}
                    onChange={() => onToggle(h.id)}
                  />
                  <div>
                    <div className="font-medium text-slate-800">{h.name}</div>
                    <div
                      className={`text-xs ${done ? "text-emerald-700" : "text-slate-500"}`}
                    >
                      {done ? "Completed today" : "Not yet"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-slate-700 hover:text-sky-700 text-sm px-2 py-1 rounded-lg hover:bg-slate-100"
                    onClick={() => onEdit(h)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-white bg-red-600 hover:bg-red-700 text-sm px-3 py-1.5 rounded-lg"
                    onClick={() => onDelete(h)}
                  >
                    Delete
                  </button>
                  {/*<span*/}
                  {/*  className={`text-xs rounded-full px-2 py-1 border ${done ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-700 bg-white"}`}*/}
                  {/*>*/}
                  {/*  Daily*/}
                  {/*</span>*/}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
