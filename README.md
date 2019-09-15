# Eardogger prototype

This is a movable bookmarks service, for reading serialized content on the web.

## Concepts

Bookmarks are like wood-space bookmarks, not browser bookmarks. That is: they're independent of their URL, and their URL changes over their lifespan.

Bookmarks are identified by a URL prefix. Think of the prefix as identifying "this book." If a URL matches that prefix, then it's in _this book,_ and the bookmark can be moved to that spot. If not, then it's in a different book, which has a different bookmark in it (or no bookmark).

If a URL matches multiple bookmarks' prefixes, they'll both get moved to that location on update. This is semi-intentional, because I can sorta see a use for it.

## API

All API calls require a session cookie for auth, because they're meant to be called by bookmarklets or browser extensions or the UI.

### Global return codes

- All methods return 401 with empty body if there's no session cookie. Can't do anything with your bookmarks if I don't know who you are.

### POST /v1/create

Make a new bookmark at the specified prefix. If one already exists, replace it.

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
Can't find bookmark | 404, empty body
Syntax error, API version decommissioned, etc. | 400, optional JSON object with `{error: "error name", help: "HTML explanation"}`

### GET /v1/list

List all bookmarks.

This one ain't long for this world, bc I'll need pagination at some point. If the user is beyond the pagination limit, it'll just 400 and you'll need to upgrade to v2.

No parameters.

Returns:

```javascript
[
  { "current": "http://example.com/comic/24" },
  # ...
]
```

Actually, this'll need to return a lot more info, but that's not implemented yet so I don't know the property/column names.

## UI

### /

- If logged out:
    - Display info and login form
- If logged in:
    - Display list of bookmarks
    - Display logout button
    - Display bookmarklet install instructions
- Link to:
    - /about

### /about

- Summary
- FAQ
- Things u could read

### /mark/:url

Update any matching bookmarks for :url, then redirect back to :url.

If there aren't any matching bookmarks, offer to create a new bookmark and ask for a prefix to use.

URL parameters:

Name | Description
-|-
:url | URL-encoded URL (yo dawg) of the URL you want to bookmark.

- If it found and updated existing bookmarks:
    - Display "Bookmarks updated" page w/ 3-sec countdown; redirect to :url after countdown.
- If no bookmarks matched:
    - Display create bookmark form
        - Only offer prefix; display :url but leave it hardcoded.
        - On success: display "Bookmark created" page w/ 3-sec countdown; redirect to :url after countdown.
- If no session: login form, which redirects to self on success.

