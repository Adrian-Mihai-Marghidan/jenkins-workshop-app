const request = require('supertest');
const app = require('./app');

describe('GET /', () => {
  it('should respond with "Hello, CI/CD World!"', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Hello, CI/CD World!');
  });
});