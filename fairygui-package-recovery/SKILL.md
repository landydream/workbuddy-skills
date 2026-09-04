---
name: fairygui-package-recovery
description: 从 Cocos Creator 或微信小游戏构建产物中定位 FairyGUI 图集对应的 .bin 包，恢复 package.xml 与组件 XML，正确拆分旋转、裁剪和九宫格图集资源，并修复 FairyGUI 编辑器导入后重新分配的包 ID 和组件 ID。适用于只有 config.*.json、native/import UUID 文件、FGUI 二进制和图集 PNG 的资源恢复、迁移、重新导入与引用修复任务。
---

# FairyGUI 包恢复

按以下顺序执行，先验证元数据，再写入正式目录。

## 1. 定位图集所属包

1. 从图集文件名取得版本后缀，例如 `.ab9fd.png` 中的 `ab9fd`。
2. 在 `config.*.json` 的 `versions.native` 交替数组中找到后缀，前一个数字是资源索引。
3. 用资源索引读取 `paths[index]`，确认业务路径，例如 `pkg/MailPkg_atlas0`。
4. 去掉 `_atlasN` 后缀，在 `paths` 中查找同名包资源，例如 `pkg/MailPkg`。
5. 用包资源索引读取压缩 UUID、`versions.import` 和 `versions.native`，定位对应 `import/*.json` 与 `native/*.bin`。
6. 验证 `.bin` 文件头为 `FGUI`，记录二进制版本和包 ID。

压缩 UUID 解码与清单结构细节见 `references/troubleshooting.md`。

## 2. 恢复包 XML

运行：

```powershell
node scripts/fgui-bin-to-xml.js <package.bin> <output-directory>
```

检查输出：

- `package.xml`
- 每个组件对应的 `.xml`
- `atlas_sprites.xml`
- `recovery_report.json`

将结果视为运行时语义恢复，而不是原 FairyGUI 工程的字节级副本。重点检查 `recovery_report.json` 中未支持的 Gear、Transition 和控制器动作。

## 3. 拆分图集

运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/split-fgui-atlas.ps1 `
  -AtlasPath <atlas.png> `
  -RecoveryReportPath <recovery_report.json> `
  -OutputDirectory <package-directory\img>
```

必须遵守：

- `rotated=true` 时，实际图集裁剪宽高为记录高、记录宽；裁剪后执行 `Rotate270FlipNone`。
- 原图集可能是 `25.4 DPI`。合成透明画布时必须同时指定源矩形、目标矩形和 `GraphicsUnit.Pixel`。
- 不要使用依赖物理尺寸的 `DrawImage` 重载，也不要用未经验证的 `DrawImageUnscaled` 恢复透明边距。
- 按 `original` 中的偏移和原始尺寸恢复透明画布。
- 输出统一设置为 `96 DPI`，像素尺寸保持资源逻辑尺寸。
- 保留 `scale9Grid`，并验证四边值没有负数。

## 4. 修复导入后 ID

FairyGUI 编辑器导入恢复文件时，可能重新分配包 ID 或部分组件 ID。不要手工猜测 ID，使用导入前后的 `package.xml` 按资源类型、名称和路径建立映射。

运行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/repair-imported-ids.ps1 `
  -PackageDirectory <fairygui-project\assets\package> `
  -OriginalPackageXml <recovered\package.xml>
```

脚本应修复：

- `src="旧组件ID"`
- `url="ui://旧包ID旧资源ID"`
- `defaultItem="ui://旧包ID旧组件ID"`
- Gear 属性中的 `ui://` 列表
- `packageId="旧包ID"`
- 指向本包的 `pkg="旧包ID"`

备份默认写入系统临时目录，不要把 `.bak` 文件放进 FairyGUI 的 `assets` 目录。

## 5. 校验

完成前必须全部通过：

1. 所有 XML 可以被 XML 解析器读取。
2. 本包 `src` 都能在当前 `package.xml` 中找到。
3. 所有本包 `ui://` 的包 ID 与资源 ID 都有效。
4. 旧包 ID、旧组件 ID 的引用数量为零。
5. 拆分 PNG 数量等于精灵记录数。
6. 每张 PNG 的尺寸等于逻辑尺寸，DPI 为 96。
7. 至少目视检查一个旋转文字、一个旋转图标、一个带透明裁剪边距的图标和一个九宫格资源。
8. 对原始 BIN、图集和拆分 PNG 使用 SHA-256 做字节级回归；组件 XML 使用解析、引用完整性和 ID 替换范围做语义回归，不要与 FairyGUI 编辑器重新保存后的 XML 直接比较哈希。编辑器可能补充 `fileName`、空列表项，调整属性顺序、浮点精度和末尾换行。

## 6. 出错即停

遇到以下情况立即终止并报告：

- 图集裁剪矩形越界。
- 旋转后尺寸与记录尺寸不一致。
- 裁剪内容无法放入逻辑画布。
- 导入前后资源无法按类型、名称和路径唯一匹配。
- 本包引用指向不存在的资源。
- 正式目录中的发布文件与校验副本哈希不一致。
