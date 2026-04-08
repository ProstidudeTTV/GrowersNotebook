import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { JwtUser } from '../auth/jwt-user';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { StrainsService } from '../catalog/strains.service';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateNotebookCommentDto } from './dto/create-notebook-comment.dto';
import { CreateNotebookDto, UpdateNotebookDto } from './dto/create-notebook.dto';
import {
  CreateNotebookWeekDto,
  UpdateNotebookWeekDto,
} from './dto/create-week.dto';
import { NotebookCommentsService } from './notebook-comments.service';
import { NotebooksService } from './notebooks.service';

@Controller('notebooks')
export class NotebooksController {
  constructor(
    private readonly notebooks: NotebooksService,
    private readonly notebookComments: NotebookCommentsService,
    private readonly strains: StrainsService,
  ) {}

  @Get('nutrient-products')
  @UseGuards(OptionalAuthGuard)
  listNutrients(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.notebooks.listNutrientProducts({
      q,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 30,
    });
  }

  @Get('strain-suggestions')
  @UseGuards(OptionalAuthGuard)
  async strainSuggestions(
    @Query('q') q?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const ps = Math.min(25, Math.max(1, pageSize ? Number(pageSize) : 12));
    const res = await this.strains.listPublic({
      q,
      sort: 'name',
      page: 1,
      pageSize: ps,
    });
    return {
      items: res.items.map((s: { id: string; name: string; slug: string }) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
      })),
    };
  }

  @Get()
  @UseGuards(OptionalAuthGuard)
  listPublic(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.notebooks.listPublic({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 24,
      viewerId: user?.sub,
    });
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  create(
    @CurrentUser() user: JwtUser,
    @Body() body: CreateNotebookDto,
  ) {
    return this.notebooks.create(user.sub, body);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.notebooks.getById(id, user?.sub);
  }

  @Patch(':id')
  @UseGuards(SupabaseAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: UpdateNotebookDto,
  ) {
    return this.notebooks.updateOwn(user.sub, id, body);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notebooks.deleteOwn(user.sub, id);
  }

  @Post(':id/weeks')
  @UseGuards(SupabaseAuthGuard)
  addWeek(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: CreateNotebookWeekDto,
  ) {
    return this.notebooks.createWeek(id, user.sub, body, false);
  }

  @Patch(':notebookId/weeks/:weekId')
  @UseGuards(SupabaseAuthGuard)
  patchWeek(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @Param('weekId', ParseUUIDPipe) weekId: string,
    @CurrentUser() user: JwtUser,
    @Body() body: UpdateNotebookWeekDto,
  ) {
    return this.notebooks.updateWeek(notebookId, weekId, user.sub, body, false);
  }

  @Delete(':notebookId/weeks/:weekId')
  @UseGuards(SupabaseAuthGuard)
  removeWeek(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @Param('weekId', ParseUUIDPipe) weekId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notebooks.deleteWeek(notebookId, weekId, user.sub, false);
  }

  @Get(':id/comments')
  @UseGuards(OptionalAuthGuard)
  listComments(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: JwtUser,
  ) {
    return this.notebookComments.listForNotebook(id, user?.sub);
  }

  @Post(':id/comments')
  @UseGuards(SupabaseAuthGuard)
  async postComment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: CreateNotebookCommentDto,
  ) {
    const row = await this.notebookComments.create(id, user.sub, {
      parentId: body.parentId ?? null,
      body: body.body,
      imageUrls: body.imageUrls,
    });
    return row;
  }

  @Delete(':notebookId/comments/:commentId')
  @UseGuards(SupabaseAuthGuard)
  deleteComment(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notebookComments.deleteComment(user.sub, notebookId, commentId);
  }
}
