#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const START_DATE = new Date(Date.UTC(2024, 9, 7));
const END_DATE = new Date(Date.UTC(2024, 9, 11));
const MIN_COMMITS = 1;
const MAX_COMMITS = 6;
const WORK_START_MINUTE = 9 * 60; // 09:00 local time
const WORK_END_MINUTE = 18 * 60; // 18:00 local time
const COMMIT_FILE = path.resolve(__dirname, 'commit.md');

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const getWorkdays = () => {
  const days = [];
  for (let current = new Date(START_DATE); current <= END_DATE; current = new Date(current.getTime() + 86400000)) {
    const day = current.getUTCDay();
    if (day === 0 || day === 6) continue;
    days.push(new Date(current));
  }
  return days;
};

const pickTimestamp = (day) => {
  const date = new Date(day);
  const minutes = randomInt(WORK_START_MINUTE, WORK_END_MINUTE);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCMinutes(minutes);
  date.setUTCSeconds(randomInt(0, 59));
  return date;
};

const run = (command, env = process.env) => execSync(command, { stdio: 'inherit', env });

const ensureCleanTree = () => {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    throw new Error('Git working tree must be clean before running this script.');
  }
};

const appendLog = (timestamp, countLabel) => {
  const entry = [timestamp.toISOString(), `随机数:${randomInt(10000, 99999)}`, `提交次数:${countLabel}`, ''].join('\n');
  fs.appendFileSync(COMMIT_FILE, entry, 'utf8');
};

const main = () => {
  ensureCleanTree();
  const days = getWorkdays();
  console.log(`Generating commits for ${days.length} workdays...`);

  days.forEach((day) => {
    const commitTotal = randomInt(MIN_COMMITS, MAX_COMMITS);
    const dayLabel = day.toISOString().slice(0, 10);
    console.log(`\n${dayLabel}: ${commitTotal} commits`);

    for (let index = 1; index <= commitTotal; index += 1) {
      const timestamp = pickTimestamp(day);
      appendLog(timestamp, `${dayLabel}#${index}`);
      run('git add commit.md');
      const env = {
        ...process.env,
        GIT_AUTHOR_DATE: timestamp.toISOString(),
        GIT_COMMITTER_DATE: timestamp.toISOString(),
      };
      run(`git commit -m "auto commit ${dayLabel} #${index}"`, env);
    }
  });

  console.log('\nDone.');
};

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
