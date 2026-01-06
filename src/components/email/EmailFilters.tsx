import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface EmailFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (value: boolean) => void;
  hasAttachmentsOnly?: boolean;
  onHasAttachmentsChange?: (value: boolean) => void;
}

export function EmailFilters({
  search,
  onSearchChange,
  unreadOnly,
  onUnreadOnlyChange,
  hasAttachmentsOnly = false,
  onHasAttachmentsChange
}: EmailFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  const hasActiveFilters = unreadOnly || hasAttachmentsOnly;

  return (
    <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Buscar emails..."
          className="pl-10 pr-8"
        />
        {localSearch && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClearSearch}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </form>

      {/* Filters Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={hasActiveFilters ? "secondary" : "outline"} 
            size="icon"
            className="relative"
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filtros</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={unreadOnly}
            onCheckedChange={onUnreadOnlyChange}
          >
            Apenas não lidos
          </DropdownMenuCheckboxItem>
          {onHasAttachmentsChange && (
            <DropdownMenuCheckboxItem
              checked={hasAttachmentsOnly}
              onCheckedChange={onHasAttachmentsChange}
            >
              Com anexos
            </DropdownMenuCheckboxItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
