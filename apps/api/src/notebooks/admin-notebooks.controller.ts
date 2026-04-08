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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtUser } from '../auth/jwt-user';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import {
  CreateNotebookAdminDto,
  UpdateNotebookDto,
} from './dto/create-notebook.dto';
import {
  CreateNotebookWeekDto,
  UpdateNotebookWeekDto,
} from './dto/create-week.dto';
import { NotebooksService } from './notebooks.service';

function range(skip: string | undefined, take: string | undefined) {
  const start = Math.max(0, Number(skip ?? 0));
  const end = Math.max(start + 1, Number(take ?? start + 10));
  return { skip: start, take: end - start };
}

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
export class AdminNotebooksController {
  constructor(private readonly notebooks: NotebooksService) {}

  @Post('notebooks')
  createNotebook(@Body() body: CreateNotebookAdminDto) {
    const { ownerId, ...dto } = body;
    return this.notebooks.create(ownerId, dto);
  }

  @Get('notebooks')
  async listNotebooks(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } = await this.notebooks.listPagedAdmin(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Get('notebooks/:id')
  getNotebook(@Param('id', ParseUUIDPipe) id: string) {
    return this.notebooks.getByIdAdmin(id);
  }

  @Patch('notebooks/:id')
  patchNotebook(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateNotebookDto,
  ) {
    return this.notebooks.updateAdmin(id, body);
  }

  @Delete('notebooks/:id')
  deleteNotebook(@Param('id', ParseUUIDPipe) id: string) {
    return this.notebooks.deleteAdmin(id);
  }

  @Post('notebooks/:id/weeks')
  addWeek(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() body: CreateNotebookWeekDto,
  ) {
    return this.notebooks.createWeek(id, user.sub, body, true);
  }

  @Patch('notebooks/:notebookId/weeks/:weekId')
  patchWeek(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @Param('weekId', ParseUUIDPipe) weekId: string,
    @CurrentUser() user: JwtUser,
    @Body() body: UpdateNotebookWeekDto,
  ) {
    return this.notebooks.updateWeek(notebookId, weekId, user.sub, body, true);
  }

  @Delete('notebooks/:notebookId/weeks/:weekId')
  removeWeek(
    @Param('notebookId', ParseUUIDPipe) notebookId: string,
    @Param('weekId', ParseUUIDPipe) weekId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notebooks.deleteWeek(notebookId, weekId, user.sub, true);
  }

  @Get('nutrient-products')
  async listNutrientProducts(
    @Query('_start') _start: string,
    @Query('_end') _end: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { skip, take } = range(_start, _end);
    const { rows, total } =
      await this.notebooks.listNutrientProductsPagedAdmin(skip, take);
    res.setHeader('X-Total-Count', String(total));
    return rows;
  }

  @Get('nutrient-products/:id')
  getNutrient(@Param('id', ParseUUIDPipe) id: string) {
    return this.notebooks.getNutrientProductAdmin(id);
  }

  @Post('nutrient-products')
  createNutrient(
    @Body()
    body: {
      name: string;
      brand?: string | null;
      npk?: string | null;
      published?: boolean;
    },
  ) {
    return this.notebooks.createNutrientProduct(body);
  }

  @Patch('nutrient-products/:id')
  patchNutrient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: Partial<{
      name: string;
      brand: string | null;
      npk: string | null;
      published: boolean;
    }>,
  ) {
    return this.notebooks.updateNutrientProduct(id, body);
  }

  @Delete('nutrient-products/:id')
  deleteNutrient(@Param('id', ParseUUIDPipe) id: string) {
    return this.notebooks.deleteNutrientProduct(id);
  }
}
