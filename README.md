# Eardogger

Eardogger is a movable bookmarks service, for reading serialized content on the web.

[It runs as a free service at Eardogger.com](https://eardogger.com).

## Concepts

- Dogears are bookmarks that act like a cursor. Their permanent identifier is a URL prefix, but the full URL they point to can change frequently.
- Updating a dogear involves sending a URL. Any dogears whose prefixes match it will update.
- That's about it.

## Environment Variables

The app needs these in order to run properly.

- `SITE_HOSTNAME` — Full hostname without protocol; only required if deploying somewher other than eardogger.com, e.g. eardogger.glitch.me for my dev server.
- `DATABASE_URL` — Postgres connection string. Heroku automatically provides this.
- `PORT` — Port for webserver to bind to. Heroku and Glitch automatically provide this.
- `SESSION_SECRET` — Arbitrary secret used for securing user login sessions. No one provides it.
- `USE_PROXY` — Should usually be set to something truthy. Express has issues with trying to set `secure` cookies if it _thinks_ it's speaking HTTP to clients, and in a normal deployment TLS gets terminated long before Express gets involved. Symptom of getting this wrong: it won't fuckin' let you log in.
- `EARDOGGER_INSECURE` - Set this to enable non-`secure` cookies in dev mode. Basically I didn't design these holistically, and there are actually three scenarios:
    - HTTP all the way through: set this.
    - HTTPS but TLS gets terminated before us and Express is speaking HTTP: set `USE_PROXY`.
    - HTTPS all the way through: set neither.

## Running Migrations

`yarn run db-migrate up --env prod`

For the dev server on glitch, gotta use npx instead of yarn run (and specify `dev`).

Migrations use database.json for their config, which in turn mostly defers to `DATABASE_URL`.

## v1 API

- [POST /api/v1/create](#post-api-v1-create)
- [POST /api/v1/update](#post-api-v1-update)
- [GET /api/v1/list](#get-api-v1-list)
- [DELETE /api/v1/dogear/:id](#delete-api-v1-dogear-id)

All API calls require a session cookie for auth, because they're meant to be called by bookmarklets or browser extensions or the UI. API calls only act on the authenticated user's objects; there's no admin API.

Most endpoints are not available for CORS.

Everything expects `application/json`, and returns `application/json` if it has anything to return.

- 401 means the request wasn't authenticated, which right now means there was no session cookie. Can't do anything with your dogears if I don't know who you are.
- 404 either means 404 for real, or the thing exists but you're not allowed to mess with it.
- 400 usually comes with an `{error: "description"}` object.

A few endpoints can return dogear objects, which look like this:

```javascript
{
  "prefix": "string", // without protocol
  "current": "URL",
  "display_name": "display name", // optional
  "updated": "last update time", // whatever JSON.serialize does with Date objects. "2019-09-17T16:14:40.999Z".
  "user_id": integer,
  "id": integer
}
```

### POST /api/v1/create

Make a new dogear at the specified prefix. If one already exists, update it instead.

#### Body:

```json
{
  "prefix": "http://example.com/comic",
  "current": "http://example.com/comic/24",
  "display_name": "Example Comic"
}
```

#### Body parameters:

Name | Type | Desc
-|-|-
`prefix` | string (URL) | The URL prefix that identifies this dogear. Protocol is optional, and gets stripped during creation.
`current` | string (URL) | (optional) Full URL to the dogear's current position. If omitted, defaults to the prefix.
`display_name` | string | (optional) Display name for this dogear.

#### Returns:

Outcome | Response
-|-
Success | 201, dogear object.
Malformed, bad API version, etc. | 400, JSON object with `{error: "error message"}`


### POST /api/v1/update

Update position of any dogears that match the provided URL.

This is the fire-and-forget version; there's also a UI method to update a dogear, which falls back to offering a create form if the dogear doesn't exist.

#### Body:

```json
{
  "current": "http://example.com/comic/24"
}
```

#### Body parameters:

Name | Type | Desc
-|-|-
`current` | string (URL) | Full URL to the dogear's new position.

#### Returns:

Outcome | Response
-|-
Success | 200, array of dogear objects
Can't find dogear | 404, empty
Malformed, bad API version, etc. | 400, JSON object with `{error: "error message"}`


### GET /api/v1/list

List all dogears.

#### Query parameters:

Name | Type | Desc
-|-|-
`page` | integer | The page of dogears to return. Defaults to `1`.
`size` | integer | The number of dogears to return per page. Defaults to `50`.

#### Returns

Outcome | Response
-|-
Success | 200, `{data: array-of-dogears, meta: list-metadata}`
Malformed, bad API version, etc. | 400, JSON object with `{error: "error message"}`

The `meta` key of the response is an object describing the pagination details and the shape of the whole dataset. Using Typescript notation, the expected format is:

```typescript
{
  pagination: {
    current_page: number,
    prev_page: number | null,
    next_page: number | null,
    total_pages: number,
    total_count: number,
  },
}
```

### DELETE /api/v1/dogear/:id

Deletes the dogear with the specified ID, if it exists and belongs to the current user.

#### URL parameters:

Name | Type | Desc
-|-|-
`:id` | integer | The ID of a dogear. Currently, you need to get the ID from the /list, /update, or /create endpoint (probably /list).

#### Returns

Outcome | Response
-|-
Success | 204, empty
Can't find dogear | 404, empty


## Future API

Here are some endpoints I might need at some point, but don't currently.

- `GET /api/v1/current/:url`
- `GET /api/v1/dogear/:id`
- `GET /api/v1/account`


## Not Really API or UI

These tend to redirect you to a real web page, even though they're called programmatically.

### POST /login

Expects form-encoded username and password fields.

On success, redirects to wherever you were redirected here from, or to / if it doesn't know. On fail, just loops back around and shows a message (ideally, might be a few revs in for that).

### POST /logout

Logs out immediately, redirects to /.

No body expected.

If not logged in, just redirects to / anyway without complaining.

### POST /signup

Expects form-encoded username, password, and passwordagain fields.

Creates a new account and logs it in.

If password and passwordagain don't match, redirect to /login with an error message. But also, JS on that page should just warn you they don't match and prevent submitting. (still, need an http backstop in case someone does something dumb/funny.)

If logged in, returns 403 forbidden w/ message saying you need to log out before creating. This shouldn't even be possible to hit through the normal flow, though. Maybe an app/extension could fuck with it, idk.

## UI

### /

- If logged out:
    - Display info
    - display login form
    - display signup form
- If logged in:
    - Display list of dogears
    - Display logout button
    - Display bookmarklet install instructions
    - Display create and update forms (maybe??? they're bad ui, but also why not, put them somewhere out of the way.)
- Link to:
    - /about

### /about

- Summary
- Link to API docs
- FAQ
- Things u could read

### /install

Install instructions for bookmarklets and eventually other stuff.

### /mark/:url

Update any matching dogears for :url, then redirect back to :url.

If there aren't any matching dogears, offer to create a new one and ask for a prefix to use. Then redirect back to :url.

URL parameters:

Name | Description
-|-
:url | URL-encoded URL (yo dawg) of the URL you want to dogear.

- If it found and updated existing dogears:
    - Display "Dogears updated" page w/ 3-sec countdown; 302 to :url after countdown.
- If no dogears matched:
    - Display create form
        - Only offer prefix; display :url but leave it hardcoded.
        - On success: display "Dogear created" page w/ 3-sec countdown; 302 to :url after countdown.
- If no session: login form, which redirects to self on success.

### /resume/:url

Immediately redirect to the current position of the most specific dogear that matches :url.

If there aren't any matching dogears, offer a choice between creating a new one or just returning to where you were.

URL parameters:

Name | Description
-|-
:url | The URL-encoded URL (yo dawg) to retrieve a dogear for.

Returns:

Outcome | Response
-|-
Success | 302 "found" redirect to current location of dogear.
Can't find bookmark | 404, but probably like, a nice 404.

## Architecture

I forgot to write much of anything down for the first-gen architecture and regretted it! So here's the lowdown on the current setup.

This is definitely TMI, but nothing ought to be especially exploitable without first stealing all of my login credentials for literally everything, and I think it would all be pretty easy to discover if you managed to do that anyway. So let's go ahead and fight the REAL enemy: my flaky-ass memory and the fact that I only do maintenance on this site like once a year.

Private note: Garbage Book has a bunch of notes from when I was setting everything up; look around 2022.11.25 for it.

### Prod Environment

- App container: fly.io
    - It's the `eardogger-prod` app in Nick's personal organization.
    - One `shared-cpu-1x` firecracker VM, 256mb ram.
    - No persistent volumes.
    - Region: `sea`
        - Fly uses its own self-hosted regions, apps can run in multiple regions if their scale count allows.
    - `DATABASE_URL` and `SESSION_SECRET` are in Fly's "secrets" for the app.
        - DB info can be gotten from Neon dashboard (gotta add the db user password from the Neon entry in Nick's 1pass, at the start of the URL like user:pass)
        - Session secret is in Nick's 1pass, but also you can always just re-set it and all it'll do is force everyone to log in again.
    - Other env vars are in the `[env]` section of the deploy config; they're persisted in the remote app database, but they don't appear anywhere in the UI 🤷🏽.
    - Deployment method: running `fly deploy -c fly.prod.toml` (w/ the fly CLI logged in as Nick) from a local checkout of the repo at the desired commit -- no CI/git-ops remote deployment at this time.
    - Deployment config: fly.prod.toml in this repo.
        - It's not the default filename (on purpose!), which is why the `fly` commands all need the `-c` option.
        - `fly deploy` always uses the local toml file to update the remote state, so it's _sort of_ IAC-ish.
- Database: neon.tech
    - "Project": `eardogger`
    - region: us-west-2 (Oregon)
        - Neon uses AWS regions.
        - Region is set per-project at creation time and can't be changed; going to a different region means a full service migration.
        - Oregon (The Dalles?) and Seattle are close enough that this feels about as snappy as the Heroku config (both components in us-east-1) did. It's probably measurably slower, but not perceptibly.
    - Database: `eardogger_prod`
    - Postgres user: `eardogger_prod` (regretting that, should have made the names distinguishable just to help with my inability to read Postgres GRANT statements or connection strings in the correct order.)
        - The password is in Nick's 1pass under Neon.
- DNS: Hover
    - I dropped Cloudflare for this because it doesn't work very well in front of Fly for whatever reason.
        - Kept throwing 525 error codes. Might be a ciphersuite problem, might be something else, no one really seems to know and it doesn't seem to affect all apps equally, but it's officially Not Recommended, so bye.
        - The CDN features aren't really needed anymore either, because of Fly's statics feature.
        - The Cloudflare config for Eardogger is now gone.
    - I always forget how DNS records work, so:
        - You have to grab the static IPv4 and IPv6 addrs that Fly assigned to your app and bring them to Hover's UI.
        - You need two each of A (for v4) and AAAA (for v6) records:
            - Hostname of `@` means the root domain (no subdomains).
            - Hostname of `*` means every subdomain — just using this to let `www.` through so that I can redirect it to root at the HTTP level in actual app code. If you try to go to any other subdomain, your browser will 🚨 about cert problems (see below).
        - The `_acme-challenge` CNAME records are for SSL certificate verification, to prove I own the domain — fly's built-in cert stuff uses that, but I think it's passing through to something that Let's Encrypt uses.
        - The MX record and the mail CNAME don't touch Fly at all and aren't meant to.
- TLS: Fly / Let's Encrypt
    - I set this up using Fly's dashboard UI for the eardogger-prod app, though I think you can do it with the fly CLI also.
    - It's two separate certs: one for the root domain, and one for www. That's because static hostname certs are cheap (10 free and 10¢/mo after that, at time of writing), but wildcard certs are $2/mo.
    - Yes, I only use the www cert to let people through so I can immediately 301 their asses back to the root domain. That has to happen inside the HTTP protocol boundary, so everything outside that has to treat www as though it's real.
    - The cert validation step uses CNAME records I set up on Hover (see above). I think there's a way to skip that part, but it can result in transitory weird glitches, so no thx.
- Monitoring: ..."uptimerobot"?
    - It pings /status, which returns a 204 no content if all's hunky-dory.
    - I originally set this up to keep the free Heroku dyno awake, since I didn't need the rest of those free monthly dyno hours and wanted to keep the site lag-free. So that's not necessary anymore.
    - But it DID properly alert me during the maintenance downtime when I was sorting out the DNS changes, so maybe leave it going.
    - Yes I am literally an ops neanderthal here, leave me alone.

### Dev Environment

Mostly the same deal as prod:

- App: fly
    - `eardogger-dev` app in Nick's personal org.
    - `fly.dev.toml`
    - https://eardogger-dev.fly.dev
    - I'm keeping it stopped unless I'm actively testing app changes. (Although it keeps its IP address allocations while down.)
    - Use `fly scale count 0 -c fly.dev.toml` to halt the app, and I guess count 1 to bring it back up the next time it's time to do some hacking.
    - I don't think the session secret is recoverable from anywhere, because why bother.
- DB: neon
    - Project: `eardogger` (same as prod)
    - DB: `eardogger_dev`
    - DB user: `nfagerlund` (Oh right, should probably change that.) Password in Nick's 1pass.
- DNS and TLS: just the default Fly-hosted stuff, didn't configure any domains other than the fly.dev one.

### Detritus

- The glitch deployment has rotted, I think; couldn't get it running properly. Oh, actually that's probably a change in the Heroku CLI method for getting the DB creds. Developing on Fly with the dev instance will be easier going forward anyhow.
- I'm not using Terraform to manage deployments or resources anymore, because there's no off-the-shelf providers that really work well with my current stack. The fly provider is too rudamentary at the moment to do everything the app toml can do.
- I'm not using Cloudflare anymore (see DNS above), and the config for the site is now removed.
- All of the Heroku resources for the site are now removed.
