const request = require('supertest');
const app = require('./app');

describe('GET /', () => {
    it('responds "Hello, CI/CD World!"', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Hello, CI/CD World!');
    });
});

describe('GET /new', () => {
    it('responds "Hello, New Endpoint!"', async () => {
        const res = await request(app).get('/new');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Hello, New Endpoint!');
    });
});
