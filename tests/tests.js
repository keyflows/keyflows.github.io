import {TypingEngine} from '../js/typing-engine.js';
import {calculateStats} from '../js/statistics.js';
import {resolveTheme} from '../js/settings.js';
import {validateData,exportData,importData,saveData} from '../js/storage.js';
import {analyzeSessions} from '../js/adaptive-practice.js';
import {getDailyChallenge} from '../js/challenges.js';

const results=[];const test=(name,fn)=>{try{fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.message});}};const eq=(a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
test('WPM formulas use characters and elapsed minutes',()=>{const s=calculateStats({attempts:250,correct:240,errors:10,elapsedMs:60000});eq(s.rawWpm,50);eq(s.netWpm,48);});
test('Accuracy excludes skipped characters',()=>{eq(calculateStats({attempts:10,correct:8,errors:2,elapsedMs:1000}).accuracy,80);});
test('Zero elapsed time does not invent speed',()=>{const s=calculateStats({attempts:100,correct:100,elapsedMs:0});eq(s.netWpm,0);eq(s.rawWpm,0);});
test('Engine scores wrong input and correction without erasing the error',()=>{const e=new TypingEngine();e.reset({text:'abc',mode:'words',limit:3});e.input('ax');e.backspace();e.input('b');const s=e.snapshot();eq(s.correct,2);eq(s.errors,1);eq(s.attempts,3);});
test('Engine completes word tests exactly once',()=>{let completions=0;const e=new TypingEngine({onComplete:()=>completions++});e.reset({text:'ok',mode:'words',limit:2});e.input('ok');e.finish();eq(completions,1);eq(e.snapshot().done,true);});
test('Engine time boundary completes at selected duration',()=>{let done=0;const e=new TypingEngine({onComplete:()=>done++});e.reset({text:'hello',mode:'time',limit:15});e.startedAt=performance.now()-14999;e.tick(performance.now()+5);eq(done,1);eq(e.snapshot().remaining,0);});
test('Input arriving after the time limit cannot enter the score',()=>{const e=new TypingEngine();e.reset({text:'hello',mode:'time',limit:15});e.startedAt=performance.now()-15001;e.input('h');eq(e.snapshot().attempts,0);eq(e.snapshot().done,true);});
test('Word count boundary follows requested count',()=>{const words=Array.from({length:10},(_,i)=>`w${i}`).join(' ');const e=new TypingEngine();e.reset({text:words,mode:'words',limit:10});e.input(words);eq(e.snapshot().done,true);});
test('Theme supports dark, light, and system preferences',()=>{eq(resolveTheme('system',true),'dark');eq(resolveTheme('system',false),'light');eq(resolveTheme('light',true),'light');});
test('Storage validation handles empty, corrupt and unsupported history',()=>{eq(validateData(null),null);const d=validateData({version:1,sessions:[{}, {netWpm:22,accuracy:98,elapsedMs:1200,date:'2026-01-01'}]});eq(d.sessions.length,1);});
test('Import clamps unsafe preferences and rejects invalid enums',()=>{const d=validateData({version:1,settings:{duration:-5,goal:999,theme:'bogus',difficulty:'x'}});eq(d.settings.duration,30);eq(d.settings.goal,10);eq(d.settings.theme,'system');eq(d.settings.difficulty,'standard');});
test('Export and import round trip validated data',()=>{const d=validateData({version:1,sessions:[{netWpm:24,accuracy:97,elapsedMs:30000,date:'2026-01-01'}]});const r=importData(exportData(d));eq(r.ok,true);eq(r.data.sessions.length,1);eq(importData('{bad json').ok,false);});
test('Adaptive recommendation has a useful empty state and responds to errors',()=>{eq(analyzeSessions([]).exercise,'letters');const r=analyzeSessions([{netWpm:20,accuracy:85,keyErrors:{x:2},keyPairs:{th:4}}]);eq(r.exercise,'pairs');eq(r.target,'th');});
test('Daily challenge stays consistent for the same local date',()=>{eq(getDailyChallenge(new Date(2026,9,24)),getDailyChallenge(new Date(2026,9,24)));});
test('Storage quota failures return false instead of crashing',()=>{const original=Storage.prototype.setItem;try{Storage.prototype.setItem=function(){throw new DOMException('blocked','QuotaExceededError');};eq(saveData(validateData({version:1})),false);}finally{Storage.prototype.setItem=original;}});

const passed=results.filter(x=>x.ok).length;document.querySelector('#summary').textContent=`${passed} passed · ${results.length-passed} failed · ${results.length} total`;document.querySelector('#test-results').innerHTML=results.map(x=>`<li class="test-result ${x.ok?'pass':'fail'}"><b>${x.ok?'PASS':'FAIL'}</b> — ${x.name}${x.error?`<br><small>${x.error.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</small>`:''}</li>`).join('');document.title=`${passed}/${results.length} tests passed — Keyflow`;
