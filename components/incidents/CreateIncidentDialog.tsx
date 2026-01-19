'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CallTypeCategory } from '@/lib/types';

interface CreateIncidentDialogProps {
  tenantId: Id<'tenants'>;
  onCreated?: (incidentId: Id<'incidents'>) => void;
}

const CATEGORIES: { value: CallTypeCategory; label: string }[] = [
  { value: 'fire', label: 'Fire' },
  { value: 'medical', label: 'Medical' },
  { value: 'rescue', label: 'Rescue' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'hazmat', label: 'HazMat' },
  { value: 'other', label: 'Other' },
];

export function CreateIncidentDialog({
  tenantId,
  onCreated,
}: CreateIncidentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [callType, setCallType] = useState('');
  const [category, setCategory] = useState<CallTypeCategory>('other');
  const [fullAddress, setFullAddress] = useState('');
  const [description, setDescription] = useState('');
  const [units, setUnits] = useState('');

  const createIncident = useMutation(api.incidents.createManual);

  const resetForm = () => {
    setCallType('');
    setCategory('other');
    setFullAddress('');
    setDescription('');
    setUnits('');
    setError(null);
  };

  const handleCreate = async () => {
    if (!callType.trim()) {
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
        callType: callType.trim(),
        callTypeCategory: category,
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="callType">
                Call Type <span className="text-destructive">*</span>
              </Label>
              <Input
                id="callType"
                value={callType}
                onChange={(e) => setCallType(e.target.value)}
                placeholder="e.g., Structure Fire"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as CallTypeCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
