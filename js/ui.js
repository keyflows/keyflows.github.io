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
export function drawChart(svg,sessions,key,unit){const points=sessions.slice(-14);if(!points.length){svg.innerHTML='<text x="300" y="100" text-anchor="middle">Complete a test to see your progress</text>';return;}const vals=points.map(s=>Number(s[key])||0),max=Math.max(...vals,unit==='%'?100:1),min=Math.min(...vals,0),range=Math.max(1,max-min),coords=vals.map((v,i)=>({x:28+i*544/Math.max(1,vals.length-1),y:160-(v-min)/range*130}));const poly=coords.map(p=>`${p.x},${p.y}`).join(' '),area=`${coords[0].x},160 ${poly} ${coords.at(-1).x},160`;svg.innerHTML=`<line class="grid-line" x1="24" y1="30" x2="576" y2="30"/><line class="grid-line" x1="24" y1="95" x2="576" y2="95"/><line class="grid-line" x1="24" y1="160" x2="576" y2="160"/><text x="4" y="34">${Math.round(max)}</text><text x="4" y="164">${Math.round(min)}</text><polygon class="chart-area" points="${area}"/><polyline class="chart-line" points="${poly}"/>${coords.map((p,i)=>`<circle class="chart-point" cx="${p.x}" cy="${p.y}" r="4"><title>Session ${i+1}: ${vals[i]} ${unit}</title></circle>`).join('')}<text x="24" y="188">Oldest</text><text x="576" y="188" text-anchor="end">Most recent</text>`;}
export function drawResultChart(svg,samples,empty,summary,{durationMs,accuracy:finalAccuracy}={}){
  const points=(Array.isArray(samples)?samples:[]).filter(p=>Number.isFinite(p.timeSeconds)&&Number.isFinite(p.netWpm)&&Number.isFinite(p.rawWpm));
  const duration=Math.max(0,Number(durationMs||0)/1000,points.at(-1)?.timeSeconds||0);
  if(duration<3||points.length<2){
    svg.hidden=true;empty.hidden=false;summary.hidden=true;
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
  const accuracyPoints=points.filter(p=>typeof p.accuracy==='number'&&Number.isFinite(p.accuracy)).map(p=>({...p}));
  if(accuracyPoints.length&&accuracyPoints.at(-1).timeSeconds<duration)accuracyPoints.push({...accuracyPoints.at(-1),timeSeconds:duration,accuracy});
  else if(accuracyPoints.length)accuracyPoints[accuracyPoints.length-1].accuracy=accuracy;
  const accuracyLine=accuracyPoints.map(p=>`${x(p).toFixed(1)},${accuracyY(p.accuracy).toFixed(1)}`).join(' ');
  svg.innerHTML=`<text class="result-axis-title" x="${left}" y="15">PACE · WPM PER INTERVAL</text>${grid}<polyline class="result-series result-net" points="${line('netWpm',paceY)}"/><polyline class="result-series result-raw" points="${line('rawWpm',paceY)}"/><text class="result-axis-title" x="${left}" y="153">CUMULATIVE ACCURACY</text>${accGrid}<polyline class="result-series result-accuracy" points="${accuracyLine}"/><text class="result-axis-label" x="${left}" y="245">0s</text><text class="result-axis-label" x="${right}" y="245" text-anchor="end">${Math.round(duration)}s</text>`;
  svg.hidden=false;empty.hidden=true;summary.hidden=false;
  const minNet=Math.min(...points.map(p=>p.netWpm)),maxNet=Math.max(...points.map(p=>p.netWpm)),minRaw=Math.min(...points.map(p=>p.rawWpm)),maxRaw=Math.max(...points.map(p=>p.rawWpm));
  const sampledThrough=points.at(-1).timeSeconds,unplotted=Math.max(0,duration-sampledThrough);
  const partialNote=unplotted>=.05?` The final ${unplotted.toFixed(1)}-second partial interval has no pace sample and is not plotted.`:'';
  summary.textContent=`Over ${Math.round(duration)} seconds, measured interval net speed ranged from ${Math.round(minNet)} to ${Math.round(maxNet)} WPM and raw speed ranged from ${Math.round(minRaw)} to ${Math.round(maxRaw)} WPM. Accuracy ended at ${Math.round(accuracy)}%. Net WPM subtracts errors; raw WPM does not.${partialNote}`;
  return true;
}
