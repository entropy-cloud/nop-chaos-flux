export interface PriceTextProps {
  value: number | string | undefined;
  counterPrice?: number | string | undefined;
  size?: 'md' | 'sm';
  showCounter?: boolean;
}

function parse(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return isFinite(n) ? n : null;
}

export function formatPriceParts(value: number | string | undefined): {
  int: string;
  dec: string;
} | null {
  const n = parse(value);
  if (n === null) return null;
  const [int, dec] = n.toFixed(2).split('.');
  return { int, dec };
}

export function PriceText({ value, counterPrice, size = 'md', showCounter = true }: PriceTextProps) {
  const parts = formatPriceParts(value);
  const counter = formatPriceParts(counterPrice);
  const hasCounterDiscount =
    showCounter && counter !== null && parts !== null && Number(counter.int + '.' + counter.dec) > Number(parts.int + '.' + parts.dec);

  if (parts === null) {
    return <span className={`mallv2-price size-${size}`}>—</span>;
  }
  return (
    <span className="mallv2-goods-price-row">
      <span className={`mallv2-price size-${size}`} data-testid="mall-price">
        <span className="mallv2-price-symbol">¥</span>
        <span className="mallv2-price-int">{parts.int}</span>
        <span className="mallv2-price-dec">.{parts.dec}</span>
      </span>
      {hasCounterDiscount ? (
        <span className="mallv2-price-counter">
          ¥{counter!.int}.{counter!.dec}
        </span>
      ) : null}
    </span>
  );
}
