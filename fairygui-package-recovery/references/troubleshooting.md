# FairyGUI 恢复故障排查

## Cocos 资源清单

`config.*.json` 常见结构：

- `uuids[index]`：压缩 UUID。
- `paths[index]`：业务路径、资源类型等信息。
- `versions.import`：`资源索引, import版本后缀` 交替排列。
- `versions.native`：`资源索引, native版本后缀` 交替排列。

图集文件名的短后缀通常可以直接在 `versions.native` 中反查资源索引。

## 压缩 UUID

Cocos 的 22 字符压缩 UUID 保留前两个十六进制字符，其余字符按 Base64 两字符还原三位十六进制，最后格式化为标准 UUID：

```text
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

先用一个已知 UUID 做往返验证，再批量计算物理路径。

## FairyGUI BIN

包文件头：

```text
46 47 55 49  ->  FGUI
```

随后是版本号、压缩标记、包 ID、包名和分段索引表。解析时严格复现 FairyGUI `ByteBuffer.seek`、字符串表和大端整数读取。

## rotated 的正确解释

精灵记录为：

```text
x, y, logicalPackedWidth, logicalPackedHeight, rotated
```

当 `rotated=true`：

```text
sourceWidth  = logicalPackedHeight
sourceHeight = logicalPackedWidth
```

按交换后的宽高从图集裁剪，再执行 `Rotate270FlipNone`，输出尺寸应回到 `logicalPackedWidth × logicalPackedHeight`。

## 25.4 DPI 导致只剩左上角

微信小游戏或恢复缓存中的 PNG 可能带 `25.4 DPI`。如果把裁剪图绘制到 96 DPI 画布时使用物理尺寸重载，图像会被放大约：

```text
96 / 25.4 ≈ 3.78
```

结果通常只保留左上角。修复方法：

1. 裁剪后把位图 DPI 设置为 96。
2. 创建逻辑像素尺寸的透明画布。
3. 使用同时指定源矩形、目标矩形和 `GraphicsUnit.Pixel` 的 `DrawImage`。
4. 输出前再次确认像素尺寸和 DPI。

## 透明裁剪偏移

`original` 通常包含：

```text
offsetX, offsetY, originalWidth, originalHeight
```

将旋转恢复后的裁剪图绘制到 `originalWidth × originalHeight` 透明画布的 `(offsetX, offsetY)`。绘制前验证：

```text
offsetX + cropWidth  <= originalWidth
offsetY + cropHeight <= originalHeight
```

## FairyGUI 导入后 ID 变化

导入恢复包后常见变化：

- 包 ID 被重新分配。
- 新导入的组件文件获得新资源 ID。
- 已存在的图片 ID 可能保持不变。
- XML 内的 `src`、`url`、`defaultItem` 和 Gear 值仍指向旧 ID。

按以下键匹配导入前后资源：

```text
资源类型 + 文件名 + 业务路径
```

不要按资源排列顺序匹配，也不要修改组件内部对象 ID，例如 `n42_xxxx`。

## 校验重点

- 扫描所有 XML 属性中的 `ui://`，Gear 的 `values` 也必须扫描。
- `src` 只有在没有外部 `pkg` 时才按本包资源校验。
- 不要把备份文件放到 FairyGUI `assets` 目录，否则可能再次被导入为资源。
- 修复后重新打开或刷新 FairyGUI 工程，再确认编辑器没有再次生成新 ID。

