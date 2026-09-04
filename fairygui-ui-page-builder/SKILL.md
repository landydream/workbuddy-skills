---
name: fairygui-ui-page-builder
description: 分析 FairyGUI 工程、效果图和切图资源，复用公共组件创建或修正页面 XML，并处理 package.xml 注册、组件尺寸、缩放、轴心、坐标、控制器、资源引用和缺失资源。用于根据设计图还原页面、修复组件引用与布局、拆分公共组件或校验 FairyGUI 包。
---

# FairyGUI UI 页面构建

## 工程范围

- 正式包目录：`assets/`。
- 历史案例：`skill-assets/historical-project/`，只读参考，禁止注册到正式包。
- 详细属性和既有案例：`references/component-practice.md`。
- 新经验沉淀规则：`references/skill-maintenance.md`。

## 标准流程

1. 读取目标包 `package.xml`、效果图、切图和已有页面。
2. 读取合并后的 `common/package.xml` 与 `commonImage/package.xml`。
3. 检查候选组件 XML 的根尺寸、轴心、锚点、扩展类型、控制器与关系约束。
4. 建立效果图节点清单，将元素分为固定图片、公共组件、动态数据、文本、外层 HUD 和缺失资源。
5. 测量可见边界，处理透明像素、轴心和缩放补偿。
6. 创建或修改页面 XML，并在目标 `package.xml` 注册唯一资源 ID。
7. 解析 XML，校验资源引用、节点 ID、边界、控制器和删除项。
8. 在 FairyGUI 编辑器内复核；若无法打开编辑器，应明确说明未进行编辑器目视验证。
9. 整理本次新建或修改界面中可能需要代码绑定的命名节点，按“界面 → 当前名称 → 类型 → 建议前缀名称”生成清单；完成界面后先在对话中询问用户哪些组件需要修改前缀，获得选择后再实际改名。
10. 将本次真正可复用的新结论按维护规则沉淀，不记录一次性业务信息。

## 包与资源引用

从目标 `package.xml` 获取包 ID，资源 ID 必须在包内唯一：

```xml
<packageDescription id='amk49vdy'>
  <resources>
    <component id='tgc56' name='Page_AI_MRCZ.xml' path='/page/'/>
  </resources>
</packageDescription>
```

同包资源省略 `pkg`：

```xml
<image src='tgc51' fileName='切图/cz_role.png'/>
```

跨包引用同时提供 `src`、`fileName` 和 `pkg`：

```xml
<component src='uv7s4m' fileName='button/TabBtn4.xml' pkg='eddhuk3v'/>
```

`ui://` 地址为 `ui://{packageId}{resourceId}`。禁止只按文件名猜测资源 ID。

## 页面与设计图

- 未声明指定尺寸时，新建页面根节点统一使用 `size='720,1520'`；用户或目标包明确指定其他尺寸时才覆盖该默认值。
- 效果图尺寸与默认页面不同时，按同一比例等比放大或缩小完整有效画面，以宽度不超过 `720` 为约束；禁止为了填满 `1520` 而单独拉伸纵向。未占满区域保留为空白或按页面背景处理。
- 效果图中的顶部玩家状态栏和底部主导航通常属于外层 HUD，不创建，但测量主体坐标时应保留它们在原图中的空间关系，再按统一比例换算。
- `designImage` 只可作为编辑器参考，不能作为正式显示节点发布。
- 先区分业务页面和外层 HUD；平台栏、资源栏、聊天区及底部主菜单通常不应重复制作。
- 切图可能带透明边界，坐标匹配以最终可见内容为准。

## `size`、`scale` 与轴心

- 实例不写 `size` 时使用源组件原始尺寸。
- 可拉伸页签、关系约束完整的面板和九宫格背景可按需要修改 `size`。
- `common/button/Button1.xml` 的实例尺寸默认由 `icon` 引用图片的原始尺寸自适应；禁止手工修改实例 `size`。只有该图片的原始尺寸与效果图目标尺寸存在差异时，才修改 Button1 实例的 `scale`。
- `common/button/Button2.xml`、`Button4.xml` 禁止修改实例 `size`；必须保持源尺寸，仅通过 `scale` 适配效果图。
- 格子、复杂按钮和组合组件优先使用等比 `scale`，保留内部比例。
- 不要无依据地同时修改 `size` 与 `scale`。
- `anchor='true'` 时，`xy` 表示轴心坐标，不是可见左上角。

轴心缩放后的可见左上角：

```text
visibleX = objectX + width  × pivotX × (1 - scaleX)
visibleY = objectY + height × pivotY × (1 - scaleY)
```

由目标可见左上角反推组件坐标：

```text
objectX = desiredVisibleX - width  × pivotX × (1 - scaleX)
objectY = desiredVisibleY - height × pivotY × (1 - scaleY)
```

## 常用公共组件

### `common/button/Button1.xml`

- 纯图片按钮，模板初始尺寸为 `50×50`，包含名为 `reddot` 的提示红点。
- 使用时只需给按钮的 `icon` 添加图片 URL；不要在页面层重复叠加按钮底图。
- 内部 `icon` Loader 启用了 `autoSize='true'`，Button1 实例应随引用图片的原始尺寸自适应，不能把模板的 `50×50` 当成最终固定显示尺寸。
- 禁止手工修改实例 `size`。先比较 icon 图片原始尺寸与效果图目标尺寸；两者一致时不写 `scale`，只有存在差异时才设置实例 `scale`。
- 需要缩放时，按 icon 图片原始尺寸计算，而不是按模板初始 `50×50` 计算：`scaleX = targetWidth / iconWidth`、`scaleY = targetHeight / iconHeight`。

原图尺寸与效果图一致：

```xml
<component src='hoaw20' fileName='button/Button1.xml' pkg='eddhuk3v'>
  <Button icon='ui://{packageId}{resourceId}'/>
</component>
```

仅当尺寸不一致时：

```xml
<component src='hoaw20' fileName='button/Button1.xml' pkg='eddhuk3v' scale='{scaleX},{scaleY}'>
  <Button icon='ui://{packageId}{resourceId}'/>
</component>
```

### `common/button/Button2.xml`

- 常用确认操作按钮，源尺寸为 `200×66`。
- 导出的 `style` 控制器提供三种颜色：`0` 黄色、`1` 蓝色、`2` 灰色。
- 通过 `Button.title` 设置按钮文案，并按业务状态选择 `style` 页面。
- 禁止修改实例宽高，只能通过 `scale` 适配效果图；根轴心为 `.5,.5`，缩放后必须按轴心换算位置。

### `common/button/Button4.xml`

- 使用方式与 `Button2` 相同，但源尺寸较窄，为 `165×66`。
- 同样使用 `style` 控制器：`0` 黄色、`1` 蓝色、`2` 灰色。
- 禁止修改实例宽高，只能通过 `scale` 适配效果图；根轴心为 `.5,.5`。

### 标签页按钮

- `common/button/TabBtn1.xml`、`TabBtn2.xml`、`TabBtn3.xml`、`TabBtn4.xml` 都是标签页按钮，用于切换同一页面中的子页面或子内容状态。
- 四者均为互斥选择用途，实例标题通过 `Button.title` 设置，并与页面控制器状态对应。
- `TabBtn1` 通常放在弹窗底部，用于底部子页面导航。
- `TabBtn4` 通常放在子页面内容容器上方，用于顶部标签切换。
- `TabBtn2`、`TabBtn3` 的具体位置和选择，以效果图及现有页面结构为准。
- 上述位置是常用语义，不是强制坐标；最终布局始终以效果图为准。

### 勾选按钮

- `common/button/checkbox.xml`、`checkbox2.xml`、`checkbox3.xml`、`checkbox4.xml`、`checkbox5.xml` 都用于勾选或选中状态。
- `checkbox.xml` 自带文本，文本位于勾选图标左侧。
- `checkbox2.xml` 自带文本，文本位于勾选图标右侧。
- `checkbox3.xml`、`checkbox4.xml`、`checkbox5.xml` 不带文本；需要说明文字时由页面层单独放置文本，但不要修改组件内部结构伪造内置标题。
- 选择具体 checkbox 前应对照效果图检查图标样式、尺寸、文本方向和交互模式。

### 其他组件

- `common/grids/Grid_Common.xml`：统一道具格容器，通过导出属性指定实际格子组件；页面层不要重复绘制内部品质框、图标和数量。

使用前必须重新读取当前工程对应 XML 和 `package.xml`，本节记录不能替代实时核对。

## 文本、数字字体、控制器与图片

- 中心定位文本同时使用 `pivot='.5,.5'`、`anchor='true'`、`align='center'` 和 `vAlign='middle'`。
- `align` 只控制文本框内部排版，不能替代轴心设置。
- `num` 包是 BMFont 字体集合。效果图中出现描边数字、渐变数字、战力数字、倒计时数字或其他非常规数字样式时，必须先读取 `num/package.xml` 并在其中寻找视觉样式相符的 `.fnt` 字体。
- 找到匹配 BMFont 后，为对应 `text` 或 `richtext` 节点设置 `font='ui://{numPackageId}{fontResourceId}'`；禁止根据字体文件名猜资源 ID。
- 匹配时比较数字字形、颜色、描边、阴影、渐变、字符间距、支持字符和适用尺寸，不能只凭字体名称判断。
- 若 `num` 包没有符合效果图的 BMFont，则使用项目默认文本字体完成近似显示，并记录为“缺失资源：匹配的 BMFont 字体”。任务最终对话的“缺失组件与资源”小节必须说明使用了哪个默认字体、差异和待补字体样式。
- 常规正文或普通数字不强制使用 `num` 包，仍使用默认文本字体。
- 固定包内图片使用 `image`；运行时动态资源使用 `loader` 或公共业务组件。
- 按项目分类约定，`commonImage/images/九宫格/` 中的公共图片用于九宫格拉伸。还原效果图时，可直接修改这类 `image` 实例的 `size`，分别调整宽高以匹配目标区域；不要使用整体 `scale` 拉伸九宫格图片。
- 使用前仍须在 `commonImage/package.xml` 核对真实资源 ID、路径及 `scale='9grid'`、`scale9grid` 元数据。若分类内资源缺少完整元数据，应记录为配置异常或缺失资源，不能假定运行时一定按九宫格处理。
- 其他目录的图片只有在 `package.xml` 明确声明九宫格时才适合自由修改宽高；未声明九宫格的普通图片不得按此规则拉伸。
- 页面状态用控制器与 `gearDisplay` 管理，避免为同构状态复制多套页面。
- 不需要的节点应完整删除，不要仅设为透明或保留空节点。

## 代码绑定节点的命名前缀

- 创建或修改界面后，不要擅自批量改名；先在最终或阶段完成对话中询问用户：哪些界面里的哪些组件需要添加代码绑定前缀。
- 建议名称结构固定为：`m_类型缩写_原名`。
- 保留原名的业务语义，只添加一次前缀；已有符合规则的名称不重复添加。
- 当前类型缩写：
  - `GTextField`（XML 中的 `text`、`richtext`）：`txt`
  - `GLabel`：`lb`
  - `GList`（XML 中的 `list`）：`list`
  - `GLoader`（XML 中的 `loader`）：`loader`
  - `GButton`（按钮扩展组件或按钮实例）：`btn`
  - 其他类型：`com`
- 示例：名称为 `heroName` 的 GTextField，建议改为 `m_txt_heroName`。
- 询问清单按界面分组，至少列出当前名称、节点类型和建议名称，允许用户选择全部、部分或不修改。
- 用户确认改名后，应同步检查与名称有关的 `customProperty`、relation target、gear target、代码生成绑定以及其他 XML 引用，避免只改显示节点名称导致绑定失效。

## 缺失组件与缺失资源

1. 创建或修改界面时，搜索目标包、`common`、`commonImage` 和已知业务包，确认效果图所需组件或资源是否存在。
2. 找不到匹配组件时，必须记录为“缺失组件”；找不到图片、字体等资源时，记录为“缺失资源”，不得伪造包 ID、资源 ID 或不存在的组件。
3. 每条缺失项至少记录：效果图用途、预期组件或资源、目标页面节点、已搜索范围、当前替代方案、后续待补内容。
4. 使用相近组件或资源时必须显式标记“近似还原”，并说明与效果图的主要差异。
5. 动态内容可保留 Loader、公共格子或其他可绑定入口，但仍须记录实际缺失项。
6. 若任务中出现任何缺失组件或缺失资源，应在包目录或任务约定位置维护缺失清单。
7. 任务完成后的最终对话必须包含“缺失组件与资源”小节，逐项输出本次发现的缺失内容和处理状态；不能只写入文件而不在对话中说明。
8. 若本次没有缺失项，最终对话仍应明确写明“未发现缺失组件或资源”。

## 最低校验

- [ ] 页面 XML 可解析。
- [ ] 目标包 `package.xml` 可解析。
- [ ] 页面资源 ID 在包内唯一。
- [ ] 所有 `src` 在对应包中存在。
- [ ] `pkg` 与目标包 ID 一致。
- [ ] `fileName` 与注册路径一致。
- [ ] 页面节点 ID 不重复。
- [ ] 页面尺寸和关键组件边界合理；未指定尺寸时根节点为 `720×1520`，效果图按统一比例适配且没有纵向单独拉伸。
- [ ] 轴心、缩放、文本和控制器状态经过检查。
- [ ] 使用 `commonImage/images/九宫格/` 图片时已核对资源 ID、路径和 `scale9grid`，并通过实例 `size` 而非整体 `scale` 适配目标宽高。
- [ ] 非常规数字样式已检查 `num` 包；匹配 BMFont 的包 ID、资源 ID 和支持字符有效。
- [ ] 未找到匹配 BMFont 时已使用默认文本字体，并作为缺失资源记录。
- [ ] 删除项不再残留。
- [ ] 缺失组件与缺失资源已记录。
- [ ] 最终对话包含“缺失组件与资源”小节；无缺失时也明确说明。
- [ ] 已按界面列出可添加 `m_类型缩写_原名` 前缀的节点并询问用户；未经确认不擅自批量改名。

## 禁止事项

- 不把历史案例目录注册为正式包。
- 不把效果图裁剪坐标直接当作全图坐标。
- 不忽略透明边界或源组件轴心。
- 不默认重复格子必然等间距。
- 不凭名称判断组件用途，必须查看 XML。
- 不在未核对 `package.xml` 时手写资源 ID。
- 不用错误公共组件替代用户明确指定的组件。
