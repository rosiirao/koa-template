import request from 'supertest';
import startApp from '../app';

describe('api test', () => {
  const appTest = request(startApp().callback());
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

  it('auth service', async () => {
    const authorization = await appTest
      .post('/auth/login')
      .send('username=admin&password=1234')
      .expect(200)
      .then(function (v) {
        return v.get('Bearer');
      });

    expect(authorization).toEqual(expect.any(String));
    return Promise.all([
      appTest
        .get('/auth/who')
        .set({
          Authorization: 'Bearer ' + authorization,
        })
        .expect(200),
      appTest
        .get('/auth/who')
        .set({
          Authorization: 'Bearer ',
        })
        .expect(401),
    ]);
  });
});
