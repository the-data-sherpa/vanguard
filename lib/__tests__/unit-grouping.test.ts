/**
 * Parity tests for unit department extraction and grouping
 *
 * These tests verify that the frontend (lib/utils.ts) and backend (convex/postTemplates.ts)
 * implementations produce identical results. This is critical because both are used
 * to display unit groupings - the frontend in the UI, and the backend in Facebook posts.
 */
import { describe, it, expect } from 'vitest';
import {
  extractDepartment as frontendExtractDepartment,
  groupUnitsByDepartment as frontendGroupUnitsByDepartment,
  FIRE_UNIT_SUFFIXES,
  EMS_UNIT_SUFFIXES,
  EMS_PREFIXES,
} from '../utils';
import {
  extractDepartment as backendExtractDepartment,
  groupUnitsByDepartment as backendGroupUnitsByDepartment,
} from '../../convex/postTemplates';

// Comprehensive test cases for extractDepartment
const extractDepartmentTestCases = [
  // Fire units - basic
  { input: 'MOORESVILLE ENGINE', expected: 'Mooresville' },
  { input: 'ALEXANDER LADDER', expected: 'Alexander' },
  { input: 'SHEPHERDS TRUCK', expected: 'Shepherds' },
  { input: 'MOUNT MOURNE TANKER', expected: 'Mount Mourne' },
  { input: 'NORTH IREDELL BRUSH', expected: 'North Iredell' },
  { input: 'TROUTMAN RESCUE', expected: 'Troutman' },
  { input: 'STATESVILLE BATTALION', expected: 'Statesville' },
  { input: 'MOORESVILLE CHIEF', expected: 'Mooresville' },
  { input: 'UNION GROVE CAPTAIN', expected: 'Union Grove' },
  { input: 'HARMONY UTILITY', expected: 'Harmony' },
  { input: 'COOL SPRINGS SQUAD', expected: 'Cool Springs' },
  { input: 'IREDELL HAZMAT', expected: 'Iredell' },
  { input: 'SPECIAL OPS SPECIAL', expected: 'Special Ops' },
  { input: 'MOORESVILLE PUMPER', expected: 'Mooresville' },
  { input: 'CHARLOTTE QUINT', expected: 'Charlotte' },
  { input: 'HUNTERSVILLE TOWER', expected: 'Huntersville' },
  { input: 'CORNELIUS FIRE', expected: 'Cornelius' },

  // Fire units - with trailing numbers
  { input: 'SHEPHERDS BRUSH 1', expected: 'Shepherds' },
  { input: 'Mount Mourne Tanker 1', expected: 'Mount Mourne' },
  { input: 'ALEXANDER ENGINE 2', expected: 'Alexander' },
  { input: 'MOORESVILLE LADDER 15', expected: 'Mooresville' },
  { input: 'NORTH IREDELL BRUSH 123', expected: 'North Iredell' },

  // EMS units - keep EMS suffix (uppercase)
  { input: 'MOORESVILLE EMS', expected: 'Mooresville EMS' },
  { input: 'IREDELL AMBULANCE', expected: 'Iredell EMS' },
  { input: 'STATESVILLE MEDIC', expected: 'Statesville EMS' },

  // EMS units with trailing numbers
  { input: 'MOORESVILLE EMS 1', expected: 'Mooresville EMS' },
  { input: 'IREDELL AMBULANCE 5', expected: 'Iredell EMS' },

  // Generic EMS (starts with EMS prefix)
  { input: 'EMS SUPERVISOR', expected: 'EMS' },
  { input: 'EMS CONVALESCENT', expected: 'EMS' },
  { input: 'MEDIC SUPERVISOR', expected: 'EMS' },
  { input: 'AMBULANCE DISPATCH', expected: 'EMS' },
  { input: 'EMS', expected: 'EMS' },

  // Units without recognized suffixes
  { input: 'MOORESVILLE', expected: 'Mooresville' },
  { input: 'Mount Mourne', expected: 'Mount Mourne' },
  { input: 'SOME RANDOM UNIT', expected: 'Some Random Unit' },

  // Edge cases
  { input: '  MOORESVILLE ENGINE  ', expected: 'Mooresville' }, // whitespace
  { input: 'mooresville engine', expected: 'Mooresville' }, // lowercase
  { input: 'MoOrEsViLlE eNgInE', expected: 'Mooresville' }, // mixed case
];

// Test cases for groupUnitsByDepartment
const sampleUnitLegend = [
  { UnitKey: 'F70E1', Description: 'MOORESVILLE ENGINE 1' },
  { UnitKey: 'F70E2', Description: 'MOORESVILLE ENGINE 2' },
  { UnitKey: 'F70L1', Description: 'MOORESVILLE LADDER 1' },
  { UnitKey: 'F12BR1', Description: 'SHEPHERDS BRUSH 1' },
  { UnitKey: 'F12E1', Description: 'SHEPHERDS ENGINE 1' },
  { UnitKey: 'EMS1', Description: 'MOORESVILLE EMS 1' },
  { UnitKey: 'EMS2', Description: 'IREDELL AMBULANCE 5' },
  { UnitKey: 'VTAC1', Description: 'VTAC CHANNEL' }, // Should be skipped
  { UnitKey: 'UNKNOWN', Description: 'TROUTMAN RESCUE' },
];

describe('extractDepartment parity', () => {
  it.each(extractDepartmentTestCases)(
    'both implementations produce same result for "$input"',
    ({ input, expected }) => {
      const frontendResult = frontendExtractDepartment(input);
      const backendResult = backendExtractDepartment(input);

      // Both should match expected
      expect(frontendResult).toBe(expected);
      expect(backendResult).toBe(expected);

      // And they should match each other
      expect(frontendResult).toBe(backendResult);
    }
  );

  it('handles empty string', () => {
    const frontendResult = frontendExtractDepartment('');
    const backendResult = backendExtractDepartment('');
    expect(frontendResult).toBe(backendResult);
  });
});

describe('groupUnitsByDepartment parity', () => {
  it('both implementations produce identical groupings', () => {
    const units = ['F70E1', 'F70E2', 'F70L1', 'F12BR1', 'F12E1', 'EMS1', 'EMS2', 'VTAC1', 'UNKNOWN'];

    const frontendResult = frontendGroupUnitsByDepartment(units, sampleUnitLegend);
    const backendResult = backendGroupUnitsByDepartment(units, sampleUnitLegend);

    // Convert Maps to sorted arrays for comparison
    const frontendEntries = Array.from(frontendResult.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const backendEntries = Array.from(backendResult.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    expect(frontendEntries).toEqual(backendEntries);
  });

  it('both skip VTAC units', () => {
    const units = ['VTAC1', 'VTAC2', 'F70E1'];
    const legend = [
      { UnitKey: 'VTAC1', Description: 'VTAC CHANNEL 1' },
      { UnitKey: 'VTAC2', Description: 'VTAC CHANNEL 2' },
      { UnitKey: 'F70E1', Description: 'MOORESVILLE ENGINE 1' },
    ];

    const frontendResult = frontendGroupUnitsByDepartment(units, legend);
    const backendResult = backendGroupUnitsByDepartment(units, legend);

    // Should only have Mooresville group, not VTAC
    expect(frontendResult.size).toBe(1);
    expect(backendResult.size).toBe(1);
    expect(frontendResult.has('Mooresville')).toBe(true);
    expect(backendResult.has('Mooresville')).toBe(true);
  });

  it('both handle missing legend entries as "Other"', () => {
    const units = ['UNKNOWN1', 'UNKNOWN2'];
    const legend: { UnitKey: string; Description: string }[] = [];

    const frontendResult = frontendGroupUnitsByDepartment(units, legend);
    const backendResult = backendGroupUnitsByDepartment(units, legend);

    expect(frontendResult.get('Other')).toEqual(['UNKNOWN1', 'UNKNOWN2']);
    expect(backendResult.get('Other')).toEqual(['UNKNOWN1', 'UNKNOWN2']);
  });

  it('both handle case-insensitive unit key matching', () => {
    const units = ['f70e1', 'F70E1'];
    const legend = [{ UnitKey: 'F70E1', Description: 'MOORESVILLE ENGINE 1' }];

    const frontendResult = frontendGroupUnitsByDepartment(units, legend);
    const backendResult = backendGroupUnitsByDepartment(units, legend);

    // Both lowercase and uppercase should match
    expect(frontendResult.get('Mooresville')?.length).toBe(2);
    expect(backendResult.get('Mooresville')?.length).toBe(2);
  });

  it('both handle undefined legend', () => {
    const units = ['F70E1', 'F70E2'];

    const frontendResult = frontendGroupUnitsByDepartment(units, undefined);
    const backendResult = backendGroupUnitsByDepartment(units, undefined);

    // All should be in "Other" when no legend
    expect(frontendResult.get('Other')).toEqual(['F70E1', 'F70E2']);
    expect(backendResult.get('Other')).toEqual(['F70E1', 'F70E2']);
  });
});

describe('suffix constants consistency', () => {
  it('FIRE_UNIT_SUFFIXES includes all expected types', () => {
    expect(FIRE_UNIT_SUFFIXES).toContain('ENGINE');
    expect(FIRE_UNIT_SUFFIXES).toContain('LADDER');
    expect(FIRE_UNIT_SUFFIXES).toContain('TRUCK');
    expect(FIRE_UNIT_SUFFIXES).toContain('TANKER');
    expect(FIRE_UNIT_SUFFIXES).toContain('BRUSH');
    expect(FIRE_UNIT_SUFFIXES).toContain('RESCUE');
    expect(FIRE_UNIT_SUFFIXES).toContain('FIRE');
  });

  it('EMS_UNIT_SUFFIXES includes all expected types', () => {
    expect(EMS_UNIT_SUFFIXES).toContain('AMBULANCE');
    expect(EMS_UNIT_SUFFIXES).toContain('EMS');
    expect(EMS_UNIT_SUFFIXES).toContain('MEDIC');
  });

  it('EMS_PREFIXES includes all expected prefixes', () => {
    expect(EMS_PREFIXES).toContain('EMS ');
    expect(EMS_PREFIXES).toContain('MEDIC ');
    expect(EMS_PREFIXES).toContain('AMBULANCE ');
  });
});
