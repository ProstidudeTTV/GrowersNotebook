import {
  detectAutoflowerFromRowAndDescription,
  inferBreederNameFromProse,
  leaflyReportedEffectPctsFromRow,
  parseLeaflyReportedEffectsLineFromNotes,
  stripLeaflyReportedEffectsLineFromNotes,
} from './strain-catalog-enrichment';

describe('strain-catalog-enrichment', () => {
  it('parses Leafly effect columns into percentages', () => {
    const p = leaflyReportedEffectPctsFromRow({
      relaxed: '30',
      happy: '40%',
      euphoric: 'n/a',
    });
    expect(p.relaxed).toBe(30);
    expect(p.happy).toBe(40);
    expect(p.euphoric).toBeUndefined();
  });

  it('infers breeder credit from prose', () => {
    expect(
      inferBreederNameFromProse('Classic hybrid. By Mephisto Genetics.'),
    ).toBe('Mephisto Genetics');
    expect(
      inferBreederNameFromProse('Bred by Fast Buds for compact grows.'),
    ).toBe('Fast Buds');
  });

  it('detects autoflower from row fields and description', () => {
    expect(
      detectAutoflowerFromRowAndDescription(
        { flowering_period_type: 'Autoflowering' },
        'Nice plant.',
      ),
    ).toBe(true);
    expect(
      detectAutoflowerFromRowAndDescription(
        {},
        'Ruderalis-influenced and fast finishing.',
      ),
    ).toBe(true);
    expect(
      detectAutoflowerFromRowAndDescription({}, 'Classic photoperiod hybrid.'),
    ).toBe(false);
  });

  it('parses legacy lab-notes Leafly line', () => {
    const notes =
      'THC / CBD: 20 / 1\nReported effects (Leafly-style): Relaxed 45%, Happy 30%';
    const p = parseLeaflyReportedEffectsLineFromNotes(notes);
    expect(p?.relaxed).toBe(45);
    expect(p?.happy).toBe(30);
    expect(stripLeaflyReportedEffectsLineFromNotes(notes)).toBe(
      'THC / CBD: 20 / 1',
    );
  });
});
