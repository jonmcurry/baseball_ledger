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
  negroLeaguesEnabled: boolean;
}

const TEAM_COUNT_OPTIONS = [
  { value: '18', label: '18 Teams' },
  { value: '24', label: '24 Teams' },
  { value: '30', label: '30 Teams' },
] as const;

export function LeagueConfigForm({ onSubmit, isSubmitting }: LeagueConfigFormProps) {
  const [name, setName] = useState('');
  const [teamCount, setTeamCount] = useState('18');
  const [yearStart, setYearStart] = useState('1901');
  const [yearEnd, setYearEnd] = useState('2025');
  const [injuriesEnabled, setInjuriesEnabled] = useState(false);
  const [negroLeaguesEnabled, setNegroLeaguesEnabled] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (name.trim().length < 3) {
      newErrors.name = 'League name must be at least 3 characters';
    }
    const start = Number(yearStart);
    const end = Number(yearEnd);
    if (isNaN(start) || start < 1901 || start > 2025) {
      newErrors.yearStart = 'Year must be between 1901 and 2025';
    }
    if (isNaN(end) || end < 1901 || end > 2025) {
      newErrors.yearEnd = 'Year must be between 1901 and 2025';
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
      negroLeaguesEnabled,
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
          placeholder="1901"
          error={errors.yearStart}
        />
        <Input
          value={yearEnd}
          onChange={setYearEnd}
          name="yearEnd"
          label="End Year"
          type="number"
          placeholder="2025"
          error={errors.yearEnd}
        />
      </div>

      <Toggle
        checked={injuriesEnabled}
        onChange={setInjuriesEnabled}
        label="Enable Injuries"
      />

      <Toggle
        checked={negroLeaguesEnabled}
        onChange={setNegroLeaguesEnabled}
        label="Include Negro League Players"
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-button bg-ballpark px-6 py-2 font-medium text-ink hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving...' : 'Save League'}
      </button>
    </form>
  );
}

export default LeagueConfigForm;
