import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { AdminNotebooksController } from './admin-notebooks.controller';
import { NotebookCommentsService } from './notebook-comments.service';
import { NotebooksController } from './notebooks.controller';
import { NotebooksService } from './notebooks.service';

@Module({
  imports: [
    ConfigModule,
    CatalogModule,
    AuthModule,
    forwardRef(() => ProfilesModule),
  ],
  controllers: [NotebooksController, AdminNotebooksController],
  providers: [NotebooksService, NotebookCommentsService],
  exports: [NotebooksService, NotebookCommentsService],
})
export class NotebooksModule {}
