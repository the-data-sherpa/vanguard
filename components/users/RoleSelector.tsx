"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RoleSelectorProps {
  value: string;
  onChange: (value: "member" | "moderator" | "admin") => void;
  disabled?: boolean;
  canSetAdmin?: boolean;
}

export function RoleSelector({
  value,
  onChange,
  disabled = false,
  canSetAdmin = false,
}: RoleSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as "member" | "moderator" | "admin")}
      disabled={disabled}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="member">Member</SelectItem>
        <SelectItem value="moderator">Moderator</SelectItem>
        {canSetAdmin && <SelectItem value="admin">Admin</SelectItem>}
      </SelectContent>
    </Select>
  );
}
