interface PlaceholderProps {
  title: string;
  hint?: string;
}

export function Placeholder({ title, hint }: PlaceholderProps) {
  return (
    <section className="mall-page">
      <h1 className="text-lg font-semibold mb-2">{title}</h1>
      {hint ? <p className="text-sm text-gray-500">{hint}</p> : null}
    </section>
  );
}
