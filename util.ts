import fs from 'fs';
import path from 'path';

// Everything should be running from dist due to tsc compilation, so nothing
// outside this file should rely directly on path.resolve() or __dirname.
const projectRoot = path.resolve(__dirname, '..');

export {
  readTextFilePromise,
  bookmarkletText,
  projectRoot,
  resolveFromProjectRoot,
  normalizeIntParam,
}

function resolveFromProjectRoot(filePath: string) {
  return path.resolve(projectRoot, filePath);
}

function readTextFilePromise(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// This bookmarklet munger is a port of the Daring Fireball one, and it's pretty
// naïve. For example, it doesn't understand the syntax of comments enough to
// catch comments at the end of a line of code, so you need to make sure your
// bookmarklet JS only puts comments on their own lines. Also you need
// semicolons always. But that's fine; underthink before u overthink.
const commentedLines = /^\s*\/\/.+\n/gm;
const blockComments = /^\s*\/\*.+?\*\/\n?/gm;
// skipping the tabs to spaces thing, just don't be a tab doofus.
const spaceRuns = / {2,}/gm;
const leadingSpace = /^\s+/gm;
const trailingSpaceAndNewlines = /\s*\n/gm;
const tokenPlaceHolder = /<TOKEN>/gm;

// This doesn't handle html escaping, just URI escaping.
async function bookmarkletText(bookmarkletName: string, token = '') {
  let text = await readTextFilePromise(
    resolveFromProjectRoot(`bookmarklets/${bookmarkletName}.js`)
  );
  text = text
    .replace(commentedLines, '')
    .replace(blockComments, '')
    .replace(spaceRuns, ' ')
    .replace(leadingSpace, '')
    .replace(trailingSpaceAndNewlines, '')
    .replace(tokenPlaceHolder, token);
  if (process.env.SITE_HOSTNAME) {
    text = text.replace(/eardogger\.com/g, process.env.SITE_HOSTNAME);
  }
  return 'javascript:' + encodeURI(text);
}

// Express query params can be a variety of oddball classes, so this helper
// resolves them to a plain `number | undefined`.
function normalizeIntParam(queryParam: any): number | undefined {
  if (typeof queryParam === 'string') {
    return parseInt(queryParam) || 1;
  } else {
    return undefined;
  }
}
