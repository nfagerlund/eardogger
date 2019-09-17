# Eardogger prototype

This is a movable bookmarks service, for reading serialized content on the web.

## Concepts

Bookmarks are like wood-space bookmarks, not browser bookmarks. That is: they're independent of their URL, and their URL changes over their lifespan.

Bookmarks are identified by a URL prefix. Think of the prefix as identifying "this book." If a URL matches that prefix, then it's in _this book,_ and the bookmark can be moved to that spot. If not, then it's in a different book, which has a different bookmark in it (or no bookmark).

If a URL matches multiple bookmarks' prefixes, they'll both get moved to that location on update. This is semi-intentional, because I can sorta see a use for it.

## v1 API

All API calls require a session cookie for auth, because they're meant to be called by bookmarklets or browser extensions or the UI.

### Shared Status Codes

All methods return 401 with empty body if there's no session cookie. Can't do anything with your bookmarks if I don't know who you are.

### Bookmark Objects

A few endpoints can return bookmark objects, which look like this:

```javascript
{
  "prefix": "string", // without protocol
  "current": "URL",
  "display_name": "display name", // optional
  "updated": "last update time", // whatever JSON.serialize does with Date objects. "2019-09-17T16:14:40.999Z".
  "id": "opaque ID" // maybe
}
```

### POST /v1/create

Make a new bookmark at the specified prefix. If one already exists, update it.

Body:

```javascript
{
  "prefix": "http://example.com/comic",
  "current": "http://example.com/comic/24"
}
```

Body parameters:

Name | Type | Desc
-|-|-
prefix | string | The URL prefix that identifies this bookmark. Protocol is optional, and gets stripped during creation. Prefix matching against URLs always ignores protocol.
current | URL | (optional) A full URL to the bookmark's current position. If omitted, defaults to the provided prefix (before the protocol gets stripped).

Returns:

Outcome | Response
-|-
Success | 201, empty body.
Syntax error, API version decommissioned, etc. | 400, optional JSON object with `{error: "error name", help: "HTML explanation"}`


### POST /v1/update

Find all bookmarks that match the provided URL and update their current positions.

This is the fire-and-forget version; there's also a UI method to update a bookmark, which falls back to offering a new-bookmark form if the bookmark doesn't exist.

Body:

```javascript
{
  "current": "http://example.com/comic/24"
}
```

Body parameters:

Name | Type | Desc
-|-|-
current | URL | Full URL to the bookmark's new position.

Returns:

Outcome | Response
-|-
Success | 200, empty body
Can't find bookmark | 404, JSON object with `{error: "no matching bookmark"}`
Syntax error, API version decommissioned, etc. | 400, JSON object with `{error: "error name", help: "optional HTML explanation"}`

### GET /v1/current/:url

(The informational version.)

Get the current position of the most specific bookmark that matches the provided URL. Returns JSON.

URL parameters:

Name | Description
-|-
:url | The URL-encoded URL (yo dawg) to retrieve a bookmark for.

Returns:

Outcome | Response
-|-
Success | 200, JSON bookmark object
Can't find bookmark | 404, JSON object with `{error: "no matching bookmark"}`
Syntax error, API version decommissioned, etc. | 400, JSON object with `{error: "error name", help: "optional HTML explanation"}`

### GET /v1/list

List all bookmarks.

This one ain't long for this world, bc I'll need pagination at some point. If the user is beyond the pagination limit, it'll just 400 and you'll need to upgrade to v2 api. Oh, v2 will also want to be able to query by update time, for cheaper refreshes in the extension/app. Hmm, should it list deletions as well? How would I do that?

No parameters.

Returns:

```javascript
[
  { bookmark_object }, // see above for format
  // ...
]
```

Actually, this'll need to return a lot more info, but that's not implemented yet so I don't know the property/column names.

### GET /v1/bookmark/:id

Returns a bookmark object for that ID, if it exists and belongs to the user. Otherwise returns a 404.

I don't expect to actually use this.

### DELETE /v1/bookmark/:id

Deletes a bookmark object for that ID, if it exists and belongs to the user, and returns 204 "no content". Otherwise returns a 404.

### GET /v1/account

Return info about the logged-in user. Will be used by the browser extension or app, I guess.

IDK what this needs to return yet. Probably just `{username: "name"}`.

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

### /login

- If logged out:
    - display info
    - display login form
    - display signup form
- If logged in:
    - say so, and show big logout button in content space.

### /

- If logged out:
    - Display info
    - display login form
    - display signup form
- If logged in:
    - Display list of bookmarks
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

### /mark/:url

Update any matching bookmarks for :url, then redirect back to :url.

If there aren't any matching bookmarks, offer to create a new bookmark and ask for a prefix to use. Then redirect back to :url.

URL parameters:

Name | Description
-|-
:url | URL-encoded URL (yo dawg) of the URL you want to bookmark.

- If it found and updated existing bookmarks:
    - Display "Bookmarks updated" page w/ 3-sec countdown; 302 to :url after countdown.
- If no bookmarks matched:
    - Display create bookmark form
        - Only offer prefix; display :url but leave it hardcoded.
        - On success: display "Bookmark created" page w/ 3-sec countdown; 302 to :url after countdown.
- If no session: login form, which redirects to self on success.

### /resume/:url

Immediately redirect to the current position of the most specific bookmark that matches :url.

If there aren't any matching bookmarks, offer a choice between creating a new bookmark or just returning to where you were.

URL parameters:

Name | Description
-|-
:url | The URL-encoded URL (yo dawg) to retrieve a bookmark for.

Returns:

Outcome | Response
-|-
Success | 302 "found" redirect to current location of bookmark.
Can't find bookmark |

