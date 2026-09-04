const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

class B {
  constructor(data) { this.data=data; this.p=0; this.v=0; this.st=[]; }
  u8(){return this.data.readUInt8(this.p++);}
  bool(){return this.u8()===1;}
  i16(){const v=this.data.readInt16BE(this.p);this.p+=2;return v;}
  u16(){const v=this.data.readUInt16BE(this.p);this.p+=2;return v;}
  i32(){const v=this.data.readInt32BE(this.p);this.p+=4;return v;}
  u32(){const v=this.data.readUInt32BE(this.p);this.p+=4;return v;}
  f32(){const v=this.data.readFloatBE(this.p);this.p+=4;return v;}
  str(n){n=n===undefined?this.u16():n;const v=this.data.toString("utf8",this.p,this.p+n).replaceAll("\0","");this.p+=n;return v;}
  s(){const i=this.u16();return i===65534?null:i===65533?"":this.st[i];}
  color(){return [this.u8(),this.u8(),this.u8(),this.u8()];}
  buf(){const n=this.u32(),v=new B(this.data.subarray(this.p,this.p+n));v.v=this.v;v.st=this.st;this.p+=n;return v;}
  seek(base,index){const old=this.p;this.p=base;const count=this.u8();if(index>=count){this.p=old;return false;}const short=this.u8()===1;this.p+=index*(short?2:4);const offset=short?this.u16():this.u32();if(offset){this.p=base+offset;return true;}this.p=old;return false;}
}

const itemTypes=["image","movieclip","sound","component","atlas","font","swf","misc","unknown","spine","dragonbones"];
const objectTypes=["image","movieclip","swf","graph","loader","group","text","richtext","inputtext","component","list","label","button","combobox","progressbar","slider","scrollbar","tree","loader3d"];
const relationNames=["left-left","left-center","left-right","center-center","right-left","right-center","right-right","top-top","top-middle","top-bottom","middle-middle","bottom-top","bottom-middle","bottom-bottom","width-width","height-height","leftext-left","leftext-right","rightext-left","rightext-right","topext-top","topext-bottom","bottomext-top","bottomext-bottom","size-size"];
const E={overflow:["visible","hidden","scroll"],align:["left","center","right"],vAlign:["top","middle","bottom"],fill:["none","scale","scaleMatchHeight","scaleMatchWidth","scaleFree","scaleNoBorder"],listLayout:["singleColumn","singleRow","flowHorizontal","flowVertical","pagination"],selection:["single","multiple","multipleSingleClick","none"],render:["ascent","descent","arch"],group:["none","horizontal","vertical"],flip:["none","horizontal","vertical","both"],autoSize:["none","both","height","shrink"]};

function parsePackage(file) {
  let b=new B(fs.readFileSync(file));
  if(b.u32()!==0x46475549)throw new Error("Not an FGUI package");
  const version=b.i32();b.v=version;const compressed=b.bool(),id=b.str(),name=b.str();b.p+=20;
  if(compressed){b=new B(zlib.inflateRawSync(b.data.subarray(b.p)));b.v=version;}
  const base=b.p;
  if(!b.seek(base,4))throw new Error("String table missing");
  b.st=Array.from({length:b.i32()},()=>b.str());
  if(b.seek(base,5))for(let n=b.i32();n--;){const i=b.u16();b.st[i]=b.str(b.i32());}
  const dependencies=[];
  if(b.seek(base,0)){for(let n=b.i16();n--;)dependencies.push({id:b.s(),name:b.s()});if(version>=2)for(let n=b.i16();n--;)b.s();}
  const items=[];
  if(b.seek(base,1))for(let n=b.i16();n--;){
    const end=b.i32()+b.p,typeIndex=b.u8();
    const item={type:itemTypes[typeIndex],typeIndex,id:b.s(),name:b.s(),path:b.s(),file:b.s(),exported:b.bool(),width:b.i32(),height:b.i32()};
    if(typeIndex===0){item.scaleOption=b.u8();if(item.scaleOption===1)item.scale9=[b.i32(),b.i32(),b.i32(),b.i32(),b.i32()];else if(item.scaleOption===2)item.tiled=true;item.smoothing=b.bool();}
    else if(typeIndex===1){item.smoothing=b.bool();item.raw=b.buf();}
    else if(typeIndex===5)item.raw=b.buf();
    else if(typeIndex===3){item.extension=b.u8();item.raw=b.buf();}
    else if(typeIndex===9||typeIndex===10)item.anchor=[b.f32(),b.f32()];
    if(version>=2){item.branch=b.s();item.branches=Array.from({length:b.u8()},()=>b.s());item.highRes=Array.from({length:b.u8()},()=>b.s());}
    items.push(item);b.p=end;
  }
  const sprites=[];
  if(b.seek(base,2))for(let n=b.i16();n--;){const end=b.i16()+b.p,s={itemId:b.s(),atlasId:b.s(),rect:[b.i32(),b.i32(),b.i32(),b.i32()],rotated:b.bool()};if(version>=2&&b.bool())s.original=[b.i32(),b.i32(),b.i32(),b.i32()];sprites.push(s);b.p=end;}
  const byId=new Map(items.map(v=>[v.id,v]));
  for(const item of items)if(item.type==="component")item.component=parseComponent(item.raw,byId);
  return {version,compressed,id,name,dependencies,items,sprites};
}
function parseComponent(b,byId){
  const c={controllers:[],children:[],relations:[],transitions:[]};
  if(b.seek(0,0)){c.width=b.i32();c.height=b.i32();if(b.bool())c.minMax=[b.i32(),b.i32(),b.i32(),b.i32()];if(b.bool())c.pivot=[b.f32(),b.f32(),b.bool()];if(b.bool())c.margin=[b.i32(),b.i32(),b.i32(),b.i32()];c.overflow=b.u8();if(b.bool())c.clip=[b.i32(),b.i32()];}
  if(c.overflow===2&&b.seek(0,7))c.scroll=parseScroll(b);
  if(b.seek(0,1))for(let n=b.i16();n--;){
    const end=b.i16()+b.p,pos=b.p,ctrl={pages:[]};
    if(b.seek(pos,0)){ctrl.name=b.s();ctrl.autoDepth=b.bool();}
    if(b.seek(pos,1)){for(let m=b.i16();m--;)ctrl.pages.push({id:b.s(),name:b.s()});ctrl.homeType=b.v>=2?b.u8():0;if(ctrl.homeType===1)ctrl.homeIndex=b.i16();else if(ctrl.homeType===3)ctrl.homeVar=b.s();}
    if(b.seek(pos,2)){ctrl.actionCount=b.i16();}
    c.controllers.push(ctrl);b.p=end;
  }
  if(b.seek(0,2))for(let n=b.i16(),index=0;n--;index++){
    const len=b.i16(),pos=b.p,ch=parseChild(b,pos,c.controllers,byId);ch.index=index;c.children.push(ch);b.p=pos+len;
  }
  for(const ch of c.children){if(ch.groupIndex>=0&&c.children[ch.groupIndex])ch.group=c.children[ch.groupIndex].id;for(const r of ch.relations)r.target=r.targetIndex===-1?"":c.children[r.targetIndex]?.id||`#${r.targetIndex}`;}
  if(b.seek(0,3))c.relations=parseRelations(b,c.children);
  if(b.seek(0,4)){c.customData=b.s();c.opaque=b.bool();c.maskIndex=b.i16();if(c.maskIndex!==-1)c.maskReversed=b.bool();c.hitTestId=b.s();c.hitOffset=[b.i32(),b.i32()];}
  if(b.seek(0,5)){const count=b.i16();for(let i=0;i<count;i++){const end=b.i16()+b.p;c.transitions.push(b.data.subarray(b.p,end).toString("base64"));b.p=end;}}
  return c;
}

function parseChild(b,pos,controllers,byId){
  const ch={gears:[],relations:[],assignments:[],overrides:[]};
  b.seek(pos,0);ch.typeIndex=b.u8();ch.type=objectTypes[ch.typeIndex];ch.src=b.s();ch.pkg=b.s();ch.id=b.s();ch.name=b.s();ch.xy=[b.i32(),b.i32()];
  if(b.bool())ch.size=[b.i32(),b.i32()];if(b.bool())ch.minMax=[b.i32(),b.i32(),b.i32(),b.i32()];if(b.bool())ch.scale=[b.f32(),b.f32()];if(b.bool())ch.skew=[b.f32(),b.f32()];if(b.bool())ch.pivot=[b.f32(),b.f32(),b.bool()];
  ch.alpha=b.f32();ch.rotation=b.f32();ch.visible=b.bool();ch.touchable=b.bool();ch.grayed=b.bool();ch.blend=b.u8();ch.filter=b.u8();ch.data=b.s();
  if(b.seek(pos,1)){ch.tooltips=b.s();ch.groupIndex=b.i16();}else ch.groupIndex=-1;
  if(b.seek(pos,2))ch.gears=parseGears(b,controllers);
  if(b.seek(pos,3))ch.relations=parseRelations(b,[]);
  if(ch.type==="component"&&b.seek(pos,4)){ch.pageController=b.i16();for(let n=b.i16();n--;)ch.assignments.push({controller:b.s(),page:b.s()});if(b.v>=2)for(let n=b.i16();n--;)ch.overrides.push({target:b.s(),property:b.i16(),value:b.s()});}
  parseSpecific(b,pos,ch);if(ch.src&&!ch.pkg)ch.refName=byId.get(ch.src)?.name;return ch;
}

function parseGears(b,controllers){
  const gears=[];
  for(let n=b.i16();n--;){const end=b.i16()+b.p,type=b.u8(),g={type,controllerIndex:b.i16()};g.controller=controllers[g.controllerIndex]?.name||`#${g.controllerIndex}`;const count=b.i16();
    if(type===0||type===8)g.pages=Array.from({length:count},()=>b.s());
    else{g.states=[];for(let i=0;i<count;i++)g.states.push({page:b.s(),value:gearValue(type,b)});if(b.bool())g.default=gearValue(type,b);}
    if(b.bool())g.tween={ease:b.u8(),duration:b.f32(),delay:b.f32()};if(b.v>=2&&type===8)g.condition=b.u8();gears.push(g);b.p=end;
  }return gears;
}
function gearValue(type,b){if(type===2)return[b.i32(),b.i32(),b.f32(),b.f32()];if(type===6||type===7)return b.s();return null;}
function parseRelations(b,children){const list=[];for(let n=b.u8();n--;){const targetIndex=b.i16(),defs=[];for(let m=b.u8();m--;){const type=b.u8();defs.push({type,name:relationNames[type],percent:b.bool()});}list.push({targetIndex,target:targetIndex===-1?"":children[targetIndex]?.id||`#${targetIndex}`,definitions:defs});}return list;}
function parseScroll(b){const s={type:b.u8(),display:b.u8(),flags:b.i32()};if(b.bool())s.margin=[b.i32(),b.i32(),b.i32(),b.i32()];s.vertical=b.s();s.horizontal=b.s();s.header=b.s();s.footer=b.s();return s;}
function parseSpecific(b,pos,ch){
  if(ch.type==="image"&&b.seek(pos,5)){if(b.bool())ch.color=b.color();ch.flip=b.u8();ch.fillMethod=b.u8();if(ch.fillMethod)ch.fillData=[b.u8(),b.bool(),b.f32()];}
  else if(ch.type==="loader"&&b.seek(pos,5)){ch.url=b.s();ch.align=b.u8();ch.vAlign=b.u8();ch.loaderFill=b.u8();ch.shrink=b.bool();ch.auto=b.bool();ch.errorSign=b.bool();ch.playing=b.bool();ch.frame=b.i32();if(b.bool())ch.color=b.color();ch.fillMethod=b.u8();if(ch.fillMethod)ch.fillData=[b.u8(),b.bool(),b.f32()];}
  else if(ch.type==="group"&&b.seek(pos,5)){ch.layout=b.u8();ch.lineGap=b.i32();ch.columnGap=b.i32();if(b.v>=2){ch.exclude=b.bool();ch.autoSizeDisabled=b.bool();ch.mainGrid=b.i16();}}
  else if(["text","richtext","inputtext"].includes(ch.type)&&b.seek(pos,5)){
    ch.font=b.s();ch.fontSize=b.i16();ch.color=b.color();ch.align=b.u8();ch.vAlign=b.u8();ch.leading=b.i16();ch.letterSpacing=b.i16();ch.ubb=b.bool();ch.textAuto=b.u8();ch.underline=b.bool();ch.italic=b.bool();ch.bold=b.bool();ch.singleLine=b.bool();
    if(b.bool())ch.stroke={color:b.color(),size:b.f32()};if(b.bool())ch.shadow={color:b.color(),offset:[b.f32(),b.f32()]};ch.template=b.bool();if(b.seek(pos,6))ch.text=b.s()||"";
  }else if(ch.type==="list"){
    if(b.seek(pos,5)){ch.layout=b.u8();ch.selection=b.u8();ch.align=b.u8();ch.vAlign=b.u8();ch.lineGap=b.i16();ch.columnGap=b.i16();ch.lineCount=b.i16();ch.columnCount=b.i16();ch.autoResize=b.bool();ch.render=b.u8();ch.apex=b.i16();if(b.bool())ch.margin=[b.i32(),b.i32(),b.i32(),b.i32()];ch.overflow=b.u8();if(b.bool())ch.clip=[b.i32(),b.i32()];if(b.v>=2){ch.scrollToView=b.bool();ch.fold=b.bool();}}
    if(ch.overflow===2&&b.seek(pos,7))ch.scroll=parseScroll(b);
    if(b.seek(pos,8)){ch.defaultItem=b.s();ch.items=[];for(let n=b.i16();n--;){const end=b.i16()+b.p;ch.items.push({url:b.s(),title:b.s(),selectedTitle:b.s(),icon:b.s(),selectedIcon:b.s(),name:b.s()});b.p=end;}}
    if(b.seek(pos,6))ch.selectionController=b.i16();
  }
}

function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;").replaceAll("\r","&#xD;").replaceAll("\n","&#xA;");}
function attrs(values){return Object.entries(values).filter(([,v])=>v!==undefined&&v!==null&&v!==false&&v!=="").map(([k,v])=>` ${k}="${esc(Array.isArray(v)?v.join(","):v)}"`).join("");}
function hex(c,alpha=false){if(!c)return;const h=n=>n.toString(16).padStart(2,"0");return`#${alpha?h(c[3]):""}${h(c[0])}${h(c[1])}${h(c[2])}`;}
function num(v){return Number(Number(v).toFixed(4));}
function applyScroll(a,s){a.scroll=["horizontal","vertical","both"][s.type];a.scrollBar=["default","visible","auto","hidden"][s.display];if(s.flags)a.scrollBarFlags=s.flags;if(s.margin)a.scrollBarMargin=s.margin;if(s.vertical||s.horizontal)a.scrollBarRes=[s.vertical||"",s.horizontal||""];if(s.header||s.footer)a.ptrRes=[s.header||"",s.footer||""];}

function packageXml(pkg){const out=['<?xml version="1.0" encoding="utf-8"?>',`<packageDescription${attrs({id:pkg.id})}>`,`  <resources>`];for(const i of pkg.items){if(i.type==="atlas")continue;if(i.type==="image"){const a={id:i.id,name:`${i.name}.png`,path:i.path,exported:i.exported?"true":undefined};if(i.scaleOption===1){a.scale="9grid";a.scale9grid=i.scale9.slice(0,4);}else if(i.scaleOption===2)a.scale="tile";out.push(`    <image${attrs(a)}/>`);}else if(i.type==="component")out.push(`    <component${attrs({id:i.id,name:`${i.name}.xml`,path:i.path,exported:i.exported?"true":undefined})}/>`);}
  out.push(`  </resources>`,`  <publish${attrs({name:pkg.name,packageCount:1})}>`);pkg.items.filter(i=>i.type==="atlas").forEach((i,n)=>out.push(`    <atlas${attrs({name:i.id||`atlas${n}`,index:n})}/>`));out.push(`  </publish>`,`</packageDescription>`,"");return out.join("\n");}
function childAttrs(ch){const a={id:ch.id,name:ch.name,src:ch.src,pkg:ch.pkg,xy:ch.xy,size:ch.size,scale:ch.scale,skew:ch.skew,pivot:ch.pivot?.slice(0,2),pivotAsAnchor:ch.pivot?.[2]?"true":undefined,alpha:ch.alpha!==1?num(ch.alpha):undefined,rotation:ch.rotation?num(ch.rotation):undefined,visible:ch.visible===false?"false":undefined,touchable:ch.touchable===false?"false":undefined,grayed:ch.grayed?"true":undefined,group:ch.group,tooltips:ch.tooltips,customData:ch.data};
  if(ch.type==="image"){if(ch.color)a.color=hex(ch.color);if(ch.flip)a.flip=E.flip[ch.flip];}
  else if(ch.type==="loader"){a.url=ch.url;if(ch.align)a.align=E.align[ch.align];if(ch.vAlign)a.vAlign=E.vAlign[ch.vAlign];if(ch.loaderFill)a.fill=E.fill[ch.loaderFill];if(ch.shrink)a.shrinkOnly="true";if(ch.auto)a.autoSize="true";if(ch.playing===false)a.playing="false";if(ch.frame)a.frame=ch.frame;if(ch.color)a.color=hex(ch.color);}
  else if(ch.type==="group"){if(ch.layout)a.layout=E.group[ch.layout];if(ch.lineGap)a.lineGap=ch.lineGap;if(ch.columnGap)a.columnGap=ch.columnGap;if(ch.exclude)a.excludeInvisibles="true";if(ch.autoSizeDisabled)a.autoSizeDisabled="true";a.advanced="true";}
  else if(["text","richtext","inputtext"].includes(ch.type)){a.font=ch.font;a.fontSize=ch.fontSize;a.color=hex(ch.color);if(ch.align)a.align=E.align[ch.align];if(ch.vAlign)a.vAlign=E.vAlign[ch.vAlign];if(ch.leading)a.leading=ch.leading;if(ch.letterSpacing)a.letterSpacing=ch.letterSpacing;if(ch.ubb)a.ubb="true";if(ch.textAuto!==1)a.autoSize=E.autoSize[ch.textAuto];if(ch.underline)a.underline="true";if(ch.italic)a.italic="true";if(ch.bold)a.bold="true";if(ch.singleLine)a.singleLine="true";if(ch.stroke){a.strokeColor=hex(ch.stroke.color);a.strokeSize=num(ch.stroke.size);}if(ch.shadow){a.shadowColor=hex(ch.shadow.color,true);a.shadowOffset=ch.shadow.offset.map(num);}a.text=ch.text;}
  else if(ch.type==="list"){if(ch.layout)a.layout=E.listLayout[ch.layout];if(ch.selection)a.selectionMode=E.selection[ch.selection];if(ch.align)a.align=E.align[ch.align];if(ch.vAlign)a.vAlign=E.vAlign[ch.vAlign];if(ch.lineGap)a.lineGap=ch.lineGap;if(ch.columnGap)a.columnGap=ch.columnGap;if(ch.lineCount)a.lineCount=ch.lineCount;if(ch.columnCount)a.columnCount=ch.columnCount;if(ch.autoResize===false)a.autoItemSize="false";if(ch.render)a.renderOrder=E.render[ch.render];if(ch.margin)a.margin=ch.margin;if(ch.overflow)a.overflow=E.overflow[ch.overflow];if(ch.clip)a.clipSoftness=ch.clip;if(ch.fold)a.foldInvisibleItems="true";a.defaultItem=ch.defaultItem;if(ch.scroll)applyScroll(a,ch.scroll);}
  return a;
}
function gearXml(g){if(g.type===0)return`      <gearDisplay${attrs({controller:g.controller,pages:g.pages})}/>`;if(g.type===2)return`      <gearSize${attrs({controller:g.controller,pages:g.states.map(s=>s.page),values:g.states.map(s=>s.value.map(num).join(",")).join("|"),default:g.default?.map(num),tween:g.tween?"true":undefined})}/>`;if(g.type===7)return`      <gearText${attrs({controller:g.controller,pages:g.states.map(s=>s.page),values:g.states.map(s=>s.value).join("|"),default:g.default})}/>`;return`      <!-- Unsupported gear type ${g.type}; see recovery_report.json. -->`;}
function relationXml(r,children){return`      <relation${attrs({target:r.targetIndex===-1?"":children[r.targetIndex]?.id||r.target,sidePair:r.definitions.map(d=>d.name),percent:r.definitions.some(d=>d.percent)?"true":undefined})}/>`;}
function componentXml(item){const c=item.component,a={size:[c.width,c.height],pivot:c.pivot?.slice(0,2),overflow:c.overflow?E.overflow[c.overflow]:undefined,margin:c.margin,clipSoftness:c.clip,opaque:c.opaque===false?"false":undefined};if(c.scroll)applyScroll(a,c.scroll);const out=['<?xml version="1.0" encoding="utf-8"?>',`<!-- Recovered from compiled FGUI binary v${item.raw.v}; editor-only metadata may be unavailable. -->`,`<component${attrs(a)}>`];
  for(const ctrl of c.controllers){const pages=ctrl.pages.flatMap(p=>[p.id,p.name]);let selected=ctrl.pages[0]?.id;if(ctrl.homeType===1)selected=ctrl.pages[ctrl.homeIndex]?.id;out.push(`  <controller${attrs({name:ctrl.name,pages,selected,autoRadioGroupDepth:ctrl.autoDepth?"true":undefined})}/>`);}
  out.push(`  <displayList>`);for(const ch of c.children){const nested=[...ch.gears.map(gearXml),...ch.relations.map(r=>relationXml(r,c.children)),...ch.assignments.map(v=>`      <controller${attrs({name:v.controller,page:v.page})}/>`),...ch.overrides.map(v=>`      <property${attrs(v)}/>`),...(ch.items||[]).map(v=>`      <item${attrs(v)}/>` )];if(nested.length){out.push(`    <${ch.type}${attrs(childAttrs(ch))}>`,...nested,`    </${ch.type}>`);}else out.push(`    <${ch.type}${attrs(childAttrs(ch))}/>`);}out.push(`  </displayList>`);if(c.transitions.length)out.push(`  <!-- ${c.transitions.length} transition(s) kept as raw data in recovery_report.json. -->`);out.push(`</component>`,"");return out.join("\n");}
function clean(pkg,source){return{source,format:{magic:"FGUI",version:pkg.version,compressed:pkg.compressed},package:{id:pkg.id,name:pkg.name,dependencies:pkg.dependencies},counts:{items:pkg.items.length,images:pkg.items.filter(i=>i.type==="image").length,components:pkg.items.filter(i=>i.type==="component").length,atlases:pkg.items.filter(i=>i.type==="atlas").length,sprites:pkg.sprites.length},items:pkg.items.map(i=>{const v={...i};delete v.raw;return v;}),sprites:pkg.sprites,limitations:["Compiled FGUI binaries do not retain every editor-only field, so byte-identical original XML cannot be guaranteed.","Component hierarchy, controllers, object properties, lists, relations, common gears and atlas sprite metadata were recovered from runtime data.","Controller actions, transitions and unsupported gear types remain as raw data in this report."]};}
function main(){const source=path.resolve(process.argv[2]),outDir=path.resolve(process.argv[3]);fs.mkdirSync(outDir,{recursive:true});const pkg=parsePackage(source);fs.writeFileSync(path.join(outDir,"package.xml"),packageXml(pkg),"utf8");for(const item of pkg.items.filter(i=>i.type==="component"))fs.writeFileSync(path.join(outDir,`${item.name}.xml`),componentXml(item),"utf8");
  const byId=new Map(pkg.items.map(i=>[i.id,i]));const atlas=['<?xml version="1.0" encoding="utf-8"?>',`<atlasSprites${attrs({package:pkg.name,packageId:pkg.id})}>`,...pkg.sprites.map(s=>`  <sprite${attrs({id:s.itemId,name:byId.get(s.itemId)?.name,atlas:s.atlasId,rect:s.rect,rotated:s.rotated?"true":undefined,originalRect:s.original})}/>`),`</atlasSprites>`,""].join("\n");fs.writeFileSync(path.join(outDir,"atlas_sprites.xml"),atlas,"utf8");
  fs.writeFileSync(path.join(outDir,"recovery_report.json"),JSON.stringify(clean(pkg,source),null,2),"utf8");const components=pkg.items.filter(i=>i.type==="component").map(i=>i.name);const readme=[`# ${pkg.name} FairyGUI XML Recovery`,"",`- Source: \`${source}\``,`- Package ID: \`${pkg.id}\``,`- Binary version: \`${pkg.version}\``,`- Dependency: ${pkg.dependencies.map(d=>`\`${d.name} (${d.id})\``).join(", ")||"none"}`,`- Resources: ${components.length} components, ${pkg.items.filter(i=>i.type==="image").length} images, ${pkg.sprites.length} atlas sprites`,"","## Files","","- `package.xml`: recovered package resource list.",...components.map(n=>`- \`${n}.xml\`: recovered component configuration.`),"- `atlas_sprites.xml`: sprite rectangles, rotation and trimming metadata.","- `recovery_report.json`: full parsed data and raw unsupported fields.","","## Limitation","","The output is a runtime-semantic recovery. Compiled `.bin` data omits some FairyGUI editor-only metadata, so it cannot guarantee byte-for-byte identity with the original project XML.",""].join("\n");fs.writeFileSync(path.join(outDir,"README.md"),readme,"utf8");console.log(JSON.stringify({package:pkg.name,packageId:pkg.id,version:pkg.version,outputDirectory:outDir,components:components.length,images:pkg.items.filter(i=>i.type==="image").length,sprites:pkg.sprites.length},null,2));}
main();


