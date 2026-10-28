import { Search } from 'lucide-react';

export interface SearchBarProps {
  placeholder?: string;
  onClick?: () => void;
}

export function SearchBar({ placeholder = '搜索商品', onClick }: SearchBarProps) {
  return (
    <button
      type="button"
      className="mall-touch-target mall-search-bar"
      data-testid="mall-search-bar"
      onClick={onClick}
    >
      <Search size={16} />
      <span className="mall-search-bar-text">{placeholder}</span>
    </button>
  );
}
