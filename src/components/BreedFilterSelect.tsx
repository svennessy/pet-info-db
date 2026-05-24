export type BreedFilterOption = {
  slug: string;
  name: string;
};

type BreedFilterSelectProps = {
  value: string;
  onChange: (slug: string) => void;
  options: BreedFilterOption[];
  groups?: Array<{ label: string; options: BreedFilterOption[] }>;
};

/** Scrollable breed list shown when sorting by breed. */
export function BreedFilterSelect({
  value,
  onChange,
  options,
  groups,
}: BreedFilterSelectProps) {
  return (
    <label className="field field-breed-scroll">
      <span>Breed</span>
      <select
        className="breed-scroll-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All breeds</option>
        {groups
          ? groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((b) => (
                  <option key={`${group.label}-${b.slug}`} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            ))
          : options.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
      </select>
    </label>
  );
}
