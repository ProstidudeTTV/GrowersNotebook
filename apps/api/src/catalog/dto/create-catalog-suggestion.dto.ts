import { IsIn, IsObject } from 'class-validator';

export const CATALOG_SUGGESTION_KINDS = [
  'new_strain',
  'new_breeder',
  'edit_strain',
  'edit_breeder',
] as const;

export type CatalogSuggestionKindDto =
  (typeof CATALOG_SUGGESTION_KINDS)[number];

export class CreateCatalogSuggestionDto {
  @IsIn(CATALOG_SUGGESTION_KINDS as unknown as string[])
  kind!: CatalogSuggestionKindDto;

  @IsObject()
  payload!: Record<string, unknown>;
}
