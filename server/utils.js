// server/utils.js
async function generateId(length = 8) {
  const { nanoid } = await import('nanoid');
  return nanoid(length);
}

function sanitize(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { generateId, sanitize };