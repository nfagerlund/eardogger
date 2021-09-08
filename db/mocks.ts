import type {
  Dogear,
  FDogearCreate,
  FDogearUpdate,
  FDogearList,
  FDogearDestroy,
  FDogearCurrently,
} from './dogears';
import type {
  User,
  FUserCreate,
  FUserAuthenticate,
  FUserGetByName,
  FUserGetByID,
  FUserSetPassword,
  FUserSetEmail,
  FUserPurgeByName,
} from './users';
import type {
  TokenScope,
  Token,
  Meta,
  FTokenCreate,
  FTokenList,
  FTokenDestroy,
  FTokenFindWithUser,
} from './tokens';

// Dogears mocks:
// - User 1 has a list of dogears
// - User 2 has nothing
// - We're not mocking the create/update behavior, that's well-tested on the DB
//   layer; we just need to test that the functions get CALLED with the right
//   arguments and that they RETURN the expected data format. So those functions
//   don't actually update things and might include wrong userIDs, strings,
//   dates, etc. in the response, N.B.!

let dogearsData: Array<Dogear> = [
  {
    id: 1,
    user_id: 1,
    prefix: 'example.com/comic/',
    current: 'https://example.com/comic/24',
    display_name: 'Example Comic',
    updated: new Date('2019-09-24T03:58:19.571Z'),
  },
  {
    id: 2,
    user_id: 1,
    prefix: 'example.com/serial/',
    current: 'https://example.com/serial/4',
    display_name: 'Example serial',
    updated: new Date('2019-09-26T06:51:18.571Z'),
  }
];

let create: FDogearCreate = async function(userID: number, prefix: string, current: string | null = null, displayName: string | null = null) {
  if (!prefix) {
    throw new Error("called without prefix");
  }
  return dogearsData[0];
};

let update: FDogearUpdate = async function(userID: number, current: string) {
  return [dogearsData[0]];
}

let list: FDogearList = async function(userID: number) {
  if (userID === 1) {
    return dogearsData;
  } else {
    return [];
  }
}

let destroy: FDogearDestroy = async function(userID: number, id: number) {
  return;
}

let currently: FDogearCurrently = async function(userID: number, urlOrPrefix: string) {
  return dogearsData[0].current;
}

let dogears = {
  create,
  update,
  list,
  destroy,
  currently,
};

let usersData: Array<User> = [
  {
    id: 0,
    username: "placeholder",
    email: null,
    created: new Date('2019-09-20T03:58:19.571Z'),
  },
  {
    id: 1,
    username: "nick",
    email: 'nick.fagerlund@example.com',
    created: new Date('2019-09-19T03:58:19.571Z'),
  },
  {
    id: 2,
    username: "wrong_boi",
    email: null,
    created: new Date('2019-09-21T03:58:19.571Z'),
  },
  {
    id: 3,
    username: "new_challenger_joins",
    email: null,
    created: new Date('2021-09-08T03:58:19.571Z'),
  },
];

let userCreate: FUserCreate = async function(username: string, password: string | null = null, email: string | null = null) {
  if (username === '') {
    throw new TypeError("Create user requires username");
  }
  if (username === 'placeholder' || username === 'nick' || username === 'wrong_boi') {
    throw new Error("Username already exists");
  }
  return usersData[3];
}

let userAuthenticate: FUserAuthenticate = async function(username: string, password: string) {
  return password === 'password123'; // we have some Security Professionals in the house
}

let userGetByName: FUserGetByName = async function(username: string) {
  return usersData.find(user => user.username === username);
}

let userGetById: FUserGetByID = async function(id: number) {
  return usersData[id];
}

let userSetPassword: FUserSetPassword = async function(username: string, password: string | null) {
  return;
}

let userSetEmail: FUserSetEmail = async function(username: string, email: string | null) {
  // another one where we're just returning the right shape.
  return usersData[1];
}

let userPurgeByName: FUserPurgeByName = async function(username: string) {
  return;
}

let users = {
  create: userCreate,
  authenticate: userAuthenticate,
  getByName: userGetByName,
  getById: userGetById,
  setPassword: userSetPassword,
  setEmail: userSetEmail,
  purgeByName: userPurgeByName,
};

export {
  dogears,
  users,
};
