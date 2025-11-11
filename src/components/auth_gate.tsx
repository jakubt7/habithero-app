import { useEffect, useState } from "react";
import { auth, provider, db } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import type { User } from "firebase/auth";

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: u.email ?? null,
            displayName: u.displayName ?? null,
            createdAt: serverTimestamp(),
          });
        }
      }
      setReady(true);
    });
    return () => unsub();
  }, []);

  if (!ready) return <div className="p-6">Loading…</div>;
  if (!user)
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4">HabitHere</h1>
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={() => signInWithPopup(auth, provider)}
        >
          Sign in with Google
        </button>
      </div>
    );

  return (
    <div>
      <div className="p-3 flex gap-2 items-center">
        <span className="text-sm">
          Signed in as {user.displayName ?? user.email}
        </span>
        <button className="text-sm underline" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
