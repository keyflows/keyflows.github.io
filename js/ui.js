export function renderText(container,text,index,errors=[]){
  const fitLongWords=(force=false)=>{
    const available=container.clientWidth;if(!available||(!force&&container._wrapWidth===available))return;
    container._wrapWidth=available;
    for(const word of container._wordElements||[]){
      const wasLong=word.classList.contains('typing-word-long');if(wasLong)word.classList.remove('typing-word-long');
      const tooWide=word.getBoundingClientRect().width>available+1;
      if(tooWide)word.classList.add('typing-word-long');
    }
  };
  let rebuilt=false;const textChanged=container._renderText!==text;
  if(textChanged){
    const prior=container._renderText||'',canAppend=prior&&text.startsWith(prior),startAt=canAppend?prior.length:0;
    if(!canAppend){container.replaceChildren();container._charElements=[];container._wordElements=[];container.scrollTop=0;container._renderIndex=0;rebuilt=true;}
    const fragment=document.createDocumentFragment();
    let i=startAt;
    if(canAppend&&i<text.length&&/\s/.test(text[i])&&!/\s/.test(text[i-1]||'')){
      const char=document.createElement('span');char.className='char whitespace';char.textContent=text[i];fragment.append(char);container._charElements.push(char);i++;
    }
    while(i<text.length){
      if(/\s/.test(text[i])){
        const char=document.createElement('span');char.className='char whitespace';char.textContent=text[i];fragment.append(char);container._charElements.push(char);i++;continue;
      }
      const word=document.createElement('span');word.className='typing-word';
      let end=i;while(end<text.length&&!/\s/.test(text[end]))end++;
      for(let position=i;position<end;position++){const char=document.createElement('span');char.className='char';char.textContent=text[position];word.append(char);container._charElements.push(char);}
      fragment.append(word);container._wordElements.push(word);i=end;
    }
    container.append(fragment);container._renderText=text;fitLongWords(true);
  }
  const spans=container._charElements||[],old=container._renderIndex??0;
  if(rebuilt||textChanged||old!==index){const start=rebuilt?0:Math.max(0,Math.min(old,index)-1),end=rebuilt?spans.length:Math.min(spans.length,Math.max(old,index)+1);for(let i=start;i<end;i++){const el=spans[i];el.classList.remove('correct','incorrect','current');if(i<index)el.classList.add(errors[i]?'incorrect':'correct');else if(i===index)el.classList.add('current');}}
  container._renderIndex=index;
  const followCursor=()=>{if(container._scrollFrame!==null)return;container._scrollFrame=requestAnimationFrame(()=>{container._scrollFrame=null;fitLongWords();const current=container._charElements?.[container._renderIndex];if(!current)return;const cursor=current.getBoundingClientRect(),viewport=container.getBoundingClientRect(),fontSize=parseFloat(getComputedStyle(container).fontSize)||20,lineHeight=parseFloat(getComputedStyle(container).lineHeight)||34,pad=Math.min(lineHeight*.45,Math.max(6,fontSize*.5));if(cursor.top<viewport.top+pad)container.scrollTop-=viewport.top+pad-cursor.top;else if(cursor.bottom>viewport.bottom-pad)container.scrollTop+=cursor.bottom-(viewport.bottom-pad);});};
  if(container._scrollFrame===undefined)container._scrollFrame=null;
  if((rebuilt||textChanged||old!==index)&&index<spans.length)followCursor();
  if(!container._cursorResizeObserver&&'ResizeObserver'in window){container._cursorResizeObserver=new ResizeObserver(followCursor);container._cursorResizeObserver.observe(container);}
}
export function toast(message){const region=document.querySelector('#toast-region'),el=document.createElement('div');el.className='toast';el.textContent=message;region.append(el);setTimeout(()=>el.remove(),3200);}
export function openDialog(id){const d=document.getElementById(id);if(d&&!d.open)d.showModal();}
export function closeDialog(id){const d=document.getElementById(id);if(d?.open)d.close();}
export function drawChart(svg,sessions,key,unit,summary){
  const points=sessions.slice(-14),isAccuracy=unit==='%',label=isAccuracy?'accuracy':'net WPM';
  const help=svg.parentElement?.querySelector('.chart-interaction-help');
  if(!points.length){svg.innerHTML='<text x="300" y="100" text-anchor="middle">Complete a test to see your progress</text>';svg._resultChartState=null;svg.setAttribute('tabindex','-1');svg.setAttribute('aria-describedby',summary.id);summary.hidden=false;summary.textContent='No completed tests to inspect yet.';if(help)help.hidden=true;return;}
  const values=points.map(s=>Number(s[key])||0),max=Math.max(...values,isAccuracy?100:1),min=Math.min(...values,0),range=Math.max(1,max-min),coords=values.map((v,i)=>({x:28+i*544/Math.max(1,values.length-1),y:160-(v-min)/range*130}));
  const poly=coords.map(p=>`${p.x},${p.y}`).join(' '),area=`${coords[0].x},160 ${poly} ${coords.at(-1).x},160`;
  svg.setAttribute('viewBox','0 0 600 222');
  svg.innerHTML=`<line class="grid-line" x1="24" y1="30" x2="576" y2="30"/><line class="grid-line" x1="24" y1="95" x2="576" y2="95"/><line class="grid-line" x1="24" y1="160" x2="576" y2="160"/><text x="4" y="34">${Math.round(max)}</text><text x="4" y="164">${Math.round(min)}</text><line class="result-focus-line" x1="28" y1="30" x2="28" y2="180" visibility="hidden"/><polygon class="chart-area" points="${area}"/><polyline class="chart-line" points="${poly}"/>${coords.map((p,i)=>`<circle class="chart-point" data-sample-index="${i}" cx="${p.x}" cy="${p.y}" r="4"><title>Test ${i+1}: ${values[i]} ${unit}</title></circle>`).join('')}<text x="24" y="188">Oldest</text><text x="576" y="188" text-anchor="end">Most recent</text><g class="chart-sample-callout" visibility="hidden" aria-hidden="true"><path class="chart-callout-pointer" d="M 88 194 L 93 186 L 98 194 Z"/><rect x="0" y="193" width="186" height="22" rx="6"/><text x="93" y="208" text-anchor="middle"></text></g>`;
  svg.setAttribute('tabindex','0');svg.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home End');svg.setAttribute('aria-describedby',summary.id);summary.hidden=false;if(help){help.hidden=false;help.textContent='Move over a point to highlight a test. Click or touch to keep it selected; focus the chart and use the arrow keys to inspect points.';}
  const statePoints=points.map((session,i)=>({...session,timeSeconds:i}));
  const hint='Move over a point to highlight a test, or focus the chart and use the arrow keys.';
  const select=(index,{announce=true,pin=false}={})=>{const session=points[index],point=coords[index];if(!session||!point)return;if(state.selectedIndex===index&&!announce){if(pin)state.pinnedIndex=index;return;}state.selectedIndex=index;if(pin)state.pinnedIndex=index;svg.querySelectorAll('[data-sample-index]').forEach(marker=>marker.classList.toggle('is-selected',Number(marker.dataset.sampleIndex)===index));const focus=svg.querySelector('.result-focus-line');focus.setAttribute('x1',point.x);focus.setAttribute('x2',point.x);focus.setAttribute('visibility','visible');const date=Number.isFinite(Date.parse(session.date))?new Date(session.date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):`Test ${index+1}`;summary.setAttribute('aria-live',announce?'polite':'off');summary.textContent=`${date} · ${label}: ${isAccuracy?`${Math.round(values[index])}%`:`${Math.round(values[index])} WPM`}. Test ${index+1} of ${points.length}.`;const callout=svg.querySelector('.chart-sample-callout'),calloutText=callout?.querySelector('text'),calloutWidth=186,calloutX=Math.max(28,Math.min(572-calloutWidth,point.x-calloutWidth/2)),anchor=Math.max(8,Math.min(calloutWidth-8,point.x-calloutX));if(callout){callout.setAttribute('transform',`translate(${calloutX},0)`);callout.querySelector('.chart-callout-pointer')?.setAttribute('d',`M ${anchor-5} 194 L ${anchor} 186 L ${anchor+5} 194 Z`);calloutText.textContent=`${date.split(',')[0]} · ${Math.round(values[index])} ${isAccuracy?'%':'WPM'}`;callout.setAttribute('visibility','visible');}};
  const clear=()=>{state.selectedIndex=-1;svg.querySelectorAll('[data-sample-index]').forEach(marker=>marker.classList.remove('is-selected'));svg.querySelector('.result-focus-line')?.setAttribute('visibility','hidden');svg.querySelector('.chart-sample-callout')?.setAttribute('visibility','hidden');summary.setAttribute('aria-live','off');summary.textContent=hint;};
  const state={points:statePoints,left:28,right:572,duration:Math.max(0,statePoints.length-1),selectedIndex:-1,pinnedIndex:-1,summary,hint,select,clear};svg._resultChartState=state;summary.textContent=hint;bindResultChartInteractions(svg);
}
function bindResultChartInteractions(svg){
  if(svg._resultChartInteractionsBound)return;
  svg._resultChartInteractionsBound=true;
  const nearestIndex=(event,state)=>{
    const marker=event.target.closest?.('[data-sample-index]');
    if(marker)return Number(marker.dataset.sampleIndex);
    const bounds=svg.getBoundingClientRect(),viewBox=svg.viewBox.baseVal;
    const graphX=(event.clientX-bounds.left)*viewBox.width/Math.max(1,bounds.width);
    const time=Math.max(0,Math.min(1,(graphX-state.left)/(state.right-state.left)))*state.duration;
    return state.points.reduce((best,p,i)=>Math.abs(p.timeSeconds-time)<Math.abs(state.points[best].timeSeconds-time)?i:best,0);
  };
  svg.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    const state=svg._resultChartState;if(state)state.select(nearestIndex(event,state),{announce:false});
  });
  svg.addEventListener('pointerleave',()=>{
    const state=svg._resultChartState;if(!state)return;
    if(state.pinnedIndex>=0)state.select(state.pinnedIndex,{announce:false});else state.clear();
  });
  svg.addEventListener('click',event=>{
    const state=svg._resultChartState;if(!state)return;
    state.select(nearestIndex(event,state),{announce:true,pin:true});
  });
  svg.addEventListener('keydown',event=>{
    const state=svg._resultChartState;if(!state)return;
    let index=state.selectedIndex;
    if(event.key==='ArrowRight')index=index<0?0:Math.min(state.points.length-1,index+1);
    else if(event.key==='ArrowLeft')index=index<0?state.points.length-1:Math.max(0,index-1);
    else if(event.key==='Home')index=0;
    else if(event.key==='End')index=state.points.length-1;
    else return;
    event.preventDefault();state.select(index,{announce:true,pin:true});
  });
}
export function drawResultChart(svg,samples,empty,summary,{durationMs,accuracy:finalAccuracy,selection,help}={}){
  help=help||svg.parentElement?.querySelector('#result-chart-help');
  const points=(Array.isArray(samples)?samples:[]).filter(p=>Number.isFinite(p.timeSeconds)&&Number.isFinite(p.netWpm)&&Number.isFinite(p.rawWpm));
  const duration=Math.max(0,Number(durationMs||0)/1000,points.at(-1)?.timeSeconds||0);
  if(duration<3||points.length<2){
    svg.hidden=true;empty.hidden=false;summary.hidden=true;if(selection)selection.hidden=true;if(help)help.hidden=true;svg._resultChartState=null;svg.setAttribute('tabindex','-1');
    empty.textContent='This run did not collect two pace samples (usually about 3 seconds of typing). Try a longer test to see your pace and accuracy over time.';
    summary.textContent=empty.textContent;
    return false;
  }

  const accuracy=typeof finalAccuracy==='number'&&Number.isFinite(finalAccuracy)?finalAccuracy:(typeof points.at(-1).accuracy==='number'?points.at(-1).accuracy:0);
  const left=62,right=630,paceTop=29,paceBottom=126,accuracyTop=167,accuracyBottom=218;
  const x=p=>left+Math.max(0,Math.min(1,p.timeSeconds/duration))*(right-left);
  const speedValues=points.flatMap(p=>[p.netWpm,p.rawWpm]);
  const speedMax=Math.max(10,Math.ceil(Math.max(...speedValues)/10)*10);
  const paceY=value=>paceBottom-Math.max(0,Math.min(1,value/speedMax))*(paceBottom-paceTop);
  const accuracyY=value=>accuracyBottom-Math.max(0,Math.min(100,value))*(accuracyBottom-accuracyTop)/100;
  const line=(key,scale)=>points.map(p=>`${x(p).toFixed(1)},${scale(p[key]).toFixed(1)}`).join(' ');
  const grid=[0,.5,1].map(f=>{
    const y=paceBottom-f*(paceBottom-paceTop),label=Math.round(speedMax*f);
    return `<line class="result-grid" x1="${left}" y1="${y}" x2="${right}" y2="${y}"/><text class="result-axis-label" x="${left-9}" y="${y+4}" text-anchor="end">${label}</text>`;
  }).join('');
  const accGrid=[0,.5,1].map(f=>{
    const y=accuracyBottom-f*(accuracyBottom-accuracyTop),label=`${Math.round(f*100)}%`;
    return `<line class="result-grid result-grid-soft" x1="${left}" y1="${y}" x2="${right}" y2="${y}"/><text class="result-axis-label" x="${left-9}" y="${y+4}" text-anchor="end">${label}</text>`;
  }).join('');
  const accuracyPoints=points.map((p,sampleIndex)=>({...p,sampleIndex})).filter(p=>typeof p.accuracy==='number'&&Number.isFinite(p.accuracy));
  if(accuracyPoints.length&&accuracyPoints.at(-1).timeSeconds<duration)accuracyPoints.push({...accuracyPoints.at(-1),timeSeconds:duration,accuracy});
  else if(accuracyPoints.length)accuracyPoints[accuracyPoints.length-1].accuracy=accuracy;
  const accuracyLine=accuracyPoints.map(p=>`${x(p).toFixed(1)},${accuracyY(p.accuracy).toFixed(1)}`).join(' ');
  const markers=points.map((p,i)=>`<circle class="result-point result-net-point" data-sample-index="${i}" cx="${x(p).toFixed(1)}" cy="${paceY(p.netWpm).toFixed(1)}" r="3.2"/><circle class="result-point result-raw-point" data-sample-index="${i}" cx="${x(p).toFixed(1)}" cy="${paceY(p.rawWpm).toFixed(1)}" r="3.2"/>`).join('')+accuracyPoints.map(p=>`<circle class="result-point result-accuracy-point" data-sample-index="${p.sampleIndex}" cx="${x(p).toFixed(1)}" cy="${accuracyY(p.accuracy).toFixed(1)}" r="3.2"/>`).join('');
  svg.setAttribute('viewBox','0 0 660 284');
  svg.innerHTML=`<text class="result-axis-title" x="${left}" y="15">PACE · WPM PER INTERVAL</text>${grid}<line class="result-focus-line" x1="${left}" y1="${paceTop}" x2="${left}" y2="249" visibility="hidden"/><polyline class="result-series result-net" points="${line('netWpm',paceY)}"/><polyline class="result-series result-raw" points="${line('rawWpm',paceY)}"/><text class="result-axis-title" x="${left}" y="153">CUMULATIVE ACCURACY</text>${accGrid}<polyline class="result-series result-accuracy" points="${accuracyLine}"/>${markers}<text class="result-axis-label" x="${left}" y="245">0s</text><text class="result-axis-label" x="${right}" y="245" text-anchor="end">${Math.round(duration)}s</text><g class="result-sample-callout" visibility="hidden" aria-hidden="true"><path class="result-callout-pointer" d="M 275 253 L 280 247 L 285 253 Z"/><rect x="0" y="251" width="220" height="24" rx="7"/><text x="110" y="267" text-anchor="middle"></text></g>`;
  svg.setAttribute('tabindex','0');svg.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight Home End');
  if(help){help.hidden=false;help.textContent='Move over the graph to highlight a sample. Click or touch to keep it selected; focus the graph and use the arrow keys to inspect points.';}
  if(selection){selection.hidden=false;selection.textContent='No pace sample selected.';}
  const select=(index,{announce=true,pin=false}={})=>{
    const selected=points[index];if(!selected)return;
    if(state.selectedIndex===index&&!announce){if(pin)state.pinnedIndex=index;return;}
    state.selectedIndex=index;if(pin)state.pinnedIndex=index;
    svg.querySelectorAll('[data-sample-index]').forEach(marker=>marker.classList.toggle('is-selected',Number(marker.dataset.sampleIndex)===index));
    const focus=svg.querySelector('.result-focus-line'),focusX=x(selected);focus.setAttribute('x1',focusX);focus.setAttribute('x2',focusX);focus.setAttribute('visibility','visible');
    if(selection){selection.setAttribute('aria-live',announce?'polite':'off');selection.textContent=`At ${selected.timeSeconds.toFixed(1)} seconds: net pace ${Math.round(selected.netWpm)} WPM, raw pace ${Math.round(selected.rawWpm)} WPM, cumulative accuracy ${Math.round(selected.accuracy||0)}%.`;}const callout=svg.querySelector('.result-sample-callout'),calloutWidth=220,calloutX=Math.max(left,Math.min(right-calloutWidth,focusX-calloutWidth/2)),anchor=Math.max(8,Math.min(calloutWidth-8,focusX-calloutX));if(callout){callout.setAttribute('transform',`translate(${calloutX},0)`);callout.querySelector('.result-callout-pointer')?.setAttribute('d',`M ${anchor-5} 253 L ${anchor} 247 L ${anchor+5} 253 Z`);callout.querySelector('text').textContent=`${selected.timeSeconds.toFixed(1)}s · net ${Math.round(selected.netWpm)} · raw ${Math.round(selected.rawWpm)} · ${Math.round(selected.accuracy||0)}%`;callout.setAttribute('visibility','visible');}svg.querySelectorAll(`[data-sample-index="${index}"]`).forEach(marker=>marker.classList.add('is-selected'));
  };
  const clear=()=>{state.selectedIndex=-1;svg.querySelectorAll('[data-sample-index]').forEach(marker=>marker.classList.remove('is-selected'));svg.querySelector('.result-focus-line')?.setAttribute('visibility','hidden');svg.querySelector('.result-sample-callout')?.setAttribute('visibility','hidden');if(selection){selection.setAttribute('aria-live','off');selection.textContent='No pace sample selected.';}};
  const state={points,left,right,duration,selectedIndex:-1,pinnedIndex:-1,select,clear};svg._resultChartState=state;bindResultChartInteractions(svg);
  svg.hidden=false;empty.hidden=true;summary.hidden=false;
  const minNet=Math.min(...points.map(p=>p.netWpm)),maxNet=Math.max(...points.map(p=>p.netWpm)),minRaw=Math.min(...points.map(p=>p.rawWpm)),maxRaw=Math.max(...points.map(p=>p.rawWpm));
  const sampledThrough=points.at(-1).timeSeconds,unplotted=Math.max(0,duration-sampledThrough);
  const partialNote=unplotted>=.05?` The final ${unplotted.toFixed(1)}-second partial interval has no pace sample and is not plotted.`:'';
  summary.textContent=`Over ${Math.round(duration)} seconds, measured interval net speed ranged from ${Math.round(minNet)} to ${Math.round(maxNet)} WPM and raw speed ranged from ${Math.round(minRaw)} to ${Math.round(maxRaw)} WPM. Accuracy ended at ${Math.round(accuracy)}%. Net WPM subtracts errors; raw WPM does not.${partialNote}`;
  return true;
}
