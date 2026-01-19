describe('Monday Form Submission Routes', () => {
  it('should be importable', () => {
    expect(() => {
      require('../../src/routes/mondayFormSubmissionRoutes');
    }).not.toThrow();
  });

  it('should export mondayFormSubmissionRoutes router', () => {
    const module = require('../../src/routes/mondayFormSubmissionRoutes');
    expect(module.mondayFormSubmissionRoutes).toBeDefined();
  });

  it('should have routes registered', () => {
    const { mondayFormSubmissionRoutes } = require('../../src/routes/mondayFormSubmissionRoutes');
    expect(mondayFormSubmissionRoutes.stack).toBeDefined();
    expect(Array.isArray(mondayFormSubmissionRoutes.stack)).toBe(true);
  });

  it('should have POST routes for form submission', () => {
    const { mondayFormSubmissionRoutes } = require('../../src/routes/mondayFormSubmissionRoutes');
    const hasPost = mondayFormSubmissionRoutes.stack.some((l: any) => l.route && l.route.methods.post);
    expect(hasPost).toBe(true);
  });

  it('should only have POST routes', () => {
    const { mondayFormSubmissionRoutes } = require('../../src/routes/mondayFormSubmissionRoutes');
    const routes = mondayFormSubmissionRoutes.stack.filter((l: any) => l.route);
    const allPost = routes.every((l: any) => l.route.methods.post);
    expect(allPost).toBe(true);
  });

  it('should have multiple routes', () => {
    const { mondayFormSubmissionRoutes } = require('../../src/routes/mondayFormSubmissionRoutes');
    const routes = mondayFormSubmissionRoutes.stack.filter((l: any) => l.route);
    expect(routes.length).toBeGreaterThan(1);
  });

  it('should be a valid Express router', () => {
    const { mondayFormSubmissionRoutes } = require('../../src/routes/mondayFormSubmissionRoutes');
    expect(typeof mondayFormSubmissionRoutes).toBe('function');
  });

  it('should have all routes with valid paths', () => {
    const { mondayFormSubmissionRoutes } = require('../../src/routes/mondayFormSubmissionRoutes');
    mondayFormSubmissionRoutes.stack.filter((l: any) => l.route).forEach((layer: any) => {
      expect(layer.route.path).toBeTruthy();
    });
  });
});
