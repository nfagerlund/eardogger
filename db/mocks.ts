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

let userOneDogears = [
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
  return userOneDogears[0];
};

let update: FDogearUpdate = async function(userID: number, current: string) {
  return [userOneDogears[0]];
}

let list: FDogearList = async function(userID: number) {
  if (userID === 1) {
    return userOneDogears;
  } else {
    return [];
  }
}

let destroy: FDogearDestroy = async function(userID: number, id: number) {
  return;
}

let currently: FDogearCurrently = async function(userID: number, urlOrPrefix: string) {
  return userOneDogears[0].current;
}

let dogears = {
  create,
  update,
  list,
  destroy,
  currently,
};

export {
  dogears,
};
