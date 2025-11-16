import type { User } from "firebase/auth";

type CustomCategory = {
  value: string;
  label: string;
  chipClass: string;
};

type CustomCategoryManagerProps = {
  newCategoryName: string;
  onNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  user: User | null;
  categories: CustomCategory[];
  onDeleteCategory: (categoryId: string) => void;
};

export function CustomCategoryManager({
  newCategoryName,
  onNameChange,
  onSubmit,
  user,
  categories,
  onDeleteCategory,
}: CustomCategoryManagerProps) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-slate-950/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Custom categories</p>
          <p className="text-xs text-slate-400">
            Name a focus area and it will appear in the category selector above.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap gap-3 md:flex-nowrap">
        <input
          value={newCategoryName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Family, Creativity"
          disabled={!user}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!user || !newCategoryName.trim()}
          className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-400"
        >
          {user ? "Save category" : "Sign in first"}
        </button>
      </form>
      {!user ? (
        <p className="mt-3 text-xs text-slate-400">
          Custom categories are tied to your account. Sign in to start creating them.
        </p>
      ) : categories.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span
              key={category.value}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white backdrop-blur"
            >
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${category.chipClass}`}>
                {category.label}
              </span>
              <button
                type="button"
                onClick={() => onDeleteCategory(category.value)}
                className="rounded-full border border-white/10 p-1 text-[10px] text-slate-200 transition hover:bg-white/10"
                aria-label={`Delete ${category.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400">No custom categories yet.</p>
      )}
    </div>
  );
}
