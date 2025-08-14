const request = require('supertest');
const app = require('./app');

describe('App Endpoints', () => {
    it('should respond to the root endpoint', async () => {
        const response = await request(app).get('/');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Hello, CI/CD World!');
    });

    it('should respond to a new endpoint', async () => {
        const response = await request(app).get('/new');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Hello, New Endpoint!');
    });
});
