'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';

interface PulsePointConfigProps {
  tenantSlug: string;
  initialAgencyId?: string;
}

export function PulsePointConfig({ tenantSlug, initialAgencyId }: PulsePointConfigProps) {
  const router = useRouter();
  const [agencyId, setAgencyId] = useState(initialAgencyId || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/tenant/${tenantSlug}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pulsepointAgencyId: agencyId.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Agency ID saved successfully' });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save',
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = agencyId.trim() !== (initialAgencyId || '');

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="agencyId">PulsePoint Agency ID</Label>
        <div className="flex gap-2">
          <Input
            id="agencyId"
            value={agencyId}
            onChange={(e) => setAgencyId(e.target.value)}
            placeholder="e.g., EMS1205"
            className="font-mono"
          />
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            size="default"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="ml-2">Save</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The PulsePoint agency ID for your area. You can find this in the PulsePoint app URL.
        </p>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
