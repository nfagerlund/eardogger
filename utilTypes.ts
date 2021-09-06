import type { User } from './db/users';
import type { TokenScope } from './db/tokens';

interface EardoggerExpressRequest extends Express.Request {
  user?: User,
  authInfo?: {
    isSession?: boolean,
    isToken?: boolean,
    scope?: TokenScope,
  }
}

export type {
  EardoggerExpressRequest,
};
