test("I literally have no idea what I'm doing", () => {
  expect(process.env.NODE_ENV).toBe('test');
});

test("how about deep object matching", () => {
  expect({hi: {yo: 'hey'}}).toEqual({hi: {yo: 'hey'} });
});

const fakeDB = {};

describe("here's some async stuff that needs to actually finish", () => {
  beforeAll( async () => {
    const thing = await Promise.resolve('just sitting here, not returning anything');
    console.log('LOGGED FROM SPACE');
    await new Promise( (resolve, reject) => {
      setTimeout( () => {
        fakeDB.fakeprop = "value got set";
        resolve();
      }, 1000); // lol just don't set it to 5000 because that's Jest's default timeout!
    } );
  });

  test("did that work?", () => {
    expect(fakeDB.fakeprop).toBe('value got set');
  });

  test("now test something that returns a promise...", () => {
    const someDbQuery = Promise.resolve({rows: [{userID: 1}]});
    return someDbQuery.then(x => {
      expect(x.rows[0].userID).toBe(1);
    })
  });

  test("same but async.", async () => {
    const someDbQuery = await Promise.resolve({rows: [{userID: 1}]});
    expect(someDbQuery.rows[0].userID).toBe(1);
  });

  test("now with multiple expects... oh wait, I bet you could just put them all in the same .then promise.", () => {
    const someDbQuery = Promise.resolve({rows: [{userID: 1, prefix: 'example.com/comic'}]});
    return someDbQuery.then(x => {
      expect(x.rows[0].userID).toBe(1);
      expect(x.rows[0].prefix).toBe('example.com/comic');
    })
  });

  test("but how about with multiple async tasks... probably just have to chain the thens, or use async await. Oh, actually yeah, that's definitely it. That, or use Promise.all() at some point. I bet I could even return a Promise.all(), actually. // OH WOW, IT EVEN RAN THOSE IN PARALLEL", () => {
    return Promise.all([
      new Promise((resolve, reject) => {
        setTimeout(() => {expect(1).toBe(1); resolve()}, 1000);
      }),
      new Promise((resolve, reject) => {
        setTimeout(() => {expect(2).toBe(2); resolve()}, 1000);
      })
    ]);
  });

});
