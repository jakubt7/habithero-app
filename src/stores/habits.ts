// src/stores/habits.ts
import { makeAutoObservable, runInAction } from "mobx";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { auth } from "../firebase";

export type Habit = {
  id: string;
  name: string;
  goalPerWeek: number;
  createdAt: Date;
  isArchived?: boolean;
};

class HabitStore {
  habits: Habit[] = [];
  loading = false;

  constructor() {
    makeAutoObservable(this);
  }

  subscribe() {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(collection(db, "habits"), where("uid", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const arr: Habit[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        arr.push({
          id: d.id,
          name: data.name,
          goalPerWeek: data.goalPerWeek,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          isArchived: !!data.isArchived,
        });
      });
      runInAction(() => (this.habits = arr));
    });
  }

  async addHabit(name: string, goalPerWeek: number) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");
    await addDoc(collection(db, "habits"), {
      uid: user.uid,
      name,
      goalPerWeek,
      createdAt: serverTimestamp(),
      isArchived: false,
    });
  }

  async archiveHabit(id: string, isArchived = true) {
    await updateDoc(doc(db, "habits", id), { isArchived });
  }
}

export const habitStore = new HabitStore();
