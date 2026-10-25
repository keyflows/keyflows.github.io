import {JourneyEngine,normalizeEventTimestamp} from './game-engine.js?v=1.0.3';
import {chooseJourneyPassage,getJourneyOptions,getJourneyGame,getGardenBloomCount} from './game-content.js?v=1.0.5';
import {drawJourneyGraph} from './game-result-graph.js?v=1.0.0';
import {createVirtualKeyboard,flashVirtualKey,clearVirtualKey} from './virtual-keyboard.js?v=1.0.0';
import {renderText,openDialog,closeDialog} from './ui.js?v=1.4.1';
import {calculateStats,dailyKey,formatDuration} from './statistics.js?v=1.3.0';
import {analyzeSessions} from './adaptive-practice.js?v=1.1.9';
import {playTypingSound} from './typing-sound.js?v=1.0.0';

const INTERRUPTED_KEY='keyflows.game.interrupted';
const TERMINAL=new Set(['completed','incomplete','discarded']);
const $=selector=>document.querySelector(selector);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function renderJourneyPassage(container,snapshot){
  const errors=snapshot.entries.map((entry,index)=>entry!==null&&entry!==snapshot.text[index]);
  renderText(container,snapshot.text,snapshot.index,errors,snapshot.routeIndex);
}

export function createJourneyGame({getData,onSave=()=>true,onCertificate=()=>{},onSettingsChange=()=>{},onNextPractice=()=>{}}={}){
  let passage=null,previewPassage=null,engine,lastSnapshot=null,scenePath=null,scenePathId=null,pathLength=0,keyboardMap=null,recentPassageIds=[],currentDurationMs=null,lastStage=-1,lastWordCount=0,sessionSaved=false,composing=false,initialized=false,currentGameId='journey';
  const card=$('#journey-card'),setupPanel=$('#journey-setup'),playPanel=$('#journey-play'),resultPanel=$('#journey-result'),input=$('#journey-input'),passageNode=$('#journey-passage'),keyboard=$('#journey-keyboard');
  const data=()=>getData?.()||{settings:{}};
  const settings=()=>data().settings||{};
  function setSettings(patch){if(typeof onSettingsChange==='function')onSettingsChange(patch);}
  function populateOptions(){
    const options=getJourneyOptions();
    $('#journey-context').replaceChildren(...options.contexts.map(item=>new Option(item.label,item.value)));
    $('#journey-level').replaceChildren(...options.levels.map(item=>new Option(item.label,item.value)));
    $('#journey-context').value='random';$('#journey-level').value='easy';
    const saved=settings().gameId;selectGame(['journey','garden'].includes(saved)?saved:'journey');
  }
  function selectGame(id){
    currentGameId=['journey','garden'].includes(id)?id:'journey';const game=getJourneyGame(currentGameId);card.dataset.game=currentGameId;
    $('#journey-game-choices').querySelectorAll('[data-game-choice]').forEach(button=>{const selected=button.dataset.gameChoice===currentGameId;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));});
    // SVGElement.hidden is not consistently reflected by all browsers. Toggle
    // the actual attribute so exactly one world is painted and exposed to AT.
    $('#journey-scene').toggleAttribute('hidden',currentGameId!=='journey');$('#garden-scene').toggleAttribute('hidden',currentGameId!=='garden');
    $('#journey-state').textContent=currentGameId==='garden'?'The garden is ready to bloom.':'The train is waiting at the station.';
    $('#journey-setup-title').textContent=currentGameId==='garden'?'Choose a garden passage':'Choose a journey passage';
    $('#journey-setup-description').textContent=currentGameId==='garden'?'Complete each word to bloom another flower. Fix mistakes with Backspace; the optional timer keeps running.':'Type each character to move the train toward the lighthouse. Fix mistakes with Backspace; the optional timer keeps running.';
    $('#journey-focus-prompt').textContent=currentGameId==='garden'?'Click the passage, then type to bloom flowers':'Click the passage, then type to move the train';$('#journey-focus-prompt').setAttribute('aria-label',currentGameId==='garden'?'Focus the passage to bloom flowers':'Focus the passage to ride the train');$('#journey-start').innerHTML=currentGameId==='garden'?'Start Garden Bloom <span>→</span>':'Start the journey <span>→</span>';
    $('#journey-progress-label').textContent=currentGameId==='garden'?'GARDEN GROWTH':'TRAIN PROGRESS';
    if(currentGameId==='journey')$('#journey-svg-title').textContent=game.name;else $('#garden-svg-title').textContent=game.name;
    setSettings({gameId:currentGameId});resetScene();updatePassagePreview();
  }
  function loadPreferences(){
    const prefs=settings();
    $('#journey-keyboard-toggle').checked=prefs.gameKeyboardVisible!==false;
    $('#journey-focus-toggle').checked=prefs.gameFocusMode===true;
    $('#journey-motion-toggle').checked=prefs.gameReduceMotion===true||matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.classList.toggle('focus-mode',$('#journey-focus-toggle').checked);
    card.classList.toggle('reduce-effects',$('#journey-motion-toggle').checked);
    keyboard.hidden=!$('#journey-keyboard-toggle').checked;
    $('#journey-keyboard-visibility').textContent=keyboard.hidden?'Show keys':'Hide keys';
    $('#journey-keyboard-visibility').setAttribute('aria-expanded',String(!keyboard.hidden));
  }
  function setNotice(message='',error=false){
    const node=$('#journey-error-hint');node.textContent=message;node.hidden=!message;node.classList.toggle('is-warning',!error);node.classList.toggle('is-error',error);if(message)$('#journey-announcement').textContent=message;
  }
  function initialize(){
    if(initialized)return;initialized=true;populateOptions();keyboardMap=createVirtualKeyboard(keyboard);loadPreferences();
    const engineRef=engine=new JourneyEngine({onUpdate:renderState,onComplete:finishRound});
    const active=(()=>{try{return sessionStorage.getItem(INTERRUPTED_KEY)==='1';}catch{return false;}})();
    if(active){$('#game-interrupted').hidden=false;try{sessionStorage.removeItem(INTERRUPTED_KEY);}catch{}}
    $('#journey-start').addEventListener('click',startJourney);
    $('#journey-game-choices').addEventListener('click',event=>{const button=event.target.closest('[data-game-choice]');if(button&&!passage)selectGame(button.dataset.gameChoice);});
    $('#journey-passage-panel').addEventListener('click',()=>{if(passage&&!TERMINAL.has(engine.status))input.focus({preventScroll:true});});
    $('#journey-focus-prompt').addEventListener('click',()=>input.focus({preventScroll:true}));
    $('#journey-pause').addEventListener('click',togglePause);
    $('#journey-restart').addEventListener('click',restartJourney);
    $('#journey-exit').addEventListener('click',confirmExit);
    $('#journey-exit-resume').addEventListener('click',resumeFromExit);
    $('#journey-exit-discard').addEventListener('click',discardAndExit);
    $('#journey-again').addEventListener('click',restartJourney);
    $('#journey-new').addEventListener('click',chooseAnother);
    $('#journey-surprise').addEventListener('click',()=>{chooseAnother();$('#journey-context').value='random';updatePassagePreview();startJourney();});
    $('#journey-switch-world').addEventListener('click',()=>{chooseAnother();selectGame(currentGameId==='journey'?'garden':'journey');$('#journey-start').focus({preventScroll:true});});
    $('#journey-celebrate-again').addEventListener('click',replayCelebration);
    $('#journey-more-stats').addEventListener('click',toggleMoreStats);
    $('#journey-title-help').addEventListener('click',toggleJourneyTitleHelp);
    $('#journey-next-practice').addEventListener('click',()=>onNextPractice());
    $('#journey-keyboard-visibility').addEventListener('click',toggleKeyboard);
    $('#journey-keyboard-toggle').addEventListener('change',event=>{setSettings({gameKeyboardVisible:event.target.checked});loadPreferences();});
    $('#journey-focus-toggle').addEventListener('change',event=>{setSettings({gameFocusMode:event.target.checked});loadPreferences();});
    $('#journey-motion-toggle').addEventListener('change',event=>{setSettings({gameReduceMotion:event.target.checked});loadPreferences();});
    $('#journey-context').addEventListener('change',updatePassagePreview);
    $('#journey-level').addEventListener('change',updatePassagePreview);
    input.addEventListener('compositionstart',()=>{composing=true;});
    input.addEventListener('compositionend',event=>{composing=false;if(event.data)typeText(event.data,normalizeEventTimestamp(event.timeStamp),false);input.value='';});
    input.addEventListener('keydown',handleKeydown);
    input.addEventListener('beforeinput',handleBeforeInput);
    input.addEventListener('paste',blockPaste);
    input.addEventListener('drop',blockPaste);
    input.addEventListener('input',event=>{if(!composing&&event.target.value){typeText(event.target.value,normalizeEventTimestamp(event.timeStamp),false);event.target.value='';}});
    document.addEventListener('visibilitychange',handleVisibility);
    window.addEventListener('blur',handleBlur);
    window.addEventListener('beforeunload',handleUnload);
    const dialog=$('#journey-exit-dialog');dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog('journey-exit-dialog');});
    resetScene();
  }
  function updatePassagePreview(){
    if(passage)return;
    previewPassage=chooseJourneyPassage({context:$('#journey-context').value,difficulty:$('#journey-level').value,excludeIds:recentPassageIds});
    const text=previewPassage?.text||'Choose another theme or complexity to find a passage.';
    const wordCount=previewPassage?.text.trim().split(/\s+/).length||0;
    const minutes=Math.max(1,Math.ceil(wordCount/20));
    $('#journey-preview-text').textContent=text;
    $('#journey-preview-meta').textContent=previewPassage?`${wordCount} words · About ${minutes} min at 20 WPM`:'';
  }
  function beginPassage(selected){
    passage=selected;sessionSaved=false;lastStage=0;lastWordCount=0;currentDurationMs=Number($('#journey-timer-choice').value)>0?Number($('#journey-timer-choice').value)*1000:null;
    card.classList.add('is-in-round');
    input.value='';input.disabled=false;passageNode.classList.remove('is-started');$('#journey-passage-accessible').textContent=selected.text;
    $('#journey-context').disabled=true;$('#journey-level').disabled=true;$('#journey-timer-choice').disabled=true;$('#journey-start').disabled=true;$('#journey-game-choices').querySelectorAll('[data-game-choice]').forEach(button=>button.disabled=true);
    setupPanel.hidden=true;playPanel.hidden=false;resultPanel.hidden=true;$('#journey-win-panel').hidden=true;$('#journey-game-choices').hidden=true;$('#game-interrupted').hidden=true;$('#journey-more-stats').setAttribute('aria-expanded','false');$('#journey-extra-stats').hidden=true;setNotice('');
    lastSnapshot=null;engine.reset({text:selected.text,durationMs:currentDurationMs,context:selected.context,difficulty:selected.level,passageId:selected.id});engine.start();
    buildWordCheckpoints(selected.text);resetScene();input.focus({preventScroll:true});try{sessionStorage.removeItem(INTERRUPTED_KEY);}catch{}
  }
  function startJourney(){
    const selected=previewPassage;
    if(!selected){setNotice('We could not load a passage. Please choose another option.',true);return;}
    recentPassageIds.push(selected.id);recentPassageIds=recentPassageIds.slice(-6);previewPassage=null;beginPassage(selected);
  }
  function buildWordCheckpoints(text){
    const host=$('#journey-word-checkpoints'),count=(text.match(/\s+/g)||[]).length+1;host.replaceChildren();host.style.setProperty('--word-count',String(count));
    const boundaries=[];for(let i=0;i<text.length;i++)if(/\s/.test(text[i]))boundaries.push(i+1);if(text.length&&!boundaries.includes(text.length))boundaries.push(text.length);
    for(const boundary of boundaries){const marker=document.createElement('i');marker.className='journey-word-marker';marker.dataset.boundary=String(boundary);marker.style.left=`${boundary/Math.max(1,text.length)*100}%`;host.append(marker);}
  }
  function renderState(snapshot){
    if(!snapshot)return;
    const previous=lastSnapshot;lastSnapshot=snapshot;
    if(passage)renderJourneyPassage(passageNode,snapshot);
    passageNode.classList.toggle('is-started',snapshot.index>0);
    const routeChars=snapshot.routeIndex,total=Array.from(snapshot.text).length,percent=Math.round(snapshot.progress*100);
    $('#journey-progress-text').textContent=currentGameId==='garden'?`${routeChars} of ${total} characters typed`:`${routeChars} of ${total} characters along the route`;
    $('#journey-progressbar').setAttribute('aria-label',currentGameId==='garden'?'Garden passage progress':'Train route progress');$('#journey-progressbar').setAttribute('aria-valuenow',String(percent));card.style.setProperty('--journey-progress',`${percent}%`);
    $('#journey-progress-fill').style.width=`${percent}%`;
    $('#journey-word-checkpoints').querySelectorAll('.journey-word-marker').forEach(marker=>marker.classList.toggle('is-visited',Number(marker.dataset.boundary)<=snapshot.routeIndex));
    updateScene(snapshot);
    const status=$('#journey-state');
    if(snapshot.status==='paused')status.textContent=currentGameId==='garden'?'The garden is paused. Choose Resume when you are ready.':'The train is paused. Choose Resume when you are ready.';
    else if(snapshot.status==='completed')status.textContent=currentGameId==='garden'?'The garden is in bloom!':'The train reached the lighthouse!';
    else if(snapshot.status==='incomplete')status.textContent='The timed round is complete. Your partial result is saved.';
    else if(snapshot.index>snapshot.routeIndex)status.textContent=currentGameId==='garden'?'Flower growth is waiting at your first mistake. Backspace to correct it.':'The train is waiting at your first mistake. Backspace to correct it.';
    else if(snapshot.status==='playing'&&snapshot.index>0)status.textContent=currentGameId==='garden'?'Your typing is bringing the garden to life.':'Your typing is carrying the train onward.';
    else status.textContent=currentGameId==='garden'?'The garden is ready to bloom. Type to begin.':'The train is waiting at the station. Type to set off.';
    if(previous&&previous.text===snapshot.text&&(previous.index>previous.routeIndex)!==(snapshot.index>snapshot.routeIndex))$('#journey-announcement').textContent=snapshot.index>snapshot.routeIndex?'A mistake stopped the journey. Press Backspace to remove it, then continue typing.':'The mistake was removed. Continue typing the passage.';
    $('#journey-error-hint').textContent=currentGameId==='garden'?'Flower growth is waiting at your first mistake. Backspace to correct it.':'The train is waiting at your first mistake. Backspace to correct it.';$('#journey-error-hint').hidden=snapshot.index<=snapshot.routeIndex||snapshot.status!=='playing';
    $('#journey-pause').textContent=snapshot.status==='paused'?'Resume':'Pause';
    $('#journey-pause').disabled=!['playing','paused'].includes(snapshot.status);
    $('#journey-restart').disabled=!['playing','paused'].includes(snapshot.status);
    $('#journey-exit').disabled=!['playing','paused'].includes(snapshot.status);
    const remaining=snapshot.remainingMs;$('#journey-clock').textContent=snapshot.durationMs===null?'No timer':`Time left · ${formatDuration(Math.ceil((remaining??snapshot.durationMs)/1000))}`;
    if(snapshot.status==='playing'&&snapshot.wordsCompleted>lastWordCount){lastWordCount=snapshot.wordsCompleted;const stage=Math.floor(snapshot.progress*4);if(stage>0&&stage>lastStage&&stage<4){lastStage=stage;$('#journey-announcement').textContent=currentGameId==='garden'?['A flower has bloomed.','More flowers are blooming.','The garden is filling with color.'][Math.min(2,stage-1)]:['The town is coming into view.','The train reached the forest.','The bridge is ahead.'][Math.min(2,stage-1)];}}
  }
  function updateScene(snapshot){
    const progress=snapshot.progress||0;card.dataset.stage=String(Math.min(3,Math.floor(progress*4)));
    const scene=currentGameId==='garden'?'#garden-scene':'#journey-scene',activeScene=$(scene);
    if(currentGameId==='garden'){
      const flowers=[...card.querySelectorAll('#garden-scene .garden-flower')],bloomCount=getGardenBloomCount(snapshot.wordsCompleted,flowers.length);
      flowers.forEach((flower,index)=>flower.classList.toggle('is-bloomed',index<bloomCount));
      return;
    }
    const landmarks=[...activeScene.querySelectorAll('.journey-landmark')];landmarks.forEach((node,index)=>node.classList.toggle('is-visited',progress>=(index+1)/Math.max(1,landmarks.length)));
    activeScene.querySelectorAll('.journey-checkpoint').forEach((node,index)=>node.classList.toggle('is-visited',progress>=(index+1)/4));
    const pathId='journey-track';
    if(scenePathId!==pathId){scenePathId=pathId;scenePath=$(`#${pathId}`);try{pathLength=scenePath.getTotalLength();}catch{pathLength=0;}}
    if(!scenePath||!pathLength)return;
    const distance=clamp(progress,0,1)*pathLength,point=scenePath.getPointAtLength(distance),next=scenePath.getPointAtLength(Math.min(pathLength,distance+2)),angle=Math.atan2(next.y-point.y,next.x-point.x)*180/Math.PI;
    $('#journey-train').setAttribute('transform',`translate(${point.x.toFixed(1)} ${point.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
  }
  function resetScene(){
    card.dataset.stage='0';card.dataset.game=currentGameId;card.querySelectorAll('.journey-landmark,.journey-checkpoint,.garden-flower').forEach(node=>node.classList.remove('is-visited','is-bloomed'));scenePathId=null;
    if(currentGameId==='garden')return;
    const path=$('#journey-track'),traveler=$('#journey-train');try{scenePath=path;pathLength=path.getTotalLength();const pt=path.getPointAtLength(0),next=path.getPointAtLength(2);traveler.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${Math.atan2(next.y-pt.y,next.x-pt.x)*180/Math.PI})`);scenePathId='journey-track';}catch{scenePath=null;pathLength=0;}
  }
  function typeText(text,timestamp,shifted){
    if(!passage||!['ready','playing'].includes(engine.status))return;
    const expected=passage.text.slice(engine.index,engine.index+String(text).length);
    flashVirtualKey(keyboard,text,expected,shifted);playTypingSound(settings().typingSounds!==false);setNotice('');engine.input(text,timestamp);
  }
  function handleKeydown(event){
    if(composing||event.isComposing||event.metaKey||event.ctrlKey||event.altKey||!['ready','playing'].includes(engine.status))return;
    if(event.repeat){event.preventDefault();return;}
    if(event.key==='Backspace'){event.preventDefault();flashVirtualKey(keyboard,'\b',null);engine.backspace();return;}
    if(event.key==='Enter'){event.preventDefault();return;}
    if(event.key.length===1){event.preventDefault();typeText(event.key,normalizeEventTimestamp(event.timeStamp),event.shiftKey);}
  }
  function handleBeforeInput(event){
    if(event.isComposing||composing)return;
    if(event.inputType==='insertFromPaste'||event.inputType==='insertFromDrop'){event.preventDefault();blockPaste(event);return;}
    if(event.inputType==='deleteContentBackward'){event.preventDefault();flashVirtualKey(keyboard,'\b',null);engine.backspace();return;}
    if(event.inputType==='insertText'||event.inputType==='insertFromComposition'){if(event.data){event.preventDefault();typeText(event.data,normalizeEventTimestamp(event.timeStamp),false);}}
  }
  function blockPaste(event){event.preventDefault?.();setNotice(`Paste isn’t available in a game round. ${currentGameId==='garden'?'Type each word to bloom the garden.':'Type the passage to move the train.'}`,true);}
  function togglePause(){
    if(engine.status==='paused'){engine.resume();input.focus({preventScroll:true});if(engine.status==='playing')$('#journey-announcement').textContent='Journey resumed.';}
    else if(engine.status==='playing'){engine.pause();if(engine.status==='paused')$('#journey-announcement').textContent='Journey paused. Choose Resume when you are ready.';}
  }
  function restartJourney(){
    if(!passage)return;beginPassage(passage);
  }
  function chooseAnother(){
    engine?.discard();passage=null;card.classList.remove('is-in-round');input.value='';input.disabled=false;playPanel.hidden=true;resultPanel.hidden=true;setupPanel.hidden=false;$('#journey-game-choices').hidden=false;
    $('#journey-context').disabled=false;$('#journey-level').disabled=false;$('#journey-timer-choice').disabled=false;$('#journey-start').disabled=false;$('#journey-game-choices').querySelectorAll('[data-game-choice]').forEach(button=>button.disabled=false);setNotice('');resetScene();updatePassagePreview();$('#journey-context').focus({preventScroll:true});
  }
  function confirmExit(){if(['playing','ready'].includes(engine.status))engine.pause();openDialog('journey-exit-dialog');$('#journey-exit-resume').focus({preventScroll:true});}
  function resumeFromExit(){closeDialog('journey-exit-dialog');if(engine.status==='paused')engine.resume();input.focus({preventScroll:true});}
  function discardAndExit(){closeDialog('journey-exit-dialog');engine.discard();clearVirtualKey(keyboard);chooseAnother();}
  function toggleMoreStats(){const button=$('#journey-more-stats'),details=$('#journey-extra-stats'),expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));button.textContent=expanded?'More stats':'Hide stats';details.hidden=expanded;}
  function toggleJourneyTitleHelp(){const button=$('#journey-title-help'),details=$('#journey-title-explanation'),expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));button.textContent=expanded?'Why this title?':'Hide explanation';details.hidden=expanded;}
  function toggleKeyboard(){const button=$('#journey-keyboard-visibility');keyboard.hidden=!keyboard.hidden;$('#journey-keyboard-hint').hidden=keyboard.hidden;button.textContent=keyboard.hidden?'Show keys':'Hide keys';button.setAttribute('aria-expanded',String(!keyboard.hidden));setSettings({gameKeyboardVisible:!keyboard.hidden});}
  function replayCelebration(){
    const panel=$('#journey-win-panel'),confetti=$('#journey-celebration');panel.classList.remove('is-celebrating');confetti.classList.remove('is-celebrating');
    if(card.classList.contains('reduce-effects')||matchMedia('(prefers-reduced-motion: reduce)').matches){$('#journey-announcement').textContent=currentGameId==='garden'?'Garden Bloom! Your flowers are in full color.':'The Little Journey is complete! The train reached the lighthouse.';return;}
    void panel.offsetWidth;panel.classList.add('is-celebrating');void confetti.offsetWidth;confetti.classList.add('is-celebrating');
  }
  function finishRound(snapshot){
    if(sessionSaved||!['completed','incomplete'].includes(snapshot.status))return;sessionSaved=true;input.disabled=true;playPanel.hidden=true;resultPanel.hidden=false;clearVirtualKey(keyboard);
    const completed=snapshot.status==='completed',elapsedMs=Math.round(snapshot.elapsedMs),speedReliable=elapsedMs>=3000,stats=calculateStats({attempts:snapshot.attempts,correct:snapshot.correctKeystrokes,errors:snapshot.errors,elapsedMs});
    const game=getJourneyGame(currentGameId),carefulBadge=completed&&stats.accuracy>=95,rank=completed?game.rank:'';
    const session={id:globalThis.crypto?.randomUUID?.()||String(Date.now()),date:new Date().toISOString(),day:dailyKey(),mode:'game',limit:snapshot.durationMs?Math.round(snapshot.durationMs/1000):0,exercise:game.name,elapsedMs,speedReliable,attempts:snapshot.attempts,correct:snapshot.correctKeystrokes,errors:snapshot.errors,netWpm:speedReliable?Math.round(stats.netWpm*10)/10:0,rawWpm:speedReliable?Math.round(stats.rawWpm*10)/10:0,accuracy:Math.round(stats.accuracy*10)/10,wordsCompleted:snapshot.wordsCompleted,journey:{gameId:currentGameId,context:snapshot.context,difficulty:snapshot.difficulty,completed,progress:Math.round(snapshot.progress*100),checkpoints:snapshot.checkpoints.filter(point=>point.active).length,keepsake:completed?currentGameId:'',title:rank,carefulBadge}};
    let saved=false;try{saved=onSave(session)!==false;}catch{saved=false;}
    onCertificate(session);
    const graphPoints=[...(snapshot.progressSamples||[])],lastPoint=graphPoints.at(-1),finalPoint={wordsCompleted:snapshot.wordsCompleted,progress:Math.round(snapshot.progress*100),accuracy:Math.round(snapshot.accuracy)};if(!lastPoint||lastPoint.wordsCompleted!==finalPoint.wordsCompleted||lastPoint.progress!==finalPoint.progress||lastPoint.accuracy!==finalPoint.accuracy)graphPoints.push(finalPoint);drawJourneyGraph($('#journey-result-graph'),graphPoints,$('#journey-result-graph-summary'));
    const resultTitle=currentGameId==='garden'?'The garden is in full bloom!':'The train reached the lighthouse!';
    const winPanel=$('#journey-win-panel');winPanel.hidden=!completed;winPanel.dataset.game=currentGameId;$('#journey-win-icon').textContent=currentGameId==='garden'?'🌼':'🚂';$('#journey-win-kicker').textContent=currentGameId==='garden'?'GARDEN BLOOM COMPLETE':'LIGHTHOUSE REACHED';$('#journey-win-headline').textContent=currentGameId==='garden'?'You grew a garden!':'You made it!';$('#journey-win-subtitle').textContent=currentGameId==='garden'?`${getGardenBloomCount(snapshot.wordsCompleted,8)} flowers bloomed, one word at a time.`:`${snapshot.wordsCompleted} words carried the train all the way to the lighthouse.`;
    $('#journey-result-kicker').textContent=completed?'JOURNEY TITLE EARNED':'ROUND COMPLETE';$('#journey-result-title').textContent=completed?resultTitle:'Your journey can continue another time.';$('#journey-result-copy').textContent=completed?(currentGameId==='garden'?'Every correctly typed word brought color back to the garden.':'Every correct character carried the train onward.'):`${Math.round(snapshot.progress*100)}% of the passage completed. This unfinished round is saved as a partial result.`;
    const titleCard=$('#journey-title-card'),careful=$('#journey-careful-badge'),explanation=$('#journey-title-explanation');titleCard.hidden=!completed;$('#journey-title-name').textContent=rank;careful.hidden=!carefulBadge;careful.textContent=`Careful typing · ${Math.round(stats.accuracy)}% accuracy`;$('#journey-title-help').setAttribute('aria-expanded','false');$('#journey-title-help').textContent='Why this title?';explanation.hidden=true;explanation.textContent=`${rank} is your personal title for finishing ${game.name}. It is saved on this device and is not compared with other players.${carefulBadge?' The careful-typing badge is shown for 95% accuracy or higher on this round.':''}`;
    $('#journey-result-accuracy').textContent=`${Math.round(stats.accuracy)}%`;
    $('#journey-result-correct').textContent=String(snapshot.correctKeystrokes);
    $('#journey-result-errors-summary').textContent=String(snapshot.errors);
    $('#journey-result-progress').textContent=`${Math.round(snapshot.progress*100)}%`;
    $('#journey-result-time').textContent=elapsedMs<1000?'Under 1s':formatDuration(elapsedMs/1000);
    $('#journey-result-net').textContent=speedReliable?`${Math.round(stats.netWpm)} WPM`:'Not enough time';$('#journey-result-raw').textContent=speedReliable?`${Math.round(stats.rawWpm)} WPM`:'Not enough time';
    const nextPractice=analyzeSessions(data().sessions||[]);$('#journey-next-title').textContent=nextPractice.title;$('#journey-next-copy').textContent=nextPractice.copy;
    $('#journey-more-stats').hidden=!speedReliable;$('#journey-extra-stats').hidden=true;$('#journey-more-stats').setAttribute('aria-expanded','false');$('#journey-more-stats').textContent='More stats';
    if(!saved)$('#journey-result-copy').textContent+=' This journey could not be saved in this browser.';
    $('#journey-again').innerHTML=currentGameId==='garden'?'Grow this garden again <span>↻</span>':'Ride this route again <span>↻</span>';
    $('#journey-exit-title').textContent=currentGameId==='garden'?'Leave this garden?':'Leave this journey?';$('#journey-exit-dialog').querySelector('.eyebrow').textContent=currentGameId==='garden'?'PAUSE YOUR GARDEN':'PAUSE AT THE NEXT STATION';$('#journey-exit-resume').textContent=currentGameId==='garden'?'Resume garden':'Resume journey';
    if(completed)replayCelebration();else{$('#journey-celebration').classList.remove('is-celebrating');$('#journey-win-panel').classList.remove('is-celebrating');$('#journey-announcement').textContent='Round complete. Your partial journey is saved.';}$('#journey-result-title').focus({preventScroll:true});
  }
  function pauseForNavigation(){
    if(engine?.status==='playing'&&engine.pause()&&engine.status==='paused')$('#journey-announcement').textContent='Journey paused. Choose Resume when you are ready.';
  }
  function handleVisibility(){if(document.hidden)pauseForNavigation();}
  function handleBlur(){pauseForNavigation();}
  function handleUnload(){if(engine&&['playing','paused'].includes(engine.status)&&engine.snapshot().index>0){try{sessionStorage.setItem(INTERRUPTED_KEY,'1');}catch{}}}
  function cancelExit(){closeDialog('journey-exit-dialog');}
  function destroy(){engine?.discard();clearVirtualKey(keyboard);}
  return {init:initialize,start:startJourney,pauseForNavigation,cancelExit,destroy};
}
