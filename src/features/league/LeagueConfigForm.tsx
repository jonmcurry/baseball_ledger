/**
 * LeagueConfigForm
 *
 * Form sub-component for league creation/configuration.
 * Uses shared form components (Input, Select, Toggle).
 *
 * Feature-scoped sub-component. No store imports.
 */

import { useState } from 'react';
import { Input } from '@components/forms/Input';
import { Select } from '@components/forms/Select';
import { Toggle } from '@components/forms/Toggle';

export interface LeagueConfigFormProps {
  onSubmit: (config: LeagueFormData) => void;
  isSubmitting: boolean;
}

export interface LeagueFormData {
  name: string;
  teamCount: number;
  yearRangeStart: number;
  yearRangeEnd: number;
  injuriesEnabled: boolean;
}

const TEAM_COUNT_OPTIONS = [
  { value: '4', label: '4 Teams' },
  { value: '6', label: '6 Teams' },
  { value: '8', label: '8 Teams' },
] as const;

export function LeagueConfigForm({ onSubmit, isSubmitting }: LeagueConfigFormProps) {
  const [name, setName] = useState('');
  const [teamCount, setTeamCount] = useState('8');
  const [yearStart, setYearStart] = useState('1970');
  const [yearEnd, setYearEnd] = useState('2000');
  const [injuriesEnabled, setInjuriesEnabled] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (name.trim().length < 3) {
      newErrors.name = 'League name must be at least 3 characters';
    }
    const start = Number(yearStart);
    const end = Number(yearEnd);
    if (isNaN(start) || start < 1871 || start > 2023) {
      newErrors.yearStart = 'Year must be between 1871 and 2023';
    }
    if (isNaN(end) || end < 1871 || end > 2023) {
      newErrors.yearEnd = 'Year must be between 1871 and 2023';
    }
    if (!isNaN(start) && !isNaN(end) && end < start) {
      newErrors.yearEnd = 'End year must be after start year';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      teamCount: Number(teamCount),
      yearRangeStart: Number(yearStart),
      yearRangeEnd: Number(yearEnd),
      injuriesEnabled,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-gutter-lg">
      <Input
        value={name}
        onChange={setName}
        name="leagueName"
        label="League Name"
        placeholder="My Baseball League"
        error={errors.name}
      />

      <Select
        value={teamCount}
        onChange={setTeamCount}
        options={TEAM_COUNT_OPTIONS}
        name="teamCount"
        label="Number of Teams"
      />

      <div className="grid grid-cols-2 gap-gutter">
        <Input
          value={yearStart}
          onChange={setYearStart}
          name="yearStart"
          label="Start Year"
          type="number"
          placeholder="1970"
          error={errors.yearStart}
        />
        <Input
          value={yearEnd}
          onChange={setYearEnd}
          name="yearEnd"
          label="End Year"
          type="number"
          placeholder="2000"
          error={errors.yearEnd}
        />
      </div>

      <Toggle
        checked={injuriesEnabled}
        onChange={setInjuriesEnabled}
        label="Enable Injuries"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-button bg-ballpark px-6 py-2 font-medium text-old-lace hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating...' : 'Create League'}
      </button>
    </form>
  );
}
