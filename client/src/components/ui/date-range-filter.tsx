import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  startDate?: string;
  endDate?: string;
  onChange: (startDate?: string, endDate?: string) => void;
}

export function DateRangeFilter({ startDate, endDate, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const hasFilter = !!startDate || !!endDate;

  const handleClear = () => {
    onChange(undefined, undefined);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn(
          "gap-1.5 rounded-full text-xs",
          hasFilter && "border-primary text-primary bg-primary/5",
        )}
        data-testid="button-date-filter"
      >
        <Filter className="w-3.5 h-3.5" />
        {hasFilter ? "Filtrado" : "Período"}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-lg p-3 w-64 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">De</label>
            <Input
              type="date"
              value={startDate || ""}
              onChange={(e) => onChange(e.target.value || undefined, endDate)}
              className="h-9 text-sm"
              data-testid="input-filter-start"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Até</label>
            <Input
              type="date"
              value={endDate || ""}
              onChange={(e) => onChange(startDate, e.target.value || undefined)}
              className="h-9 text-sm"
              data-testid="input-filter-end"
            />
          </div>
          <div className="flex gap-2">
            {hasFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="flex-1 text-xs"
                data-testid="button-clear-filter"
              >
                <X className="w-3 h-3 mr-1" /> Limpar
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setOpen(false)}
              className="flex-1 text-xs"
              data-testid="button-apply-filter"
            >
              Aplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
