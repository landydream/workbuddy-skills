---
name: fairygui-atlas-extraction
description: 解析 FairyGUI 包元数据和图集纹理，将包资源项映射到精灵，导出完整 PNG 组件，恢复旋转精灵，保留裁剪元数据，并生成 CSS 九宫格参数。适用于处理 FairyGUI .bin 文件、*_atlas*.png 纹理、Cocos Creator FairyGUI 包、图集切片不完整、旋转方向错误、DPI 导致的裁切问题或 scale9Grid 资源。
---

# FairyGUI 图集切片

## 解析包元数据

1. 以与资源包版本匹配的 FairyGUI 运行时实现作为格式依据。
2. 严格复现 `ByteBuffer` 的分块定位、字符串表访问、包资源项解析、精灵解析、分支资源和高分辨率变体处理。
3. 在清单中保留资源项 ID、资源项名称、精灵矩形、旋转标记、偏移、原始尺寸、图集 ID 和 `scale9Grid`。
4. 批量导出前，使用多个视觉特征明显的精灵验证资源项名称映射是否正确。
5. 坐标正确但名称错误时，应判定为元数据映射失败，而不是裁切失败。

## 导出完整精灵

- 将 `sourceRect` 解释为图集中实际存储的矩形区域。
- 使用精确的像素克隆操作进行裁切。
- 对旋转精灵先裁切，再执行 `Rotate270FlipNone`。
- 除非源运行时明确执行了 Y 轴翻转，否则不要翻转 Y 轴。
- 当 `sourceRect` 已描述图集中的实际存储区域时，裁切前不要交换宽高。

## 避免 DPI 裁切问题

部分恢复出的图集包含 25.4 DPI 元数据。若使用按物理尺寸绘制的 `DrawImage` 重载，在 96 DPI 目标画布上可能会将位图放大约 3.78 倍，导致输出只保留左上角的一小部分。

- 优先使用 `Bitmap.Clone(Rectangle, PixelFormat)` 精确提取像素。
- 如必须使用绘制方式，应同时指定源矩形、目标矩形和 `GraphicsUnit.Pixel`。
- 将导出位图的分辨率规范为 96 DPI，但不要改变像素尺寸。
- 不要仅根据输出尺寸判断裁切是否正确，必须目视检查内容是否完整。

## 转换 scale9Grid

已知图片尺寸为 `W × H`，FairyGUI 中心网格为 `{x, y, width, height}`：

```text
left   = x
top    = y
right  = W - x - width
bottom = H - y - height
```

使用 CSS `border-image-slice: top right bottom left fill`，并通过 `border-image-repeat: stretch` 保持四角不变。

## 校验

1. 检查一个大按钮、一个小图标、一个关闭按钮，以及至少一个旋转的文字或按钮资源。
2. 为所有导出的组件生成带标签的缩略总览图。
3. 发布后比较源文件和目标文件的哈希值。
4. 分别记录实际导出尺寸与逻辑尺寸或原始尺寸。
5. 当源矩形超出图集边界时立即停止并报告错误。

使用 `scripts/export-components.ps1`，根据包含 `sourceAtlas`、`sourceRect`、`rotated` 和输出文件字段的清单重新生成组件。
