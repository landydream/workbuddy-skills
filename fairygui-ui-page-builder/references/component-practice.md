# FairyGUI 组件属性与历史实践索引

## 文档定位

本文保存项目已验证的关键组件约束和历史案例索引。执行任务时仍须读取当前工程内实际 `package.xml` 与组件 XML，因为资源 ID、路径和组件属性可能继续变化。

完整旧版实践文档暂保留在项目根目录 `FAIRYGUI_UI_COMPONENT_PRACTICE.md`；通用执行流程以相邻的 `../SKILL.md` 为准。

## 历史案例

### Page_AI_Prompt

- 页面：`skill-assets/historical-project/AITest/page/Page_AI_Prompt.xml`
- 页面尺寸：`689×454`
- 主体：`commonPage/Skin_Page_Prompt`
- 关闭按钮：`common/button/Button1.xml`
- 关闭图标：`commonImage/images/按钮资源/Btn_guanbi.png`
- 验证点：跨包组件组合、图标覆盖、右上角关系约束。

### Page_AI_MRCZ

- 页面：`skill-assets/historical-project/mrcz/page/Page_AI_MRCZ.xml`
- 设计图：`skill-assets/historical-project/mrcz/效果图.jpg`
- 页面尺寸：`720×1520`
- 缺失清单：`skill-assets/historical-project/mrcz/MRCZ_MISSING_UI.md`
- 验证点：效果图还原、公共页签和格子复用、尺寸与缩放选择、中心轴心补偿、多轮坐标校正。

### Page_EightDayLogin

- 页面：`skill-assets/historical-project/eightDayLogin/page/Page_EightDayLogin.xml`
- 设计图：`skill-assets/historical-project/eightDayLogin/效果图.png`
- 页面尺寸：`720×1520`
- 缺失清单：`skill-assets/historical-project/eightDayLogin/EIGHT_DAY_LOGIN_MISSING_UI.md`
- 验证点：控制器状态切换、大透明 PNG 坐标匹配、完整业务切图与动态奖励格的区分。

## 关键属性约束

### 原大小与自定义尺寸

- 不写实例 `size` 表示使用源组件原始尺寸。
- 可拉伸按钮、页签和九宫格背景可修改实例尺寸。
- 复杂组合组件应优先等比缩放，避免内部字体、图标和装饰失真。
- 修改尺寸前检查内部 `relation` 与图片九宫格声明。

### 等比缩放

显示尺寸：

```text
visibleWidth  = sourceWidth  × scaleX
visibleHeight = sourceHeight × scaleY
```

历史案例中 `Grid_Common` 原始尺寸为 `120×120`，显示约 `106×106` 时使用约 `.8833` 的等比缩放。该数值是案例参数，不是所有页面的默认值。

### 中心轴心补偿

历史 `Button2` 案例的源尺寸为 `200×66`、轴心 `.5,.5`。放大到 `scale='1.15,1.15'` 后，组件坐标不能直接使用效果图可见左上角。应使用主 Skill 中的轴心公式反推。

### 文本定位

页面中心文本推荐同时设置：

```xml
<richtext xy='360,1315'
          pivot='.5,.5'
          anchor='true'
          size='450,42'
          align='center'
          vAlign='middle'/>
```

`align` 和 `vAlign` 只负责文本框内部排版，`pivot` 与 `anchor` 才决定对象定位含义。

## 常用组件历史记录

### Button1

- 当前路径：`common/button/Button1.xml`，资源 ID 为 `hoaw20`。
- 模板初始尺寸为 `50×50`，是纯图片按钮，内部 Loader 名为 `icon`。
- `icon` 设置了 `autoSize='true'`，引用图片后，Button1 的实际尺寸以 icon 图片原始尺寸自适应；不能将模板初始 `50×50` 视为固定显示尺寸。
- 组件自带名为 `reddot` 的提示红点，默认隐藏；页面层不应再重复叠加红点结构。
- 使用时只需通过 `Button.icon` 为 `icon` 添加图片 URL。
- 禁止手工修改实例 `size`。icon 图片原始尺寸与效果图一致时不设置 `scale`；只有尺寸存在差异时才设置实例 `scale`。
- Button1 的缩放基准是 icon 图片原始尺寸：`scaleX = targetWidth / iconWidth`、`scaleY = targetHeight / iconHeight`，不是固定用 `50×50` 计算。
- 根轴心为 `.5,.5`；发生缩放时应按自适应后的实际尺寸检查轴心坐标和可见边界。
- 关闭按钮可按需要添加 `right-right,top-top` 关系约束。

### TabBtn1、TabBtn2、TabBtn3、TabBtn4

这些组件都用于标签页切换，通过按钮选择状态驱动同一页面中的子页面或子内容控制器。

| 组件 | 资源 ID | 源尺寸 | 常用位置与说明 |
|---|---|---:|---|
| `common/button/TabBtn1.xml` | `hoaw1z` | `159×62` | 通常位于弹窗底部，用作底部子页面导航 |
| `common/button/TabBtn2.xml` | `kveh2e` | `165×66` | 标签页按钮，具体位置按效果图和页面结构确定 |
| `common/button/TabBtn3.xml` | `wqqi2y` | `164×48` | 标签页按钮，具体位置按效果图和页面结构确定 |
| `common/button/TabBtn4.xml` | `uv7s4m` | `159×62` | 通常位于子页面容器上方，用作顶部标签切换 |

共同约束：

- 都是子页面切换按钮，不作为普通确认按钮使用。
- 当前 XML 均通过内部 `button` 控制器表现选择状态，按钮模式为 `Radio`。
- 使用 `Button.title` 设置标签标题，并将选择状态与目标页面控制器对应。
- `TabBtn1` 和 `TabBtn4` 的位置描述是常用布局语义，不是固定坐标；实际布局以效果图为准。
- 修改尺寸或缩放前必须读取当前组件 XML，并检查背景资源是否允许按目标方式适配。

### checkbox、checkbox2、checkbox3、checkbox4、checkbox5

这些组件用于勾选或选择状态，名称在文件系统中为小写 `checkbox`。

| 组件 | 资源 ID | 源尺寸 | 内置文本 | 文本位置 | 当前按钮模式 |
|---|---|---:|---|---|---|
| `common/button/checkbox.xml` | `wqqi2a` | `83×45` | 有 | 勾选图标左侧 | `Radio` |
| `common/button/checkbox2.xml` | `piue30` | `85×44` | 有 | 勾选图标右侧 | `Check` |
| `common/button/checkbox3.xml` | `ol1f4i` | `96×96` | 无 | — | `Check` |
| `common/button/checkbox4.xml` | `mmbp5m` | `46×45` | 无 | — | `Check` |
| `common/button/checkbox5.xml` | `vydw8z` | `38×32` | 无标题文本 | — | `Check` |

使用约束：

- `checkbox` 和 `checkbox2` 的 `title` 已包含在组件结构内，应直接设置内置标题，不要在页面层重复创建同方向文本。
- `checkbox3`、`checkbox4`、`checkbox5` 没有内置标题文字；需要说明时，在页面层独立创建文本并按效果图定位。
- `checkbox5` 额外包含可配置的 `icon` Loader，但该 Loader 不是标题文本，不能据此把它归类为自带文本组件。
- `checkbox` 当前为 `Radio` 模式，其互斥行为与其他四个 `Check` 模式不同；接入交互前必须确认是否需要同组选一。
- 具体样式和尺寸以效果图为准，不要仅因名称相似就互换组件。

### Button2

- 当前路径：`common/button/Button2.xml`，资源 ID 为 `kveh2f`。
- 源尺寸为 `200×66`，用于常见的确认或提交操作。
- 导出的 `style` 控制器有三页：`0` 黄色、`1` 蓝色、`2` 灰色。
- 可通过 `Button.title` 设置文案；颜色应优先由 `style` 控制器切换，不要在页面中重做三套按钮。
- 禁止修改实例 `size`，只能通过 `scale` 适配效果图。
- 根轴心为 `.5,.5`，缩放时需要按轴心公式补偿坐标。

### Button4

- 当前路径：`common/button/Button4.xml`，资源 ID 为 `i06h4z`。
- 使用方式与 `Button2` 相同，源尺寸为 `165×66`，适合更窄的确认操作区域。
- 导出的 `style` 控制器同样为：`0` 黄色、`1` 蓝色、`2` 灰色。
- 禁止修改实例 `size`，只能通过 `scale` 适配效果图。
- 根轴心为 `.5,.5`，缩放时需要按轴心公式补偿坐标。

### Button1、Button2、Button4 的尺寸验收

- 页面实例不得为这三个组件手工填写与其实际尺寸不同的 `size`。
- Button1 先由 `icon` 图片原始尺寸自适应；尺寸与效果图一致时不写 `scale`，不一致时以 icon 图片原始宽高为基准计算 `scale`。
- Button2、Button4 分别以固定源尺寸 `200×66`、`165×66` 为基准计算 `scale`。
- 通常应保持等比缩放；只有效果图明确存在非等比形变时才允许不同的 `scaleX`、`scaleY`。
- 检查缩放后的可见边界，以及 `.5,.5` 轴心带来的位置偏移。

### Grid_Common

- 作为统一道具格容器。
- 通过 `loaderGrid` 导出属性指定实际格子组件。
- 道具图标、品质底、数量和名称应由内部格子业务数据填入。
- 页面层不应重复绘制一套品质框、图标和数量文字。

## `commonImage/images/九宫格/` 图片

- 按项目分类约定，该目录用于已设置九宫格切割的公共图片资源，适合面板背景、边框、分隔线和可变尺寸底图。
- 当前检查发现分类中并非每条注册都同时具备 `scale='9grid'` 和有效 `scale9grid`；实际使用仍以 `commonImage/package.xml` 元数据为准，异常项应先补齐配置或记录。
- 效果图目标宽高与原图不同时，直接设置 `image` 实例的 `size='目标宽,目标高'`，让 FairyGUI 按九宫格规则保留边角并拉伸中心区域。
- 九宫格图片使用 `size` 适配，不使用整体 `scale` 代替；整体缩放会同时缩放边角和边框厚度，失去九宫格的意义。
- 使用前从 `commonImage/package.xml` 获取真实包 ID、资源 ID、文件路径和 `scale9grid`，不能仅凭文件位于该目录就手写引用。
- 普通图片若不在该分类且 `package.xml` 没有九宫格声明，不得自由修改宽高以免产生视觉变形。

示例：

```xml
<image src='{resourceId}'
       fileName='images/九宫格/{fileName}.png'
       pkg='iz8is0bl'
       xy='{x},{y}'
       size='{targetWidth},{targetHeight}'/>
```

校验重点：

1. 目标尺寸能够容纳九宫格固定边缘。
2. 四角、边框厚度和装饰没有被拉伸。
3. 中心区域无明显接缝。
4. 当前 `package.xml` 确实保留有效的 `scale9grid` 元数据。

## `num` 包 BMFont 数字字体

- `assets/num/package.xml` 注册 BMFont 字体，当前包 ID 为 `ie541rut`。
- 字体分布在 `com/`、`gridFont/`、`mathNum/` 等目录，实际选择必须以当前 `package.xml` 中的 `<font>` 资源为准。
- 效果图中的普通数字可继续使用默认字体；只有字形、描边、渐变、阴影或装饰效果明显不同于常规文本时，才进入 BMFont 匹配流程。

### 匹配流程

1. 裁取或放大效果图中的目标数字区域，记录颜色、描边、阴影、渐变方向、字形宽窄和字符间距。
2. 读取 `num/package.xml` 中所有 `<font>`，核对字体名称、资源 ID 和路径。
3. 检查候选 `.fnt` 支持的字符，避免选中不包含小数点、加减号、百分号、万、亿等业务字符的字体。
4. 在相近字号下进行目视对比；优先选择视觉样式相符的字体，而不是名称最相近的字体。
5. 设置文本节点字体：`font='ui://ie541rut{fontResourceId}'`。
6. 校验包 ID、资源 ID、字符显示、文本边界和基线位置。

### 无匹配字体时

- 使用项目默认文本字体，不伪造 BMFont 或使用不匹配字体强行替代。
- 记录“缺失资源：匹配的 BMFont 字体”。
- 缺失记录应包含目标数字用途、效果图样式、已检查的候选字体、当前默认字体、主要视觉差异及待补字符范围。
- 最终对话必须在“缺失组件与资源”小节中同步输出该记录。

## 坐标匹配经验

1. 获取效果图完整尺寸和资源原始尺寸。
2. 检查切图透明通道及有效像素范围。
3. 对复杂区域生成局部坐标网格。
4. 记录设计图的可见左上角和边界。
5. 根据 `pivot`、`anchor`、`scale` 换算 XML 坐标。
6. 同时检查相邻组件间距和组合中心。
7. 在编辑器中复核。

当 X 和图片尺寸已经确认而 Y 难以目测时，可以固定 X 后逐像素扫描候选 Y。对大透明图片分别采样顶部、中心和下部区域；多个区域匹配结果一致后再采用最终坐标。不要把第一行非透明像素直接当成对象 Y。

## 已知易错点

- 把裁剪后的局部坐标误当作全图坐标。
- 忽略源组件轴心导致缩放后偏移。
- 假设重复格子必然等间距。
- 用 `size` 强行拉伸复杂组件。
- 在页面层重复构造公共格子的内部内容。
- 只凭组件名称判断用途而不读取 XML。
- 未核对 `package.xml` 就手写资源 ID。
- 用透明度隐藏本应删除的节点。
