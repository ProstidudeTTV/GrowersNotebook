import {
  mapLeaflyAliasesToGnColumns,
  normalizeStrainCatalogRows,
} from './strain-csv-import.service';

describe('normalizeStrainCatalogRows (Leafly / CannaBot)', () => {
  it('maps Strain + Effects + Medical + Leafly extras onto GN columns', () => {
    const [row] = normalizeStrainCatalogRows([
      {
        Strain: 'Blue Dream',
        Type: 'hybrid',
        Rating: '4.5',
        Effects: 'Relaxed, Happy',
        Flavor: 'Berry',
        Description: 'A popular hybrid.',
        thc_level: '21%',
        Terpenes: 'Myrcene',
        Medical: 'Stress',
        relaxed: '30',
        happy: '40',
      },
    ]);
    expect(row.strain_name).toBe('Blue Dream');
    expect(row.effect).toBe('Relaxed, Happy');
    expect(row.medical_strains).toBe('Stress');
    expect(row.flavor).toBe('Berry');
    expect(row.thc).toBe('21%');
    expect(row.strain_type_summary).toBe('hybrid');
    expect(row.relaxed).toBe('30');
  });

  it('does not overwrite existing strain_name or effect', () => {
    const [row] = normalizeStrainCatalogRows([
      {
        strain_name: 'Already',
        effect: 'Calm',
        effects: 'Ignored when effect set',
        Strain: 'Wrong',
      },
    ]);
    expect(row.strain_name).toBe('Already');
    expect(row.effect).toBe('Calm');
  });

  it('preserves GN-shaped rows', () => {
    const [row] = normalizeStrainCatalogRows([
      {
        strain_name: 'GN Row',
        breeder: 'Example Seeds',
        effect: 'Sleepy',
      },
    ]);
    expect(row.strain_name).toBe('GN Row');
    expect(row.breeder).toBe('Example Seeds');
  });
});

describe('mapLeaflyAliasesToGnColumns', () => {
  it('maps medical_uses to medical_strains', () => {
    const row = mapLeaflyAliasesToGnColumns({
      strain_name: 'X',
      medical_uses: 'Pain',
    });
    expect(row.medical_strains).toBe('Pain');
  });
});
