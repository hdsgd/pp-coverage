import fs from 'node:fs';

describe('fileUploadRoutes initialization behavior', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('creates the MondayFiles directory when it is missing', async () => {
    const existsSpy = jest
      .spyOn(fs, 'existsSync')
      .mockReturnValueOnce(false)
      .mockReturnValue(true);
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

    const module = await import('../../src/routes/fileUploadRoutes');
    expect(module.default).toBeDefined();
    expect(existsSpy).toHaveBeenCalled();

    const createdPathValue = mkdirSpy.mock.calls[0]?.[0];
    const createdPath = createdPathValue ? String(createdPathValue) : undefined;
    expect(createdPath).toBeDefined();
    if (createdPath) {
      expect(createdPath).toContain('MondayFiles');
    }
    expect(mkdirSpy).toHaveBeenCalledWith(createdPathValue, { recursive: true });
  });
});

describe('fileUploadRoutes upload error handling', () => {
  const loadUploadHandler = async () => {
    const routerModule = await import('../../src/routes/fileUploadRoutes');
    const router = routerModule.default;
    const uploadLayer = router.stack.find((layer: any) => layer.route?.path === '/upload-file');
    if (!uploadLayer?.route) {
      throw new Error('Upload route not found');
    }
    const routeStack = uploadLayer.route.stack;
    return routeStack[routeStack.length - 1].handle;
  };

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  it('returns the thrown error message when an Error is raised inside the handler', async () => {
    const handler = await loadUploadHandler();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const file: Record<string, unknown> = {};
    Object.defineProperty(file, 'originalname', {
      get: () => {
        throw new Error('boom-error');
      }
    });

    const req: any = { file };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await handler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'boom-error'
      })
    );
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('uses the unknown error fallback when a non-Error value is thrown', async () => {
    const handler = await loadUploadHandler();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const file: Record<string, unknown> = {};
    Object.defineProperty(file, 'originalname', {
      get: () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw 'string-error';
      }
    });

    const req: any = { file };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await handler(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Erro desconhecido'
      })
    );
  });
});
