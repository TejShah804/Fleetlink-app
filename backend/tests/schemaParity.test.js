// Schema parity: every place the trips schema is described must agree.
//
//   backend/schema.sql                 fresh install
//   backend/sql/02_trip_lifecycle.sql   manual migration
//   backend/src/config/db.js            automatic migration at server start
//   backend/src/models/tripModel.js     the INSERTs that write it
//
// A column present in one and missing from another means the database ends up
// with a different shape depending on how it was created — and the symptom is
// the unhelpful "Unknown column 'pickup_address' in 'field list'" that Post Trip
// used to throw. Run: node tests/schemaParity.test.js
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

let fail = 0;
const t = (n, c, extra = '') => {
  console.log((c ? 'OK  ' : 'FAIL') + '  ' + n + (c ? '' : '\n        ' + extra));
  if (!c) fail++;
};

const schemaSql = read('schema.sql');
const migrationSql = read('sql/02_trip_lifecycle.sql');
const dbJs = read('src/config/db.js');
const tripModel = read('src/models/tripModel.js');

// Columns the Post Trip form owns: required by the new form, so a database
// that predates the feature has none of them. delivery_address is included
// even though it stays nullable, because the form can write it.
const PRIVACY = ['pickup_address', 'pickup_contact_name', 'pickup_contact_phone', 'receiver_name', 'receiver_phone'];
const PRIVACY_ALL = [...PRIVACY, 'delivery_address'];
// Columns the lifecycle migration must ADD. `status` is deliberately absent: it
// predates the feature and the migration only widens its ENUM, which the
// "lifecycle statuses" section below checks.
const LIFECYCLE_ONLY = new Set([
  ...PRIVACY_ALL,
  'assigned_driver_id', 'pickup_otp', 'delivery_otp', 'otp_attempts',
  'confirm_by', 'delivered_at', 'delivery_proof_url', 'payment_status'
]);

/** Strip `--` line comments. They quote SQL in prose, which pollutes every scan. */
const stripSqlComments = (sql) => sql.replace(/--[^\n]*/g, '');
const migrationCode = stripSqlComments(migrationSql);
const schemaCode = stripSqlComments(schemaSql);

/** Column names added by ALTER TABLE ... ADD COLUMN. */
const addedColumns = (sql) =>
  [...new Set([...sql.matchAll(/ADD\s+COLUMN\s+`?(\w+)`?/gi)].map((m) => m[1]))];

/** Table names created by CREATE TABLE. */
const createdTables = (sql) =>
  [...new Set([...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/gi)].map((m) => m[1]))];

/**
 * Members of a MySQL ENUM. `column` is matched on a word boundary so that
 * asking for `status` does not match `payment_status`.
 */
function enumMembers(sql, column) {
  const re = new RegExp('(^|[^\\w_])' + column + '`?\\s+ENUM\\s*\\(([^)]*)\\)', 'i');
  const m = re.exec(sql);
  if (!m) return [];
  return m[2].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

/** Every column name declared inside a CREATE TABLE block, keyed by table. */
function tableColumns(sql, table) {
  const start = new RegExp('CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?`?' + table + '`?\\s*\\(', 'i')
    .exec(sql);
  if (!start) return [];
  // Walk forward balancing parens to find the end of the column-definition list
  let depth = 0;
  let end = -1;
  for (let i = start.index + start[0].length - 1; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return [];
  const body = sql.slice(start.index + start[0].length, end);
  // A column line is `name TYPE ...`; skip CONSTRAINT/INDEX/PRIMARY/FOREIGN/CHECK
  return body
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter((line) =>
      line &&
      !/^(CONSTRAINT|INDEX|KEY|UNIQUE|PRIMARY|FOREIGN|CHECK)\b/i.test(line) &&
      /^\w+\s+(INT|TINYINT|BIGINT|VARCHAR|CHAR|TEXT|DATE|TIME|DATETIME|TIMESTAMP|ENUM|BOOLEAN|DECIMAL|DOUBLE|FLOAT)/i.test(line)
    )
    .map((line) => line.split(/\s+/)[0].replace(/`/g, ''));
}

// ── Gather what each definition declares ───────────────────────────────────
const migrationCols = addedColumns(migrationCode);
const migrationTables = createdTables(migrationCode);

// db.js declares them in the LIFECYCLE_COLUMNS array; scope the scan to that
// block so the India-localisation columns in the same file are not counted
const lifecycleBlock = /const LIFECYCLE_COLUMNS = \[([\s\S]*?)\n\];/.exec(dbJs);
const jsCols = lifecycleBlock
  ? [...new Set([...lifecycleBlock[1].matchAll(/\['(\w+)',\s*['"]/g)].map((m) => m[1]))]
  : [];
const jsTables = [...new Set([...dbJs.matchAll(/CREATE TABLE (\w+)/g)].map((m) => m[1]))];

const freshTripsCols = new Set(tableColumns(schemaCode, 'trips'));
const sqlTripsCols = new Set(tableColumns(migrationCode, 'trips'));

console.log('the migration adds ' + migrationCols.length + ' columns and ' + migrationTables.length + ' tables');
console.log('');

console.log('-- the automatic migration must cover every column the SQL file adds --');
t('LIFECYCLE_COLUMNS is defined in db.js', Boolean(lifecycleBlock));
t('both list the same number of columns', migrationCols.length === jsCols.length,
  'sql: ' + migrationCols.length + '  js: ' + jsCols.length);
const missingInJs = migrationCols.filter((c) => !jsCols.includes(c));
t('no column is in the SQL file but missing from startup',
  missingInJs.length === 0, 'missing: ' + missingInJs.join(', '));
const extraInJs = jsCols.filter((c) => !migrationCols.includes(c));
t('no column is added at startup that the SQL file lacks',
  extraInJs.length === 0, 'extra: ' + extraInJs.join(', '));

console.log('');
console.log('-- the automatic migration must create every table the SQL file creates --');
const missingTables = migrationTables.filter((tb) => !jsTables.includes(tb));
t('no table is in the SQL file but missing from startup',
  missingTables.length === 0, 'missing: ' + missingTables.join(', '));
for (const tb of ['trip_updates', 'notifications', 'ratings']) {
  t('startup creates ' + tb, jsTables.includes(tb));
  t('the SQL file creates ' + tb, migrationTables.includes(tb));
  t('schema.sql creates ' + tb, createdTables(schemaCode).includes(tb));
}

console.log('');
console.log('-- the columns the INSERTs write must exist everywhere --');
// Every column named in any INSERT INTO trips (...) list in the model
const insertCols = [...new Set(
  [...tripModel.matchAll(/INSERT INTO trips \(([\s\S]*?)\)/gi)]
    .flatMap((m) => m[1].split(','))
    .map((s) => s.trim().replace(/`/g, ''))
    .filter((s) => /^\w+$/.test(s))
)];
console.log('   createTrip writes ' + insertCols.length + ' columns');
t('schema.sql has every column the INSERTs write',
  insertCols.filter((c) => !freshTripsCols.has(c)).length === 0,
  'missing: ' + insertCols.filter((c) => !freshTripsCols.has(c)).join(', '));

// A pre-lifecycle database is schema.sql minus what the migration adds. The
// INSERT has to be writable against either, so every column the INSERT uses
// must be either already in the base table or added by the migration.
const migratedByJs = new Set(jsCols);
const notCovered = insertCols.filter(
  (c) => !migratedByJs.has(c) && !sqlTripsCols.has(c)
);
// The only legitimate un-migrated columns are ones that predate the feature
// (operator id, cities, price, schedule) — never a privacy or OTP column.
t('no column the INSERT needs is left un-migrated by both paths',
  notCovered.filter((c) => LIFECYCLE_ONLY.has(c)).length === 0,
  'uncovered: ' + notCovered.filter((c) => LIFECYCLE_ONLY.has(c)).join(', '));
console.log('   ' + notCovered.length + ' INSERT columns predate the feature (' + notCovered.slice(0, 4).join(', ') + ', ...)');
console.log('   ' + (insertCols.length - notCovered.length) + ' come from the lifecycle migration');

console.log('');
console.log('-- the privacy columns must exist and be NOT NULL after migration --');
for (const c of PRIVACY) {
  t(c + ' is created by the migration', migrationCols.includes(c));
  t(c + ' is tightened to NOT NULL at startup',
    new RegExp('MODIFY COLUMN ' + c + '\\s+VARCHAR?[^\\n]*NOT NULL|MODIFY COLUMN ' + c + '\\s+TEXT\\s+NOT NULL').test(dbJs));
}
// delivery_address must stay nullable — the driver is told to call instead
const deliveryDef = /MODIFY COLUMN delivery_address|TEXT NULL/.exec(dbJs);
t('delivery_address stays nullable', !/MODIFY COLUMN delivery_address[^;]*NOT NULL/.test(dbJs));
t('schema.sql leaves delivery_address nullable', /delivery_address TEXT NULL/.test(schemaCode));

console.log('');
console.log('-- the lifecycle statuses must be identical everywhere --');
const expected = ['open', 'assigned', 'confirmed', 'in_transit', 'delivered', 'completed', 'cancelled'];
const sqlEnum = enumMembers(migrationCode, 'status');
const jsEnumBlock = /const STATUS_ENUM\s*=\s*([\s\S]*?);/.exec(dbJs);
const jsEnum = jsEnumBlock ? [...jsEnumBlock[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : [];
const freshEnum = enumMembers(schemaCode, 'status');

console.log('   sql/02  : ' + sqlEnum.join(', '));
console.log('   db.js   : ' + jsEnum.join(', '));
console.log('   schema  : ' + freshEnum.join(', '));
t('the SQL file declares all 7 lifecycle statuses', sqlEnum.join(',') === expected.join(','), 'got ' + sqlEnum.join(','));
t('the startup migration declares the same 7 in the same order', jsEnum.join(',') === expected.join(','), 'got ' + jsEnum.join(','));
t('schema.sql declares the same 7 in the same order', freshEnum.join(',') === expected.join(','), 'got ' + freshEnum.join(','));
t('payment_status is not mistaken for status', !enumMembers(schemaCode, 'status').includes('paid'));

console.log('');
console.log('-- the legacy status is remapped, not silently dropped --');
t('the SQL file remaps in_progress -> in_transit', /SET `?status`?\s*=\s*'in_transit'\s+WHERE `?status`?\s*=\s*'in_progress'/.test(migrationCode));
t('the startup migration remaps in_progress -> in_transit', /SET status = 'in_transit' WHERE status = 'in_progress'/.test(dbJs));

console.log('');
console.log('-- the trip status is widened to VARCHAR before the remap --');
// An ENUM cannot take a value it does not contain, so the column must be
// VARCHAR at the moment the remap runs or MySQL truncates it to ''.
t('the SQL file widens status before remapping',
  /MODIFY COLUMN `?status`?\s+VARCHAR\(20\)/.test(migrationCode) &&
  migrationCode.indexOf('VARCHAR(20)') < migrationCode.indexOf("'in_transit'"));
t('the startup migration widens status before remapping',
  /MODIFY COLUMN status VARCHAR\(20\)/.test(dbJs) &&
  dbJs.indexOf('VARCHAR(20)') < dbJs.indexOf("SET status = 'in_transit'"));

console.log('');
console.log('-- ratings are once-per-trip at the database level --');
t('the SQL file has UNIQUE(trip_id) on ratings', /CONSTRAINT `?uq_ratings_trip`? UNIQUE \(`?trip_id`?\)/.test(migrationCode));
t('the startup migration has UNIQUE(trip_id) on ratings', /uq_ratings_trip UNIQUE \(trip_id\)/.test(dbJs));
t('the startup migration has the 1-5 CHECK', /chk_ratings_stars CHECK \(stars BETWEEN 1 AND 5\)/.test(dbJs));

console.log('');
console.log('-- deleting a driver must not delete live trips --');
t('the FK is ON DELETE SET NULL in the SQL file', /fk_trips_assigned_driver[\s\S]{0,160}?ON DELETE SET NULL/.test(migrationCode));
t('the FK is ON DELETE SET NULL at startup', /fk_trips_assigned_driver[\s\S]{0,200}?ON DELETE SET NULL/.test(dbJs));

console.log('');
console.log(fail ? fail + ' FAILURE(S) — the schema definitions have drifted' : 'schema.sql, 02_trip_lifecycle.sql, the startup migration and the model all agree.');
process.exitCode = fail ? 1 : 0;
