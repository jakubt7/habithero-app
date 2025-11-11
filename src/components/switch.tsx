type Props = {
  checked: boolean;
  onChange: () => void;
  id: string;
};

export default function Switch({ checked, onChange, id }: Props) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-sky-500" : "bg-slate-300"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-1"}`}
      />
      <span className="sr-only">{id}</span>
    </button>
  );
}
