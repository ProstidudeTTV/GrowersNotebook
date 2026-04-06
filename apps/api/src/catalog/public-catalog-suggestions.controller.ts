import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import type { CatalogSuggestionKind } from '../db/schema';
import { CatalogSuggestionsService } from './catalog-suggestions.service';
import { CreateCatalogSuggestionDto } from './dto/create-catalog-suggestion.dto';

@Controller('catalog')
export class PublicCatalogSuggestionsController {
  constructor(private readonly suggestions: CatalogSuggestionsService) {}

  @Post('suggestions')
  @UseGuards(SupabaseAuthGuard)
  create(
    @CurrentUser() user: JwtUser,
    @Body() body: CreateCatalogSuggestionDto,
  ) {
    return this.suggestions.create(
      user.sub,
      body.kind as CatalogSuggestionKind,
      body.payload,
    );
  }
}
