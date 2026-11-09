import { Checkbox, Label } from '@nop-chaos/ui';

/** Column-filter option rows (label + checkbox) inside the header filter popover. */
export function TableHeaderFilterOptions(props: {
  columnName: string | undefined;
  options: ReadonlyArray<{ label: string; value: string }>;
  activeFilters: ReadonlySet<string>;
  onFilter: (column: string, option: string, checked: boolean) => void;
}) {
  const { columnName, options, activeFilters, onFilter } = props;
  return options.map((option) => (
    <Label
      key={option.value}
      className="cursor-pointer rounded-sm px-2 py-1.5 font-normal leading-normal hover:bg-accent"
      data-slot="table-filter-option"
    >
      <Checkbox
        checked={activeFilters.has(option.value)}
        onCheckedChange={(checked) => columnName && onFilter(columnName, option.value, checked === true)}
      />
      {option.label}
    </Label>
  ));
}
