import type { User as EDUser } from './db/users';
import type { TokenScope } from './db/tokens';
import Bearer from 'passport-http-bearer';

// Here's what *I think* is happening here:
// - This merges into the Request type from `@types/express`.
// - I DON'T need to import `typeOverrides` to load this; because it's a .d.ts
//   file and it's swept up by the include directive in my tsconfig, typescript
//   just knows to load types from it.
// - I DO still need to `import type { Request } from 'express'` before I
//   reference the Request type in a type annotation or whatever. There's
//   *something* global available at Express.Request, but it turns out it's
//   probably empty, and doesn't seem to do what we actually want?
// - The `declare global` bit is specifically there in TS for this type of
//   external override. I thought it was only necessary when used from a module,
//   but apparently not, so at this point I don't really know the rules for when
//   it's necessary.
declare global {
  namespace Express {
    // @types/passport adds User and AuthInfo interfaces under Express, but
    // they're empty and meant for users to merge/extend. So now we do that.
    // I already went to the trouble of making a User type, so plz just use it.
    interface User extends EDUser {}
    // thx.

    interface AuthInfo {
      isSession?: boolean,
      isToken?: boolean,
      scope?: TokenScope,
    }

    // N.B. that @types/passport (and a few other things) already tack things
    // onto Request, so I'm not going to double-add those. (I *think* that's
    // best practice, but hey, I'm baby.)
    interface Request {
      isCors?: boolean,
      // user?: User // (from Passport)
      // authInfo?: AuthInfo // (from Passport)
    }
  }

}

declare module 'express-session' {
  interface SessionData {
    returnTo?: string,
  }
}

declare module 'passport-http-bearer' {
  interface IVerifyOptions {
    isToken?: boolean,
  }
}
