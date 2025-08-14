const request = require('supertest');
const app = require('./app');

describe('App', () => {
    it('GET / should respond with Hello, CI/CD World!', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Hello, CI/CD World!');
    });

    // NEW failing test (endpoint not implemented yet)
    it('GET /new should respond with Hello, New Endpoint!', async () => {
        const res = await request(app).get('/new');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Hello, New Endpoint!');
    });
});

