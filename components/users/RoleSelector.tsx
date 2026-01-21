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
  onChange: (value: "owner" | "user") => void;
  disabled?: boolean;
}

export function RoleSelector({
  value,
  onChange,
  disabled = false,
}: RoleSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as "owner" | "user")}
      disabled={disabled}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="user">User</SelectItem>
        <SelectItem value="owner">Owner</SelectItem>
      </SelectContent>
    </Select>
  );
}
