type RewardBadge = {
  title: string;
  description: string;
  color: string;
};

type HeroPanelProps = {
  userLabel?: string | null;
  completedCount: number;
  habitCount: number;
  highestCurrentStreak: number;
  totalTrackedDays: number;
  progress: number;
  rewardBadge: RewardBadge;
};

export function HeroPanel({
  userLabel,
  completedCount,
  habitCount,
  highestCurrentStreak,
  totalTrackedDays,
  progress,
  rewardBadge,
}: HeroPanelProps) {
  const friendlyName = userLabel?.split("@")[0] || "friend";
  return (
    <div className="rounded-[32px] border border-white/15 bg-gradient-to-br from-[#0f1628] via-[#101430] to-[#080a16] p-8 shadow-2xl">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-300">Today</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Hey {friendlyName}, let’s win the day.
          </h1>
          <p className="mt-3 text-slate-300">
            Stay consistent with focused rituals, quick insights, and gentle reminders.
          </p>
          <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-200">
            <div>
              <p className="text-slate-400">Completed</p>
              <p className="text-2xl font-semibold text-white">
                {completedCount}/{habitCount || 1}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Longest streak</p>
              <p className="text-2xl font-semibold text-white">{highestCurrentStreak}d</p>
            </div>
            <div>
              <p className="text-slate-400">Tracked days</p>
              <p className="text-2xl font-semibold text-white">{totalTrackedDays}</p>
            </div>
          </div>
        </div>
        <div className="relative flex flex-col items-center">
          <div className="relative h-44 w-44 rounded-full border border-white/10 p-4">
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-900/70 text-white shadow-inner">
              <span className="text-4xl font-semibold">{progress}%</span>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-300">
                progress
              </span>
            </div>
            <div
              className="absolute inset-2 rounded-full border-[10px] border-transparent"
              style={{
                borderImage: `conic-gradient(from 90deg, #0ea5e9 ${progress}%, rgba(14,165,233,0.2) ${progress}% 100%) 1`,
              }}
            />
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Reward</p>
            <p className="text-base font-semibold text-white">{rewardBadge.title}</p>
            <p className="text-xs text-slate-400">{rewardBadge.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
