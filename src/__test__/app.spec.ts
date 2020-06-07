import request from 'supertest';
import app from '../app';

describe('api test', () => {
  const appTest = request(app.callback());
  it('kubernete status api', async () => {
    const testQueue = [
      appTest
        .get('/api/readyz')
        .expect(200)
        .expect('Content-Type', /text\/plain/),
      appTest
        .get('/api/healthz')
        .expect(200)
        .expect('Content-Type', /text\/plain/),
      appTest.get('/api/version').expect(200).expect('Content-Type', /json/),
    ];
    await Promise.all(testQueue);
    //
    // need return last test unit to avoid jest open handle error.
    //
    return appTest.get('/not-found').expect(404);
    // return appTest
    //   .get('/api/version')
    //   .expect(200)
    //   .expect('Content-Type', /json/);
  });
});
