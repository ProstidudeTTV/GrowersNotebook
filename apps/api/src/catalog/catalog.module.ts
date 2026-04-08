import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NameBlocklistModule } from '../name-blocklist/name-blocklist.module';
import { BreedersService } from './breeders.service';
import { CatalogReviewModerationService } from './catalog-review-moderation.service';
import { CatalogSuggestionsService } from './catalog-suggestions.service';
import { PublicBreedersController } from './public-breeders.controller';
import { PublicCatalogSuggestionsController } from './public-catalog-suggestions.controller';
import { PublicStrainsController } from './public-strains.controller';
import { StrainCsvImportService } from './strain-csv-import.service';
import { StrainsService } from './strains.service';

@Module({
  imports: [NameBlocklistModule, AuthModule],
  controllers: [
    PublicBreedersController,
    PublicStrainsController,
    PublicCatalogSuggestionsController,
  ],
  providers: [
    BreedersService,
    StrainsService,
    CatalogSuggestionsService,
    CatalogReviewModerationService,
    StrainCsvImportService,
  ],
  exports: [
    BreedersService,
    StrainsService,
    CatalogSuggestionsService,
    CatalogReviewModerationService,
    StrainCsvImportService,
  ],
})
export class CatalogModule {}
