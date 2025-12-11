#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIN_COMMITS = 1;
const MAX_COMMITS = 6;
const WORK_START_MINUTE = 9 * 60; // 09:00 local time
const WORK_END_MINUTE = 18 * 60; // 18:00 local time
const COMMIT_FILE = path.resolve(__dirname, 'commit.md');
const DAY_MS = 86400000;
const MONTH_ARG_PATTERN = /^(\d{4})[-/.](\d{1,2})$/;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const parseTargetMonth = () => {
  const [, , input] = process.argv;
  if (!input) {
    throw new Error('Please provide a month argument, e.g. "node auto_commits.js 2024-10".');
  }

  const match = input.match(MONTH_ARG_PATTERN);
  if (!match) {
    throw new Error('Month argument must follow YYYY-MM (or YYYY/MM, YYYY.MM) format.');
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;

  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error('Month value must be between 1 and 12.');
  }

  const startDate = new Date(Date.UTC(year, monthIndex, 1));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  return {
    startDate,
    endDate,
    label: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
  };
};

const getWorkdays = (startDate, endDate) => {
  const days = [];
  for (let current = new Date(startDate); current <= endDate; current = new Date(current.getTime() + DAY_MS)) {
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
  const monthInfo = parseTargetMonth();
  const days = getWorkdays(monthInfo.startDate, monthInfo.endDate);

  if (!days.length) {
    console.log(`No weekday found in ${monthInfo.label}. Nothing to do.`);
    return;
  }

  console.log(`Generating commits for ${monthInfo.label}: ${days.length} workdays...`);

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
