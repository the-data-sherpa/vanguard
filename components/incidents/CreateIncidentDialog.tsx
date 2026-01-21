'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Loader2, Plus, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CALL_TYPES_BY_CATEGORY, CATEGORY_LABELS, type CallType } from '@/lib/callTypes';
import type { CallTypeCategory } from '@/lib/types';

interface CreateIncidentDialogProps {
  tenantId: Id<'tenants'>;
  onCreated?: (incidentId: Id<'incidents'>) => void;
}

// Category colors for badges
const categoryColors: Record<CallTypeCategory, string> = {
  fire: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  medical: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  rescue: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  traffic: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
  hazmat: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export function CreateIncidentDialog({
  tenantId,
  onCreated,
}: CreateIncidentDialogProps) {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedCallType, setSelectedCallType] = useState<CallType | null>(null);
  const [fullAddress, setFullAddress] = useState('');
  const [description, setDescription] = useState('');
  const [units, setUnits] = useState('');

  const createIncident = useMutation(api.incidents.createManual);

  const resetForm = () => {
    setSelectedCallType(null);
    setFullAddress('');
    setDescription('');
    setUnits('');
    setError(null);
  };

  const handleCreate = async () => {
    if (!selectedCallType) {
      setError('Call type is required');
      return;
    }
    if (!fullAddress.trim()) {
      setError('Address is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Parse units (comma or space separated)
      const unitList = units
        .split(/[\s,]+/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

      const incidentId = await createIncident({
        tenantId,
        callType: selectedCallType.id,
        callTypeCategory: selectedCallType.category,
        fullAddress: fullAddress.trim(),
        description: description.trim() || undefined,
        units: unitList.length > 0 ? unitList : undefined,
      });

      setOpen(false);
      resetForm();
      onCreated?.(incidentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
    } finally {
      setIsCreating(false);
    }
  };

  // Order categories for display
  const categoryOrder: CallTypeCategory[] = ['fire', 'rescue', 'traffic', 'hazmat', 'medical', 'other'];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Incident
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Manual Incident</DialogTitle>
          <DialogDescription>
            Create a new incident manually. This is useful for events not captured
            by PulsePoint.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Call Type Combobox */}
          <div className="space-y-2">
            <Label>
              Call Type <span className="text-destructive">*</span>
            </Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedCallType ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("font-normal", categoryColors[selectedCallType.category])}>
                        {selectedCallType.id}
                      </Badge>
                      <span className="truncate">{selectedCallType.description}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select call type...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search call types..." />
                  <CommandList>
                    <CommandEmpty>No call type found.</CommandEmpty>
                    {categoryOrder.map((category) => {
                      const callTypes = CALL_TYPES_BY_CATEGORY[category];
                      if (!callTypes || callTypes.length === 0) return null;

                      return (
                        <CommandGroup key={category} heading={CATEGORY_LABELS[category]}>
                          {callTypes.map((ct) => (
                            <CommandItem
                              key={ct.id}
                              value={`${ct.id} ${ct.description}`}
                              onSelect={() => {
                                setSelectedCallType(ct);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCallType?.id === ct.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <Badge variant="outline" className={cn("mr-2 font-mono text-xs", categoryColors[ct.category])}>
                                {ct.id}
                              </Badge>
                              <span>{ct.description}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedCallType && (
              <p className="text-xs text-muted-foreground">
                Category: {CATEGORY_LABELS[selectedCallType.category]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="address"
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="e.g., 123 Main St, City, State"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="units">Units (optional)</Label>
            <Input
              id="units"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="e.g., E1, T1, M1 (comma or space separated)"
            />
            <p className="text-xs text-muted-foreground">
              Enter unit codes separated by commas or spaces
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about the incident..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Create Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
