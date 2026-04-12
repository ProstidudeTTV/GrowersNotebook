import { isNonStrainPromoCatalogRow } from './catalog-promo-exclusions';

describe('isNonStrainPromoCatalogRow', () => {
  it('flags free-seed SKUs', () => {
    expect(
      isNonStrainPromoCatalogRow({
        strain_name: '3 Free Seeds - £75 to £100',
        breeder: 'Some Bank',
      }),
    ).toBe(true);
  });

  it('flags merch-style product lines', () => {
    expect(
      isNonStrainPromoCatalogRow({ strain_name: 'Rolling Papers King Size', breeder: 'X' }),
    ).toBe(true);
    expect(
      isNonStrainPromoCatalogRow({ strain_name: 'Grinder — Merch', breeder: 'X' }),
    ).toBe(true);
  });

  it('does not flag real cultivar names with ambiguous words', () => {
    expect(
      isNonStrainPromoCatalogRow({
        strain_name: 'Pepper Jack Haze',
        breeder: 'Bank',
      }),
    ).toBe(false);
    expect(
      isNonStrainPromoCatalogRow({ strain_name: 'White Widow', breeder: 'Bank' }),
    ).toBe(false);
  });
});
