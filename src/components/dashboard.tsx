import { useEffect, useMemo, useState } from "react";
import { auth, provider, db } from "../firebase";
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import HabitHeroLogo from "../assets/habitherologo2.png";

const todayKey = () => new Date().toISOString().slice(0, 10);

type Habit = {
  id: string;
  name: string;
  createdAt?: any;
  targetPerDay?: number;
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

function Switch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: () => void;
  id: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-sky-500" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
      <span className="sr-only">{id}</span>
    </button>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 id="modal-title" className="text-lg font-semibold text-slate-800">
            {title}
          </h3>
        </div>
        <div className="px-5 py-4 text-slate-700">{children}</div>
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<string, boolean>>({});
  const [newHabit, setNewHabit] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setCheckins({});
      setLoading(false);
      return;
    }

    setLoading(true);

    const habitsCol = collection(db, "users", user.uid, "habits");
    const habitsQ = query(habitsCol, orderBy("createdAt", "asc"));
    const unsubHabits = onSnapshot(habitsQ, (snap) => {
      const list: Habit[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setHabits(list);
    });

    const date = todayKey();
    const checkDocRef = doc(db, "users", user.uid, "checkins", date);
    const unsubCheckins = onSnapshot(checkDocRef, (snap) => {
      const data = snap.data() as
        | { completed?: Record<string, boolean> }
        | undefined;
      setCheckins(data?.completed ?? {});
      setLoading(false);
    });

    return () => {
      unsubHabits();
      unsubCheckins();
    };
  }, [user]);

  const completedCount = useMemo(
    () => habits.filter((h) => checkins[h.id]).length,
    [habits, checkins],
  );

  const progress = useMemo(() => {
    if (habits.length === 0) return 0;
    return Math.round((completedCount / habits.length) * 100);
  }, [habits.length, completedCount]);

  async function handleGoogleSignIn() {
    await signInWithPopup(auth, provider);
  }

  async function handleDemoSignIn() {
    await signInAnonymously(auth);
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newHabit.trim()) return;

    const colRef = collection(db, "users", user.uid, "habits");
    await addDoc(colRef, {
      name: newHabit.trim(),
      createdAt: serverTimestamp(),
    });
    setNewHabit("");
  }

  async function toggleCheck(habitId: string) {
    if (!user) return;

    const date = todayKey();
    const ref = doc(db, "users", user.uid, "checkins", date);
    const snap = await getDoc(ref);
    const existing = (snap.data() as any) || {};

    const current = existing.completed?.[habitId] ?? false;
    const next = { ...(existing.completed ?? {}), [habitId]: !current };

    if (!snap.exists()) {
      await setDoc(ref, { date, completed: next, ts: serverTimestamp() });
    } else {
      await updateDoc(ref, { completed: next, ts: serverTimestamp() });
    }
  }

  function openEdit(habit: Habit) {
    setSelectedHabit(habit);
    setEditName(habit.name);
    setEditOpen(true);
  }

  function openDelete(habit: Habit) {
    setSelectedHabit(habit);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!user || !selectedHabit) return;
    const habitRef = doc(db, "users", user.uid, "habits", selectedHabit.id);
    await deleteDoc(habitRef);
    const date = todayKey();
    const checkRef = doc(db, "users", user.uid, "checkins", date);
    const snap = await getDoc(checkRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      if (data.completed && data.completed[selectedHabit.id]) {
        const { [selectedHabit.id]: _removed, ...rest } = data.completed;
        await updateDoc(checkRef, { completed: rest, ts: serverTimestamp() });
      }
    }

    setDeleteOpen(false);
    setSelectedHabit(null);
  }

  async function saveEdit() {
    if (!user || !selectedHabit || !editName.trim()) return;
    const habitRef = doc(db, "users", user.uid, "habits", selectedHabit.id);
    await updateDoc(habitRef, { name: editName.trim() });
    setEditOpen(false);
    setSelectedHabit(null);
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-lg p-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-xl">
            <img
              src={HabitHeroLogo}
              alt="habitherologo"
              className="h-20 w-20 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            HabitHero
          </h1>
          <p className="mt-2 text-slate-600">
            Sign in to start tracking your daily wins.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleGoogleSignIn}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2.5 hover:opacity-95 active:opacity-90 transition shadow-sm"
            >
              Continue with Google
            </button>
            <button
              onClick={handleDemoSignIn}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 hover:bg-slate-50 transition"
              title="Uses Firebase Anonymous Auth"
            >
              Try a Demo (no Google)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userInitial = user.isAnonymous
    ? "D"
    : (user.email?.[0]?.toUpperCase() ?? "U");
  const userLabel = user.isAnonymous ? "Demo user" : user.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-emerald-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg">
                <img
                  src={HabitHeroLogo}
                  alt="habitherologo"
                  className="h-9 w-9 object-contain"
                />
              </div>
              <span className="font-semibold tracking-tight text-slate-800">
                HabitHero
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white text-xs font-bold">
                  {userInitial}
                </div>
                <span className="text-sm text-slate-700">{userLabel}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Today’s Progress</h2>
            <span className="text-sm text-slate-600">
              {completedCount} / {habits.length} completed
            </span>
          </div>
          <div className="mt-3 h-3 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-sm font-medium text-slate-700">
            {progress}%
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold mb-3 text-slate-800">Add a Habit</h2>
          <form onSubmit={addHabit} className="flex flex-col sm:flex-row gap-3">
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
        <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold text-slate-800">Your Habits</h2>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : habits.length === 0 ? (
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
                        onChange={() => toggleCheck(h.id)}
                      />
                      <div>
                        <div className="font-medium text-slate-800">
                          {h.name}
                        </div>
                        <div
                          className={`text-xs ${
                            done ? "text-emerald-700" : "text-slate-500"
                          }`}
                        >
                          {done ? "Completed today" : "Not yet"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="text-slate-700 hover:text-sky-700 text-sm px-2 py-1 rounded-lg hover:bg-slate-100"
                        onClick={() => openEdit(h)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-white bg-red-600 hover:bg-red-700 text-sm px-3 py-1.5 rounded-lg"
                        onClick={() => openDelete(h)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} HabitHero - Jakub Tomaszewski
      </footer>
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete habit?"
        footer={
          <>
            <button
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-lg bg-red-600 text-white px-3 py-1.5 hover:bg-red-700"
            >
              Delete
            </button>
          </>
        }
      >
        <p>
          This action will remove{" "}
          <span className="font-semibold">{selectedHabit?.name}</span> from your
          habits list.
        </p>
      </Modal>
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit habit"
        footer={
          <>
            <button
              onClick={() => setEditOpen(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="rounded-lg bg-sky-600 text-white px-3 py-1.5 hover:bg-sky-700"
            >
              Save
            </button>
          </>
        }
      >
        <label className="block text-sm text-slate-700 mb-1">Habit name</label>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:ring-4 focus:ring-sky-200/80"
          placeholder="e.g., Read 10 pages"
        />
      </Modal>
    </div>
  );
}
