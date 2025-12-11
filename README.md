# ryemall
The Catcher in the Rye（麦田里的守望者）

## 自动随机提交脚本
- 入口位于仓库根目录 `auto_commits.js`，使用 Node.js 运行。
- 支持任意月份：脚本会针对指定月份的每个工作日（周一至周五）随机生成 1-6 次提交，自动跳过周末。
- 运行前请确保工作区干净（`git status` 无未提交内容），否则脚本会终止。
- 执行方式：`node auto_commits.js 2024-10`（支持 `YYYY-MM`/`YYYY/MM`/`YYYY.MM` 格式）。
- 每次提交会追加内容到 `commit.md` 并通过 `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` 模拟历史记录。
