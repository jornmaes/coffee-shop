// Shared helper: loads the game's logic files (no browser needed).
// The files are joined into ONE function, so their globals become fast local
// variables (a vm sandbox made every global lookup slow). Every top-level
// function / var is exported through a getter, so reassigned vars
// (like solidRects) are always read fresh.
var fs = require('fs'), path = require('path');
module.exports = function (dir, extra) {
  dir = dir || path.join(__dirname, '..'); // default: the project folder
  extra = extra || {};
  var files = ['config.js', 'world.js', 'path.js', 'customers.js', 'save.js'];
  var src = files.map(function (f) { return fs.readFileSync(path.join(dir, f), 'utf8'); }).join('\n;\n');
  var names = {};
  src.replace(/^(?:function\s+(\w+)|var\s+(\w+))/gm, function (m, a, b) { names[a || b] = 1; return m; });
  var exportsSrc = 'return {' + Object.keys(names).map(function (n) {
    return 'get ' + n + '() { return ' + n + '; }';
  }).join(',\n') + '};';
  var fn = new Function('Math', 'localStorage', 'console', src + '\n' + exportsSrc);
  return fn(extra.Math || Math, extra.localStorage, { warn: function () {}, log: console.log });
};
