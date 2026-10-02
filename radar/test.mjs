// Unit checks for the deterministic parts (run: node --no-warnings test.mjs)
import assert from 'node:assert/strict';
process.env.DATA_DIR = '/tmp/radar-test';
const { locationGate, prefilter, DEFAULT_PROFILE } = await import('./engine.js');
const g = (location, description = '', title = '') => locationGate({ location, description, title });
assert.ok(g('Remote (HN)', 'Sudowrite | √ REMOTE (US) | Full-Time'));
assert.ok(g('Remote (HN)', 'ONSITE NYC or REMOTE (US/Can) | $130-240K'));
assert.ok(g('USA Only', '', ''));            // field "USA Only"
assert.ok(g('', 'Applicants must be based in the UK.'));
assert.ok(g('Berlin', 'Onsite in Berlin, German required'));
assert.equal(g('Worldwide', 'Remote anywhere'), null);
assert.equal(g('Remote (HN)', 'REMOTE (US or APAC timezones welcome)'), null);
assert.equal(g('Remote', 'Fully remote, we hire globally'), null);
assert.equal(g('Jakarta, Indonesia', 'Hybrid'), null);
assert.equal(g('Remote', 'Backend role, Node.js'), null);   // unknown -> left to the AI
assert.equal(prefilter({ title: 'Senior Flutter Developer', tags: '', description: '' }, DEFAULT_PROFILE), true);
assert.equal(prefilter({ title: 'Account Executive', tags: 'sales', description: 'quota' }, DEFAULT_PROFILE), false);
console.log('radar unit checks: all passed');
