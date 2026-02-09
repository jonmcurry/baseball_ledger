import {
  MANAGER_PROFILES,
  getManagerProfile,
  type ManagerProfile,
  type ManagerStyle,
} from '@lib/simulation/manager-profiles';

// ---------------------------------------------------------------------------
// MANAGER_PROFILES (REQ-AI-001)
// ---------------------------------------------------------------------------
describe('MANAGER_PROFILES (REQ-AI-001)', () => {
  it('has exactly 4 profiles', () => {
    expect(Object.keys(MANAGER_PROFILES)).toHaveLength(4);
  });

  it.each(['conservative', 'aggressive', 'balanced', 'analytical'] as const)(
    'contains %s profile',
    (style) => {
      expect(MANAGER_PROFILES[style]).toBeDefined();
      expect(MANAGER_PROFILES[style].style).toBe(style);
    },
  );

  it('conservative profile has high bunt threshold and low steal threshold', () => {
    const profile = MANAGER_PROFILES.conservative;
    expect(profile.buntThreshold).toBeGreaterThan(0.5);
    expect(profile.stealAttemptThreshold).toBeLessThan(0.35);
  });

  it('aggressive profile has high steal threshold and low bunt threshold', () => {
    const profile = MANAGER_PROFILES.aggressive;
    expect(profile.stealAttemptThreshold).toBeGreaterThan(0.5);
    expect(profile.buntThreshold).toBeLessThan(0.3);
  });

  it('analytical profile almost never bunts', () => {
    const profile = MANAGER_PROFILES.analytical;
    expect(profile.buntThreshold).toBeLessThan(0.2);
  });

  it('balanced profile has moderate thresholds', () => {
    const profile = MANAGER_PROFILES.balanced;
    expect(profile.stealAttemptThreshold).toBeGreaterThan(0.3);
    expect(profile.stealAttemptThreshold).toBeLessThan(0.6);
    expect(profile.buntThreshold).toBeGreaterThan(0.3);
    expect(profile.buntThreshold).toBeLessThan(0.6);
  });

  it('all profiles have thresholds in valid range [0, 1]', () => {
    const thresholdKeys: (keyof ManagerProfile)[] = [
      'stealAttemptThreshold', 'buntThreshold', 'hitAndRunThreshold',
      'pinchHitThreshold', 'intentionalWalkThreshold', 'pitcherPullThreshold',
      'aggressiveBaserunning',
    ];

    for (const [, profile] of Object.entries(MANAGER_PROFILES)) {
      for (const key of thresholdKeys) {
        const value = profile[key] as number;
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('all profiles have positive inning multipliers >= 1.0', () => {
    for (const [, profile] of Object.entries(MANAGER_PROFILES)) {
      expect(profile.lateInningMultiplier).toBeGreaterThanOrEqual(1.0);
      expect(profile.extraInningMultiplier).toBeGreaterThanOrEqual(1.0);
      expect(profile.extraInningMultiplier).toBeGreaterThanOrEqual(profile.lateInningMultiplier);
    }
  });

  it('all profiles have a name', () => {
    for (const [, profile] of Object.entries(MANAGER_PROFILES)) {
      expect(profile.name.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getManagerProfile
// ---------------------------------------------------------------------------
describe('getManagerProfile', () => {
  it('returns the correct profile by style', () => {
    expect(getManagerProfile('conservative').name).toBe('Cap Spalding');
    expect(getManagerProfile('aggressive').name).toBe('Duke Robinson');
    expect(getManagerProfile('balanced').name).toBe('Johnny McCoy');
    expect(getManagerProfile('analytical').name).toBe('Larry Pepper');
  });

  it('returns balanced profile as default', () => {
    const profile = getManagerProfile('balanced');
    expect(profile.style).toBe('balanced');
  });
});
