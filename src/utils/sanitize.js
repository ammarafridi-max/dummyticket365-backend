const sanitizeHtml = require('sanitize-html');

const richTextFields = ['content', 'body', 'description'];
const richTextRoutes = ['/api/blogs', '/api/articles', '/api/posts'];

const skipFields = ['password', 'passwordCurrent', 'passwordConfirm'];

const richTextOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'em',
    'u',
    's',
    'b',
    'i',
    'a',
    'img',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'div',
    'span',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    table: ['border', 'cellpadding', 'cellspacing'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    '*': ['class', 'id', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
};

const strictOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

module.exports = (req, res, next) => {
  if (req.originalUrl.startsWith('/api/webhook')) {
    return next();
  }

  if (Buffer.isBuffer(req.body)) {
    return next();
  }

  const isRichTextRoute = richTextRoutes.some((route) => req.originalUrl.startsWith(route));

  if (!req.body) return next();

  for (const key of Object.keys(req.body)) {
    const value = req.body[key];

    if (typeof value !== 'string') continue;
    if (skipFields.includes(key)) continue;

    req.body[key] =
      isRichTextRoute && richTextFields.includes(key)
        ? sanitizeHtml(value, richTextOptions)
        : sanitizeHtml(value, strictOptions);
  }

  next();
};
