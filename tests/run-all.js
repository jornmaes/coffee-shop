// Runs every logic test (no browser needed):  node tests/run-all.js
// Each test is a separate Node process, so one crash can't hide the others.
// They all run at the same time (the bot plays ~10 hours of game time per
// seed, which takes a few minutes), and the results print in order.
var spawn = require('child_process').spawn;
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

var started = Date.now();
var results = new Array(runs.length);
var finished = 0;

runs.forEach(function (args, i) {
  var file = path.join(__dirname, args[0]);
  var extra = args.length > 1 ? args.slice(1) : [root];
  var child = spawn(process.execPath, [file].concat(extra));
  var out = '';
  child.stdout.on('data', function (d) { out += d; });
  child.stderr.on('data', function (d) { out += d; });
  child.on('close', function (code) {
    results[i] = { args: args, out: out, code: code, seconds: (Date.now() - started) / 1000 };
    finished++;
    if (finished === runs.length) report();
  });
});

// Print every test's output (without the PASS lines) and a summary.
function report() {
  var failed = 0;
  results.forEach(function (r) {
    console.log('== ' + r.args.join(' '));
    var lines = r.out.split('\n').filter(function (l) { return l && l.indexOf('PASS ') !== 0; });
    if (lines.length) console.log(lines.join('\n'));
    console.log('   ' + (r.code === 0 ? 'ok' : 'FAILED') + ' (' + r.seconds.toFixed(1) + 's)');
    if (r.code !== 0) failed++;
  });
  console.log(failed ? failed + ' test file(s) FAILED' : 'All tests passed');
  process.exit(failed ? 1 : 0);
}
