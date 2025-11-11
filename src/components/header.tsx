import HabitHeroLogo from "../assets/habitherologo2.png";

type Props = {
  userEmail: string | null | undefined;
  userInitial: string;
  onSignOut: () => void;
};

export default function Header({ userEmail, userInitial, onSignOut }: Props) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sky-600">
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
              <span className="text-sm text-slate-700">{userEmail}</span>
            </div>
            <button
              onClick={onSignOut}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
