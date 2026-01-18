import { mapSleepValueToPhase } from '../../../lib/healthkit/types';

describe('HealthKit Types', () => {
  describe('mapSleepValueToPhase', () => {
    it('maps asleepCore to core', () => {
      expect(mapSleepValueToPhase('asleepCore')).toBe('core');
    });

    it('maps asleepDeep to deep', () => {
      expect(mapSleepValueToPhase('asleepDeep')).toBe('deep');
    });

    it('maps asleepREM to rem', () => {
      expect(mapSleepValueToPhase('asleepREM')).toBe('rem');
    });

    it('maps asleepUnspecified to core', () => {
      expect(mapSleepValueToPhase('asleepUnspecified')).toBe('core');
    });

    it('returns null for awake', () => {
      expect(mapSleepValueToPhase('awake')).toBeNull();
    });

    it('returns null for inBed', () => {
      expect(mapSleepValueToPhase('inBed')).toBeNull();
    });
  });
});
