// Runs every logic test (no browser needed):  node tests/run-all.js
// Each test is a separate Node process, so one crash can't hide the others.
// The flow test (a bot playing the whole game) runs on a few seeds.
var spawnSync = require('child_process').spawnSync;
var path = require('path');

var root = path.join(__dirname, '..');
var runs = [
  ['test-collision.js'],
  ['test-layout.js'],
  ['test-save.js'],
  ['test-flow.js', root, '1', 'quiet'],
  ['test-flow.js', root, '7', 'quiet'],
  ['test-flow.js', root, '42'],
];

var failed = 0;
runs.forEach(function (args) {
  var file = path.join(__dirname, args[0]);
  var extra = args.length > 1 ? args.slice(1) : [root];
  console.log('== ' + args.join(' '));
  var started = Date.now();
  var r = spawnSync(process.execPath, [file].concat(extra), { encoding: 'utf8' });
  // only show passing lines from the collision test's verbose output when it fails
  var out = (r.stdout || '') + (r.stderr || '');
  var lines = out.split('\n').filter(function (l) { return l && l.indexOf('PASS ') !== 0; });
  if (lines.length) console.log(lines.join('\n'));
  console.log('   ' + (r.status === 0 ? 'ok' : 'FAILED') + ' (' + ((Date.now() - started) / 1000).toFixed(1) + 's)');
  if (r.status !== 0) failed++;
});

console.log(failed ? failed + ' test file(s) FAILED' : 'All tests passed');
process.exit(failed ? 1 : 0);
