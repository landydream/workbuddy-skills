# WorkBuddy Skills

本仓库用于集中管理、版本控制与共享 WorkBuddy 技能（Skill）。

## 目录结构

每个技能是一个独立文件夹，必须包含 `SKILL.md`（YAML frontmatter + Markdown 说明），可选 `scripts/`、`references/`、`assets/` 资源目录：

```
workbuddy-skills/
├── README.md
├── example-skill/          # 技能 1（示例模板）
│   ├── SKILL.md
│   ├── scripts/
│   ├── references/
│   └── assets/
└── <skill-name>/           # 技能 2、3……
```

## 已有技能

| 技能名 | 说明 | 触发场景 |
|--------|------|----------|
| example-skill | 示例模板，展示标准结构，可删除 | - |

## 安装方式

克隆仓库后，把需要的技能文件夹复制到本机技能目录：

```bash
git clone <本仓库地址>
cp -r <技能名> ~/.workbuddy/skills/          # macOS / Linux
cp -r <技能名> C:/Users/<用户名>/.workbuddy/skills/   # Windows
```

- **用户级**：复制到 `~/.workbuddy/skills/`（macOS/Linux）或 `C:\Users\<用户名>\.workbuddy\skills\`（Windows），所有项目可用。
- **项目级**：复制到项目根目录 `.workbuddy/skills/`，仅该项目可用（也可直接放在项目的 git 仓库里随代码分发）。

复制后新开一个对话即可生效。

## 新建技能

推荐使用 WorkBuddy 自带的 skill-creator（`/skill-creator`），或直接运行官方初始化脚本：

```bash
python scripts/init_skill.py <skill-name> --path <本仓库路径>
```

## 校验与打包

```bash
python scripts/package_skill.py <技能文件夹路径> ./dist
```

校验通过后会自动打包成 zip。
