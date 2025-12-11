# ryemall
The Catcher in the Rye（麦田里的守望者）

## 自动随机提交脚本
- 入口位于仓库根目录 `auto_commits.js`，使用 Node.js 运行。
- 输入灵活：
	- `node auto_commits.js 2024` 生成整年记录。
	- `node auto_commits.js 2024-10` 仅生成当月。
	- `node auto_commits.js 2024-10-07` 精确到某一天。
- 提交日筛选：第二个参数可自定义保留的星期，使用数字 1-7 代表周一到周日（可含空格/逗号）。例如 `node auto_commits.js 2024 1234567` 包含周末，默认值为 `12345`（工作日）。
- 每个有效日期会随机生成 1-15 次提交，自动跳过未列入的星期。
- 运行前请确保工作区干净（`git status` 无未提交内容），否则脚本会终止。
- 执行方式：`node auto_commits.js <日期> [星期配置]`（支持 `YYYY` / `YYYY-MM` / `YYYY-MM-DD` 以及 `YYYY/MM`、`YYYY.MM` 等分隔形式）。
- 每次提交会追加内容到 `commit.md` 并通过 `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` 模拟历史记录。
