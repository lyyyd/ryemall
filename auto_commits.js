#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIN_COMMITS = 1;
const MAX_COMMITS = 6;
const DEFAULT_SKIP_PROB = 0.4; // 默认概率为0（不跳过）
const WORK_START_MINUTE = 9 * 60; // 09:00 local time
const WORK_END_MINUTE = 18 * 60; // 18:00 local time
const COMMIT_FILE = path.resolve(__dirname, 'commit.md');
const DAY_MS = 86400000;
const YEAR_PATTERN = /^(\d{4})$/;
const MONTH_PATTERN = /^(\d{4})[-/.](\d{1,2})$/;
const DAY_PATTERN = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
const WEEKDAY_ALLOWED_PATTERN = /^[\s,1-7]+$/;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function parseWeekdaySelection(rawInput) {
  if (!rawInput) {
    return new Set([1, 2, 3, 4, 5]);
  }

  if (!WEEKDAY_ALLOWED_PATTERN.test(rawInput)) {
    throw new Error('Weekday argument only accepts digits 1-7 separated by commas or spaces.');
  }

  const digits = rawInput.replace(/[^1-7]/g, '');
  if (!digits) {
    throw new Error('Weekday argument must include at least one digit between 1 and 7.');
  }

  return new Set([...digits].map((char) => Number(char)));
}

function parseArgs() {
  const [, , targetInput, weekdayInput, skipProbInput] = process.argv;
  if (!targetInput) {
    throw new Error('Please provide a target date, e.g. "2024", "2024-10" or "2024-10-15".');
  }

  let startDate;
  let endDate;
  let label;

  if (DAY_PATTERN.test(targetInput)) {
    const [, yearStr, monthStr, dayStr] = targetInput.match(DAY_PATTERN);
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const day = Number(dayStr);
    startDate = new Date(Date.UTC(year, monthIndex, day));
    endDate = new Date(Date.UTC(year, monthIndex, day, 23, 59, 59, 999));
    label = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } else if (MONTH_PATTERN.test(targetInput)) {
    const [, yearStr, monthStr] = targetInput.match(MONTH_PATTERN);
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      throw new Error('Month value must be between 1 and 12.');
    }
    startDate = new Date(Date.UTC(year, monthIndex, 1));
    endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    label = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  } else if (YEAR_PATTERN.test(targetInput)) {
    const year = Number(targetInput);
    startDate = new Date(Date.UTC(year, 0, 1));
    endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    label = `${year}`;
  } else {
    throw new Error('Target argument must follow YYYY / YYYY-MM / YYYY-MM-DD format.');
  }

  const weekdays = parseWeekdaySelection(weekdayInput);

  let skipProb = DEFAULT_SKIP_PROB;
  if (skipProbInput !== undefined) {
    const prob = Number(skipProbInput);
    if (isNaN(prob) || prob < 0 || prob > 1) {
      throw new Error('概率参数必须为0~1之间的小数，例如0.3表示30%概率跳过当天。');
    }
    skipProb = prob;
  }

  return { startDate, endDate, label, weekdays, skipProb };
}

const weekdayFromUtcDay = (utcDay) => (utcDay === 0 ? 7 : utcDay);

const getTargetDays = (startDate, endDate, weekdayFilter) => {
  const days = [];
  for (let current = new Date(startDate); current <= endDate; current = new Date(current.getTime() + DAY_MS)) {
    const weekdayId = weekdayFromUtcDay(current.getUTCDay());
    if (!weekdayFilter.has(weekdayId)) continue;
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
  const target = parseArgs();
  const days = getTargetDays(target.startDate, target.endDate, target.weekdays);

  if (!days.length) {
    console.log(`No matching weekday found in ${target.label}. Nothing to do.`);
    return;
  }

  const weekdayList = [...target.weekdays].sort((a, b) => a - b).join(',');
  console.log(`Generating commits for ${target.label}: ${days.length} days (weekdays ${weekdayList})...`);

  days.forEach((day) => {
    // 概率性跳过当天
    if (target.skipProb > 0 && Math.random() < target.skipProb) {
      const dayLabel = day.toISOString().slice(0, 10);
      console.log(`\n${dayLabel}: skipped (概率跳过)`);
      return;
    }
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
