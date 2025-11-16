import { useEffect, useMemo, useRef, useState } from "react";
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
  limit,
} from "firebase/firestore";
import HabitHeroLogo from "../assets/habitherologo2.png";
import { CustomCategoryManager } from "./custom_category_manager";
import { HeroPanel } from "./hero_panel";

const todayKey = () => new Date().toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

const dateKeyToUTC = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const previousDateKey = (key: string) => {
  const date = dateKeyToUTC(key);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

const areConsecutiveDays = (prev: string, next: string) => {
  const prevDate = dateKeyToUTC(prev);
  const nextDate = dateKeyToUTC(next);
  return nextDate.getTime() - prevDate.getTime() === DAY_MS;
};

const formatDayLabel = (key: string) =>
  dateKeyToUTC(key).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const CATEGORY_OPTIONS = [
  {
    value: "mind",
    label: "Mind & Focus",
    accent: "from-sky-500/80 to-blue-600/80",
    chipClass: "bg-sky-500/20 text-sky-200",
    dotClass: "bg-sky-400",
  },
  {
    value: "wellness",
    label: "Wellness",
    accent: "from-emerald-500/80 to-lime-500/80",
    chipClass: "bg-emerald-500/20 text-emerald-200",
    dotClass: "bg-emerald-400",
  },
  {
    value: "energy",
    label: "Energy",
    accent: "from-orange-500/80 to-pink-500/70",
    chipClass: "bg-orange-500/20 text-orange-200",
    dotClass: "bg-orange-400",
  },
  {
    value: "growth",
    label: "Growth",
    accent: "from-violet-500/80 to-indigo-500/80",
    chipClass: "bg-violet-500/20 text-violet-200",
    dotClass: "bg-violet-400",
  },
];

const CUSTOM_CATEGORY_COLOR_KEYS = [
  "sky",
  "emerald",
  "amber",
  "violet",
  "rose",
  "slate",
] as const;

type CustomCategoryColor = (typeof CUSTOM_CATEGORY_COLOR_KEYS)[number];

const CUSTOM_CATEGORY_THEMES: Record<
  CustomCategoryColor,
  { accent: string; chipClass: string; dotClass: string }
> = {
  sky: {
    accent: "from-sky-500/80 to-cyan-500/70",
    chipClass: "bg-sky-500/20 text-sky-100",
    dotClass: "bg-sky-400",
  },
  emerald: {
    accent: "from-emerald-500/80 to-lime-500/80",
    chipClass: "bg-emerald-500/20 text-emerald-100",
    dotClass: "bg-emerald-400",
  },
  amber: {
    accent: "from-amber-400/80 to-orange-500/80",
    chipClass: "bg-amber-400/20 text-amber-50",
    dotClass: "bg-amber-400",
  },
  violet: {
    accent: "from-violet-500/80 to-indigo-500/80",
    chipClass: "bg-violet-500/20 text-violet-100",
    dotClass: "bg-violet-400",
  },
  rose: {
    accent: "from-rose-500/80 to-pink-500/80",
    chipClass: "bg-rose-500/20 text-rose-100",
    dotClass: "bg-rose-400",
  },
  slate: {
    accent: "from-slate-500/80 to-slate-700/80",
    chipClass: "bg-white/10 text-white",
    dotClass: "bg-white/70",
  },
};

const getCustomCategoryTheme = (colorKey?: string) =>
  CUSTOM_CATEGORY_THEMES[(colorKey as CustomCategoryColor) ?? "slate"] ??
  CUSTOM_CATEGORY_THEMES.slate;

const EMOJI_OPTIONS = ["🔥", "🌿", "💧", "📚", "🧘", "🏃", "🎧", "✨"];

const HABIT_TEMPLATES = [
  {
    name: "Morning journal",
    category: "mind",
    note: "Write three bullet reflections",
    reminderTime: "07:00",
    emoji: "📓",
  },
  {
    name: "Hydrate x3",
    category: "wellness",
    note: "Track three full bottles",
    reminderTime: "09:00",
    emoji: "💧",
  },
  {
    name: "Focus sprint",
    category: "growth",
    note: "25 min deep work block",
    reminderTime: "10:00",
    emoji: "⚡",
  },
  {
    name: "Move body",
    category: "energy",
    note: "Stretch or quick walk",
    reminderTime: "18:00",
    emoji: "🏃",
  },
];

type Habit = {
  id: string;
  name: string;
  createdAt?: any;
  targetPerDay?: number;
  category?: string;
  note?: string;
  reminderTime?: string;
  icon?: string;
};

type HabitStats = {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
};

type CheckinEntry = {
  id: string;
  date: string;
  completed: Record<string, boolean>;
};

type CategoryTheme = {
  accent: string;
  chipClass: string;
  dotClass: string;
};

type CategoryOption = CategoryTheme & {
  value: string;
  label: string;
  colorKey?: CustomCategoryColor;
};

const getCategoryMeta = (
  value?: string,
  options: CategoryOption[] = CATEGORY_OPTIONS,
) =>
  options.find((option) => option.value === value) || options[0];

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200/60 ${className}`} />;
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
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${
        checked ? "bg-gradient-to-r from-emerald-400 to-sky-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
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
        className="absolute inset-0 bg-slate-900/30 backdrop-blur"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/80 text-slate-100 shadow-2xl backdrop-blur">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 id="modal-title" className="text-lg font-semibold text-white">
            {title}
          </h3>
        </div>
        <div className="px-5 py-4 text-slate-200">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkins, setCheckins] = useState<Record<string, boolean>>({});
  const [checkinHistory, setCheckinHistory] = useState<CheckinEntry[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const [extraCategories, setExtraCategories] = useState<CategoryOption[]>([]);
  const [newHabitCategory, setNewHabitCategory] = useState(
    CATEGORY_OPTIONS[0].value,
  );
  const [newHabitNote, setNewHabitNote] = useState("");
  const [newHabitReminder, setNewHabitReminder] = useState("");
  const [newHabitEmoji, setNewHabitEmoji] = useState("🌿");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState(
    CATEGORY_OPTIONS[0].value,
  );
  const [editNote, setEditNote] = useState("");
  const [editReminder, setEditReminder] = useState("");
  const [editEmoji, setEditEmoji] = useState("🌿");
  const [newCategoryName, setNewCategoryName] = useState("");
  const habitListRef = useRef<HTMLDivElement | null>(null);
  const categories = useMemo(
    () => [...CATEGORY_OPTIONS, ...extraCategories],
    [extraCategories],
  );
  const fallbackCategoryValue =
    categories[0]?.value ?? CATEGORY_OPTIONS[0].value;

  useEffect(() => {
    if (
      categoryFilter !== "all" &&
      !categories.find((c) => c.value === categoryFilter)
    ) {
      setCategoryFilter("all");
    }
  }, [categories, categoryFilter]);

  function hydrateFormFromTemplate(template: (typeof HABIT_TEMPLATES)[number]) {
    setNewHabit(template.name);
    setNewHabitCategory(template.category);
    setNewHabitNote(template.note ?? "");
    setNewHabitReminder(template.reminderTime ?? "");
    setNewHabitEmoji(template.emoji ?? "🌿");
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setCheckins({});
      setExtraCategories([]);
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

    const checkinsCol = collection(db, "users", user.uid, "checkins");
    const historyQuery = query(
      checkinsCol,
      orderBy("date", "desc"),
      limit(45),
    );
    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      const list: CheckinEntry[] = snap.docs.map((d) => {
        const data = d.data() as {
          date?: string;
          completed?: Record<string, boolean>;
        };
        return {
          id: d.id,
          date: data?.date ?? d.id,
          completed: data?.completed ?? {},
        };
      });
      setCheckinHistory(list);
      const today = todayKey();
      const todayDoc = list.find((entry) => entry.date === today);
      setCheckins(todayDoc?.completed ?? {});
      setLoading(false);
    });

    const categoriesCol = collection(db, "users", user.uid, "categories");
    const unsubCategories = onSnapshot(categoriesCol, (snap) => {
      const list: CategoryOption[] = snap.docs.map((d) => {
        const data = d.data() as { label?: string; colorKey?: string };
        const colorKey = (data?.colorKey as CustomCategoryColor) ?? "slate";
        const theme = getCustomCategoryTheme(colorKey);
        return {
          value: d.id,
          label: data?.label?.trim() || "Custom",
          ...theme,
          colorKey,
        };
      });
      setExtraCategories(list);
    });

    return () => {
      unsubHabits();
      unsubHistory();
      unsubCategories();
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

  const habitStats = useMemo<Record<string, HabitStats>>(() => {
    const stats: Record<string, HabitStats> = {};

    if (habits.length === 0) return stats;
    const today = todayKey();
    const historyAsc = [...checkinHistory].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const totalDaysTracked = historyAsc.length;

    habits.forEach((habit) => {
      const completions = historyAsc
        .filter((entry) => entry.completed[habit.id])
        .map((entry) => entry.date);
      const completionSet = new Set(completions);
      let currentStreak = 0;
      let cursor = today;
      while (completionSet.has(cursor)) {
        currentStreak += 1;
        cursor = previousDateKey(cursor);
      }

      let longest = 0;
      let running = 0;
      let prevDate: string | null = null;
      historyAsc.forEach((entry) => {
        if (entry.completed[habit.id]) {
          if (prevDate && areConsecutiveDays(prevDate, entry.date)) {
            running += 1;
          } else {
            running = 1;
          }
          longest = Math.max(longest, running);
          prevDate = entry.date;
        } else {
          running = 0;
          prevDate = null;
        }
      });

      const completionRate = totalDaysTracked
        ? Math.round((completions.length / totalDaysTracked) * 100)
        : 0;

      stats[habit.id] = {
        currentStreak,
        longestStreak: longest,
        completionRate,
      };
    });

    return stats;
  }, [habits, checkinHistory]);

  const totalTrackedDays = checkinHistory.length;
  const totalCheckmarks = useMemo(
    () =>
      checkinHistory.reduce((sum, entry) => {
        const completed = Object.values(entry.completed ?? {}).filter(Boolean)
          .length;
        return sum + completed;
      }, 0),
    [checkinHistory],
  );

  const overallCompletionRate = useMemo(() => {
    const possible = habits.length * totalTrackedDays;
    if (!possible) return 0;
    return Math.round((totalCheckmarks / possible) * 100);
  }, [habits.length, totalCheckmarks, totalTrackedDays]);

  const categoryStats = useMemo(() => {
    return categories.map((option) => {
      const bucket = habits.filter(
        (habit) => (habit.category ?? fallbackCategoryValue) === option.value,
      );
      if (!bucket.length) {
        return { ...option, count: 0, avgCompletion: 0 };
      }
      const avgCompletion = Math.round(
        bucket.reduce(
          (sum, habit) => sum + (habitStats[habit.id]?.completionRate ?? 0),
          0,
        ) / bucket.length,
      );
      return { ...option, count: bucket.length, avgCompletion };
    });
  }, [categories, habits, habitStats, fallbackCategoryValue]);

  const filteredHabits = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return habits.filter((habit) => {
      const matchesCategory =
        categoryFilter === "all" ||
        (habit.category ?? fallbackCategoryValue) === categoryFilter;
      const matchesSearch = normalizedSearch
        ? habit.name.toLowerCase().includes(normalizedSearch) ||
          (habit.note?.toLowerCase().includes(normalizedSearch) ?? false)
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [habits, categoryFilter, fallbackCategoryValue, searchTerm]);

  const reminderList = useMemo(() => {
    return habits
      .filter((habit) => !!habit.reminderTime)
      .sort((a, b) => (a.reminderTime ?? "").localeCompare(b.reminderTime ?? ""));
  }, [habits]);

  const timeline = useMemo(() => {
    return [...checkinHistory]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
      .map((entry) => {
        const completed = Object.values(entry.completed ?? {}).filter(Boolean).length;
        return {
          date: entry.date,
          count: completed,
          total: habits.length,
        };
      });
  }, [checkinHistory, habits.length]);

  const now = new Date();
  const weekdayLabel = now.toLocaleDateString(undefined, { weekday: "long" });
  const dateLabel = now.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  const highestCurrentStreak = useMemo(() => {
    return habits.reduce((max, habit) => {
      const streak = habitStats[habit.id]?.currentStreak ?? 0;
      return Math.max(max, streak);
    }, 0);
  }, [habits, habitStats]);

  const rewardBadge = useMemo(() => {
    if (!habits.length) {
      return {
        title: "No habits yet",
        description: "Add a habit to start earning rewards.",
        color: "bg-slate-200 text-slate-800",
      };
    }

    if (highestCurrentStreak >= 21) {
      return {
        title: "Legendary Run",
        description: "21+ day hot streak! You're unstoppable.",
        color: "bg-amber-500 text-white",
      };
    }
    if (highestCurrentStreak >= 14) {
      return {
        title: "Trailblazer",
        description: "Two weeks of consistency. Keep shining!",
        color: "bg-emerald-500 text-white",
      };
    }
    if (highestCurrentStreak >= 7) {
      return {
        title: "Consistency Champ",
        description: "One full week locked in.",
        color: "bg-sky-500 text-white",
      };
    }
    if (highestCurrentStreak >= 3) {
      return {
        title: "Getting Warm",
        description: "Momentum is building—stay with it!",
        color: "bg-violet-500 text-white",
      };
    }
    return {
      title: "Fresh Start",
      description: "Every streak begins with day one.",
      color: "bg-slate-300 text-slate-800",
    };
  }, [habits.length, highestCurrentStreak]);

  async function handleGoogleSignIn() {
    await signInWithPopup(auth, provider);
  }

  async function handleDemoSignIn() {
    await signInAnonymously(auth);
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newCategoryName.trim()) return;
    const colRef = collection(db, "users", user.uid, "categories");
    const colorKey =
      CUSTOM_CATEGORY_COLOR_KEYS[
        extraCategories.length % CUSTOM_CATEGORY_COLOR_KEYS.length
      ];
    const docRef = await addDoc(colRef, {
      label: newCategoryName.trim(),
      colorKey,
      createdAt: serverTimestamp(),
    });
    setNewCategoryName("");
    setNewHabitCategory(docRef.id);
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!user) return;
    const categoryRef = doc(db, "users", user.uid, "categories", categoryId);
    await deleteDoc(categoryRef);
    setExtraCategories((prev) => prev.filter((category) => category.value !== categoryId));
    if (newHabitCategory === categoryId) {
      setNewHabitCategory(fallbackCategoryValue);
    }
    if (editCategory === categoryId) {
      setEditCategory(fallbackCategoryValue);
    }
    if (categoryFilter === categoryId) {
      setCategoryFilter("all");
    }
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newHabit.trim()) return;

    const colRef = collection(db, "users", user.uid, "habits");
    await addDoc(colRef, {
      name: newHabit.trim(),
      createdAt: serverTimestamp(),
      category: newHabitCategory,
      note: newHabitNote.trim() || null,
      reminderTime: newHabitReminder || null,
      icon: newHabitEmoji,
    });
    setNewHabit("");
    setNewHabitNote("");
    setNewHabitReminder("");
    setNewHabitCategory(fallbackCategoryValue);
    setNewHabitEmoji("🌿");
    requestAnimationFrame(() => {
      habitListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
    setEditCategory(habit.category ?? fallbackCategoryValue);
    setEditNote(habit.note ?? "");
    setEditReminder(habit.reminderTime ?? "");
    setEditEmoji(habit.icon ?? "🌿");
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
    await updateDoc(habitRef, {
      name: editName.trim(),
      category: editCategory,
      note: editNote.trim() || null,
      reminderTime: editReminder || null,
      icon: editEmoji,
    });
    setEditOpen(false);
    setSelectedHabit(null);
  }

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="pointer-events-none absolute top-24 right-16 h-80 w-80 rounded-full bg-sky-500/30 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-8 left-10 h-96 w-96 rounded-full bg-emerald-500/20 blur-[140px]" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-xl rounded-[32px] border border-white/15 bg-slate-900/70 p-10 text-center shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10">
                <img
                  src={HabitHeroLogo}
                  alt="HabitHero logo"
                  className="h-20 w-20 object-contain"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  HabitHero
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-white">
                  Another day to become a hero!
                </h1>
                <p className="mt-3 text-slate-300">
                  Sign in to sync streaks, reminders, and progress across every
                  device.
                </p>
              </div>
            </div>
            <div className="mt-10 space-y-4">
              <button
                onClick={handleGoogleSignIn}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-5 py-3 text-base font-semibold text-white shadow-lg transition hover:brightness-110"
              >
                Continue with Google
              </button>
              <button
                onClick={handleDemoSignIn}
                className="w-full rounded-2xl border border-white/15 px-5 py-3 text-base font-semibold text-white/80 transition hover:bg-white/10"
                title="Uses Firebase Anonymous Auth"
              >
                Try a Demo (no Google)
              </button>
            </div>
            <p className="mt-6 text-xs text-slate-400">
              Demo mode keeps data local via Firebase Anonymous Auth.
            </p>
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="pointer-events-none absolute -top-24 right-0 h-[32rem] w-[32rem] rounded-full bg-sky-500/25 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[26rem] w-[26rem] rounded-full bg-emerald-500/20 blur-[120px]" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 lg:py-12 space-y-10">
        <header className="rounded-3xl border border-white/15 bg-slate-900/70 px-6 py-5 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 via-indigo-500/30 to-purple-500/30">
                <img
                  src={HabitHeroLogo}
                  alt="HabitHero"
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-300">HabitHero</p>
                <p className="text-lg font-semibold text-white">Be your own hero.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <div className="text-right text-slate-200">
                <p className="font-semibold text-white">{weekdayLabel}</p>
                <p>{dateLabel}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-100 backdrop-blur">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white text-xs font-semibold">
                  {userInitial}
                </div>
                <span>{userLabel}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-slate-50 transition hover:bg-white/10"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[300px,1fr]">
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-white">
                  {userInitial}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Logged in</p>
                  <p className="text-lg font-semibold text-white">{userLabel}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-300">
                Your streaks sync in the cloud. Pick up progress on any device after you sign in.
              </p>
            </div>
          </aside>

          <section className="space-y-8">
            <HeroPanel
              userLabel={userLabel}
              completedCount={completedCount}
              habitCount={habits.length}
                highestCurrentStreak={highestCurrentStreak}
                totalTrackedDays={totalTrackedDays}
              progress={progress}
              rewardBadge={rewardBadge}
            />

            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Reminders</p>
                <span className="text-xs text-slate-400">
                  {reminderList.length ? `${reminderList.length} active` : "None"}
                </span>
              </div>
              {reminderList.length ? (
                <ul className="mt-4 space-y-3 text-sm">
                  {reminderList.slice(0, 4).map((habit) => {
                    const reminderCategory = getCategoryMeta(habit.category, categories);
                    return (
                      <li
                        key={`rem-${habit.id}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur"
                      >
                        <div>
                          <p className="font-semibold text-white">{habit.name}</p>
                          <p className="flex items-center gap-1 text-xs text-slate-400">
                            <span
                              className={`h-2 w-2 rounded-full ${reminderCategory.dotClass}`}
                            />
                            {reminderCategory.label}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-100">
                          {habit.reminderTime}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  Add an optional reminder time when creating a habit to keep it on this list.
                </p>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search habits or notes"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {["all", ...categories.map((option) => option.value)].map((value) => {
                    const label =
                      value === "all" ? "All" : getCategoryMeta(value, categories).label;
                    return (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setCategoryFilter(value)}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                          categoryFilter === value
                            ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg"
                            : "border border-white/10 text-slate-300 hover:border-white/20"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <section
              ref={habitListRef}
              className="rounded-[32px] border border-white/15 bg-slate-950/40 p-6 shadow-2xl backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">Your habits</h2>
                <span className="text-xs text-slate-400">{filteredHabits.length} showing</span>
              </div>
              {loading ? (
                <div className="mt-6 space-y-4">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              ) : filteredHabits.length === 0 ? (
                <div className="mt-10 rounded-3xl border border-dashed border-white/10 p-10 text-center text-slate-400">
                  <p>No habits match your filters yet.</p>
                </div>
              ) : (
                <ul className="mt-6 grid gap-4 lg:grid-cols-2">
                  {filteredHabits.map((habit) => {
                    const done = !!checkins[habit.id];
                    const stats = habitStats[habit.id] ?? {
                      currentStreak: 0,
                      longestStreak: 0,
                      completionRate: 0,
                    };
                    const category = getCategoryMeta(habit.category, categories);
                    return (
                      <li
                        key={habit.id}
                        className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl backdrop-blur"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/60 text-2xl shadow-inner">
                                {habit.icon ?? "🌿"}
                              </div>
                              <div>
                                <p className="text-lg font-semibold text-white">{habit.name}</p>
                                <p className="text-xs text-slate-400">{category.label}</p>
                              </div>
                            </div>
                            {habit.note && (
                              <p className="mt-3 text-sm text-slate-300">{habit.note}</p>
                            )}
                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${category.chipClass}`}
                              >
                                {category.label}
                              </span>
                              {habit.reminderTime && (
                                <span className="rounded-full border border-white/10 px-3 py-1 text-slate-200">
                                  Reminder {habit.reminderTime}
                                </span>
                              )}
                              <span className="rounded-full border border-white/10 px-3 py-1">
                                Streak {stats.currentStreak}d
                              </span>
                              <span className="rounded-full border border-white/10 px-3 py-1">
                                {stats.completionRate}% success
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <Switch
                              id={`chk-${habit.id}`}
                              checked={done}
                              onChange={() => toggleCheck(habit.id)}
                            />
                            <span className="text-xs text-slate-400">
                              {done ? "Completed" : "Tap to win"}
                            </span>
                            <div className="mt-auto flex gap-2">
                              <button
                                className="rounded-2xl border border-white/10 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                                onClick={() => openEdit(habit)}
                              >
                                Edit
                              </button>
                              <button
                                className="rounded-2xl border border-transparent bg-rose-500/90 px-3 py-1.5 text-xs text-white"
                                onClick={() => openDelete(habit)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Quick-start templates</p>
                  <p className="text-xs text-slate-400">Tap to auto-fill the form below.</p>
                </div>
                <span className="text-xs text-slate-400">
                  Last {totalTrackedDays || 0} days logged
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {HABIT_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => hydrateFormFromTemplate(template)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{template.emoji}</span>
                      <span className="text-xs text-slate-400">
                        {getCategoryMeta(template.category, categories).label}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-semibold text-white">{template.name}</p>
                    <p className="text-sm text-slate-400">{template.note}</p>
                  </button>
                ))}
              </div>
            </div>

            <section className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Add a habit</h2>
                  <p className="text-sm text-slate-400">
                    Capture category, reminder, and notes for richer tracking.
                  </p>
                </div>
                {newHabit && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewHabit("");
                      setNewHabitNote("");
                      setNewHabitReminder("");
                      setNewHabitCategory(fallbackCategoryValue);
                      setNewHabitEmoji("🌿");
                    }}
                    className="rounded-full border border-white/15 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-slate-200 transition hover:bg-white/10"
                  >
                    Clear
                  </button>
                )}
              </div>
              <form onSubmit={addHabit} className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="text-sm text-slate-200">
                  Habit name
                  <input
                    value={newHabit}
                    onChange={(e) => setNewHabit(e.target.value)}
                    placeholder="e.g., Walk outside, Write 200 words"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-sky-500"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  Category
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-base text-white outline-none"
                  >
                    {categories.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-200">
                  Reminder time (optional)
                  <input
                    type="time"
                    value={newHabitReminder}
                    onChange={(e) => setNewHabitReminder(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-base text-white outline-none"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  Note
                  <textarea
                    value={newHabitNote}
                    onChange={(e) => setNewHabitNote(e.target.value)}
                    rows={3}
                    placeholder="Why this habit matters or how you’ll do it."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500"
                  />
                </label>
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-200">Emoji marker</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        type="button"
                        key={emoji}
                        onClick={() => setNewHabitEmoji(emoji)}
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl transition ${
                          newHabitEmoji === emoji
                            ? "border-sky-400/70 bg-sky-500/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="grow rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-5 py-3 text-base font-semibold text-white shadow-lg transition hover:brightness-110"
                  >
                    Add habit
                  </button>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Progress saves instantly to Firestore.</span>
                  </div>
                </div>
              </form>
              <CustomCategoryManager
                newCategoryName={newCategoryName}
                onNameChange={setNewCategoryName}
                onSubmit={handleAddCategory}
                user={user}
                categories={extraCategories}
                onDeleteCategory={handleDeleteCategory}
              />
            </section>

            <section className="rounded-[32px] border border-white/15 bg-slate-950/40 p-6 shadow-2xl backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Momentum log</h2>
                  <p className="text-sm text-slate-400">Snapshot of your last check-ins.</p>
                </div>
                <span className="text-xs text-slate-400">Tail view over {timeline.length} days</span>
              </div>
              {timeline.length ? (
                <ul className="mt-6 grid gap-4 md:grid-cols-2">
                  {timeline.map((entry) => (
                    <li
                      key={entry.date}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl"
                    >
                      <div className="flex items-center justify-between text-sm text-slate-200">
                        <span>{formatDayLabel(entry.date)}</span>
                        <span>
                          {entry.count}/{entry.total || 1} complete
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/10">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-sky-500"
                          style={{
                            width: `${entry.total ? Math.round((entry.count / entry.total) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-sm text-slate-400">
                  Logs appear after your first check-in.
                </p>
              )}
            </section>

          </section>
        </div>

        <div className="mt-10 space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Snapshot</p>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Completion rate</span>
                <span className="text-lg font-semibold text-white">{overallCompletionRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Checkmarks logged</span>
                <span className="text-lg font-semibold text-white">{totalCheckmarks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Active habits</span>
                <span className="text-lg font-semibold text-white">{habits.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Best streak</span>
                <span className="text-lg font-semibold text-white">{highestCurrentStreak}d</span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Focus map</p>
              <span className="text-xs text-slate-400">By category</span>
            </div>
            <div className="mt-4 space-y-4">
              {categoryStats.map((category) => (
                <div key={category.value} className="flex items-center justify-between text-sm text-slate-200">
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-white">
                      <span className={`h-2.5 w-2.5 rounded-full ${category.dotClass}`} />
                      {category.label}
                    </p>
                    <p className="text-xs text-slate-400">
                      {category.count} habit{category.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">{category.avgCompletion}%</p>
                    <p className="text-xs text-slate-400">avg success</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} HabitHero — be your own hero.
        </footer>
      </div>
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete habit?"
        footer={
          <>
            <button
              onClick={() => setDeleteOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
            >
              Delete
            </button>
          </>
        }
      >
        <p>
          This action will remove <span className="font-semibold text-white">{selectedHabit?.name}</span> from your
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
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-110"
            >
              Save
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm text-slate-200">
            Habit name
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-white outline-none placeholder:text-slate-500"
              placeholder="e.g., Read 10 pages"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Category
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-white outline-none"
            >
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-200">
            Reminder time
            <input
              type="time"
              value={editReminder}
              onChange={(e) => setEditReminder(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-white outline-none"
            />
          </label>
          <label className="block text-sm text-slate-200">
            Notes
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-white outline-none"
            />
          </label>
          <div>
            <p className="text-sm text-slate-200">Emoji</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  type="button"
                  key={`edit-${emoji}`}
                  onClick={() => setEditEmoji(emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-xl transition ${
                    editEmoji === emoji
                      ? "border-sky-400/70 bg-sky-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
