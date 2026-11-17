// All geometry is surface-local. A missing extension keeps legacy hosts usable;
// fixed-screen safeArea is deliberately never reinterpreted as local padding.
const zero={top:0,right:0,bottom:0,left:0}
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value))
const area=rect=>rect.width*rect.height
function intersect(a,b){const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),right=Math.min(a.x+a.width,b.x+b.width),bottom=Math.min(a.y+a.height,b.y+b.height);return right>x&&bottom>y?{x,y,width:right-x,height:bottom-y}:null}
function available(rect,regions){
  let panes=[rect]
  for(const obstacle of regions){const next=[];for(const pane of panes){const hit=intersect(pane,obstacle);if(!hit){next.push(pane);continue}
    // The candidates may overlap each other; each is independently unobstructed.
    // Keeping maximal candidates lets a small camera cutout preserve the large
    // rectangle below it instead of fragmenting the entire scroll viewport.
    for(const candidate of [{x:pane.x,y:pane.y,width:hit.x-pane.x,height:pane.height},{x:hit.x+hit.width,y:pane.y,width:pane.x+pane.width-hit.x-hit.width,height:pane.height},{x:pane.x,y:pane.y,width:pane.width,height:hit.y-pane.y},{x:pane.x,y:hit.y+hit.height,width:pane.width,height:pane.y+pane.height-hit.y-hit.height}])if(candidate.width>0&&candidate.height>0)next.push(candidate)
  }panes=next}
  return panes.sort((a,b)=>area(b)-area(a)||a.x-b.x||a.y-b.y)
}
function pageLayout(width,height,layout){
  const host=layout&&layout.version===1?layout:null,insets={...zero,...(host?host.safeInsets:{})}
  for(const key of Object.keys(zero))insets[key]=clamp(finite(insets[key]),0,key==='top'||key==='bottom'?height:width)
  insets.right=Math.min(insets.right,Math.max(0,width-insets.left));insets.bottom=Math.min(insets.bottom,Math.max(0,height-insets.top))
  const bounds={x:0,y:0,width,height},regions=(host&&Array.isArray(host.reservedRegions)?host.reservedRegions:[]).filter(r=>r&&['occlusion','division'].includes(r.kind)&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0).map(r=>({...intersect(bounds,r),kind:r.kind})).filter(r=>r.width>0&&r.height>0)
  const edge=host&&['left','right'].includes(host.verticalBarEdge)?host.verticalBarEdge:'none',sideNavigation=edge!=='none'
  const safe={x:insets.left,y:insets.top,width:Math.max(0,width-insets.left-insets.right),height:Math.max(0,height-insets.top-insets.bottom)}
  const railWidth=sideNavigation?Math.min(96,Math.max(72,insets[edge]),width):0,railBounds={x:edge==='left'?0:width-railWidth,y:insets.top,width:railWidth,height:Math.max(0,height-insets.top-insets.bottom)}
  if(edge==='left'){const right=safe.x+safe.width;safe.x=Math.max(safe.x,railWidth);safe.width=Math.max(0,right-safe.x)}
  if(edge==='right')safe.width=Math.max(0,Math.min(safe.x+safe.width,width-railWidth)-safe.x)
  const primary=available(safe,regions)[0]||{...safe,width:0,height:0}
  const division=regions.find(r=>r.kind==='division'&&r.y<=safe.y+.5&&r.y+r.height>=safe.y+safe.height-.5&&r.x-safe.x>=220&&safe.x+safe.width-r.x-r.width>=220)
  const leftPane=division?{x:safe.x,y:safe.y,width:division.x-safe.x,height:safe.height}:null,rightPane=division?{x:division.x+division.width,y:safe.y,width:safe.x+safe.width-division.x-division.width,height:safe.height}:null
  // A second active obstruction must not be crossed by an expanded grid. Fall
  // back to the largest safe pane unless both complete columns are unobstructed.
  const split=division&&!regions.some(r=>r!==division&&(intersect(leftPane,r)||intersect(rightPane,r)))?{left:leftPane.width,right:rightPane.width}:null
  const pane=split?{...primary,y:safe.y,height:safe.height}:primary
  const topbarHeight=Math.min(64,pane.height),navHeight=sideNavigation?0:Math.min(72,Math.max(0,pane.height-topbarHeight))
  const body={x:split?safe.x:pane.x,y:pane.y+topbarHeight,width:split?safe.width:pane.width,height:Math.max(0,pane.height-topbarHeight-navHeight)}
  const rail=sideNavigation?(available(railBounds,regions)[0]||{...railBounds,height:0}):{x:0,y:0,width:0,height:0}
  const railButtonHeight=Math.min(44,rail.height/6),railTop=rail.y+Math.min(8,rail.height/24),railNavY=railTop+railButtonHeight*2+8
  const railNavHeight=Math.max(0,rail.y+rail.height-railNavY-8)
  const contentWidth=Math.max(0,pane.width-40),wideLayout=!!split||contentWidth+40>=600
  const catalogCardWidths=split?[Math.max(0,split.left-40),Math.max(0,split.right-40)]:wideLayout?[Math.max(0,(contentWidth-16)/2),Math.max(0,(contentWidth-16)/2)]:[contentWidth,contentWidth]
  const modalWidth=Math.min(400,Math.max(0,pane.width-32)),modalHeight=Math.min(300,Math.max(0,pane.height-32)),modalActionsHeight=Math.min(72,modalHeight)
  return {width,height,sideNavigation,verticalBarEdge:edge,safeInsets:insets,bodyX:body.x,bodyY:body.y,bodyWidth:body.width,contentHeight:body.height,contentPaneWidth:contentWidth,contentOffset:Math.max(0,pane.x-body.x),topbarHeight,barX:pane.x,barY:pane.y,barWidth:pane.width,navHeight,navX:sideNavigation?rail.x:pane.x,navY:sideNavigation?railNavY:pane.y+pane.height-navHeight,navWidth:sideNavigation?rail.width:pane.width,navLayoutHeight:sideNavigation?railNavHeight:navHeight,railX:rail.x,railY:railTop,railWidth:rail.width,railButtonHeight,wideLayout,foldColumns:!!split,catalogCardWidth:catalogCardWidths[0],catalogCardWidths,catalogWidth:split?Math.max(0,safe.width-40):contentWidth,catalogShift:split&&pane.x!==body.x?body.x-pane.x:0,modalX:pane.x+(pane.width-modalWidth)/2,modalY:pane.y+(pane.height-modalHeight)/2,modalWidth,modalHeight,modalBodyHeight:modalHeight-modalActionsHeight,modalActionsHeight,modalButtonHeight:Math.min(44,modalActionsHeight),hintX:pane.x+Math.min(24,pane.width/2),hintY:Math.max(body.y,body.y+body.height-64),hintWidth:Math.max(0,pane.width-48)}
}
module.exports={pageLayout,available,intersect}
