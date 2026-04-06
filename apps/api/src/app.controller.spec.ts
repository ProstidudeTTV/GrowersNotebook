import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return status and database flag', async () => {
      const h = await appController.health();
      expect(['ok', 'degraded']).toContain(h.status);
      expect(typeof h.databaseConfigured).toBe('boolean');
    });
  });
});
