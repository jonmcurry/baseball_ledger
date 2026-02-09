/**
 * CSV Parse Performance Benchmark
 *
 * REQ-NFR-003: CSV parse + card generation < 10s
 * REQ-TEST-012: Performance benchmarks
 *
 * Uses performance.now() timing in standard test format.
 */

import { parseCsvFull } from '../../src/lib/csv/parser';

describe('csv-parse performance benchmarks', () => {
  it('REQ-NFR-003: parse 100-row CSV under 100ms', () => {
    const header = 'playerID,yearID,stint,teamID,lgID,G,AB,R,H,2B,3B,HR,RBI,SB,CS,BB,SO,IBB,HBP,SH,SF,GIDP';
    const rows: string[] = [header];
    for (let i = 0; i < 100; i++) {
      rows.push(`player${i},1990,1,NYA,AL,${150 + (i % 12)},${500 + i},${70 + (i % 30)},${140 + (i % 50)},${25 + (i % 15)},${3 + (i % 5)},${15 + (i % 20)},${70 + (i % 40)},${10 + (i % 20)},${3 + (i % 5)},${50 + (i % 30)},${80 + (i % 40)},${2 + (i % 3)},${3 + (i % 4)},${1 + (i % 3)},${4 + (i % 5)},${10 + (i % 10)}`);
    }
    const csvText = rows.join('\n');

    const start = performance.now();
    const result = parseCsvFull(csvText);
    const elapsed = performance.now() - start;

    expect(result.data).toHaveLength(100);
    expect(elapsed).toBeLessThan(100);
  });

  it('REQ-NFR-003: parse 1000-row CSV under 500ms', () => {
    const header = 'playerID,yearID,stint,teamID,lgID,G,AB,R,H,2B,3B,HR,RBI,SB,CS,BB,SO,IBB,HBP,SH,SF,GIDP';
    const rows: string[] = [header];
    for (let i = 0; i < 1000; i++) {
      rows.push(`player${i},1990,1,NYA,AL,${150 + (i % 12)},${500 + i},${70 + (i % 30)},${140 + (i % 50)},${25 + (i % 15)},${3 + (i % 5)},${15 + (i % 20)},${70 + (i % 40)},${10 + (i % 20)},${3 + (i % 5)},${50 + (i % 30)},${80 + (i % 40)},${2 + (i % 3)},${3 + (i % 4)},${1 + (i % 3)},${4 + (i % 5)},${10 + (i % 10)}`);
    }
    const csvText = rows.join('\n');

    const start = performance.now();
    const result = parseCsvFull(csvText);
    const elapsed = performance.now() - start;

    expect(result.data).toHaveLength(1000);
    expect(elapsed).toBeLessThan(500);
  });
});
