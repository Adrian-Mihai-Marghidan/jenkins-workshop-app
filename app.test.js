const request = require('supertest');
const app = require('./app');

describe('GET /', () => {
    it('should respond to a new endpoint', async () => {
        const response = await request(app).get('/new');
        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('Hello, New Endpoint!');
    });
})