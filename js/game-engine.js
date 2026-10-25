const TERMINAL = new Set(['completed','incomplete','discarded']);
export const GAME_EVENT_GRACE_MS = 100;

export function normalizeEventTimestamp(timestamp, timeOrigin=performance.timeOrigin){
  const value=Number(timestamp);
  if(!Number.isFinite(value)||value<0)return performance.now();
  return value>1e12?Math.max(0,value-timeOrigin):value;
}

export class JourneyEngine{
  constructor({onUpdate=()=>{},onComplete=()=>{},now=()=>performance.now(),setTimer=(callback,delay)=>globalThis.setTimeout(callback,delay),clearTimer=id=>globalThis.clearTimeout(id),setIntervalTimer=(callback,delay)=>globalThis.setInterval(callback,delay),clearIntervalTimer=id=>globalThis.clearInterval(id),eventGraceMs=GAME_EVENT_GRACE_MS}={}){
    this.callbacks={onUpdate,onComplete};this.clock={now,setTimer,clearTimer,setIntervalTimer,clearIntervalTimer};this.eventGraceMs=eventGraceMs;this.reset();
  }
  reset({text='',durationMs=null,context='story',difficulty='easy',passageId=''}={}){
    this.stopTimers();this.text=String(text);this.characters=Array.from(this.text);this.entries=Array(this.characters.length).fill(null);this.index=0;this.routeIndex=0;this.attempts=0;this.correctKeystrokes=0;this.errors=0;this.startedAt=null;this.elapsedMs=0;this.durationMs=Number.isFinite(durationMs)&&durationMs>0?durationMs:null;this.deadline=null;this.deadlineReached=false;this.pendingTimeout=null;this.interval=null;this.status='ready';this.context=context;this.difficulty=difficulty;this.passageId=passageId;this.completionSent=false;this.progressSamples=[{wordsCompleted:0,progress:0,accuracy:100}];this.callbacks.onUpdate(this.snapshot());return this.snapshot();
  }
  start(){if(!this.text.length||this.status!=='ready')return false;this.status='playing';this.callbacks.onUpdate(this.snapshot());return true;}
  input(value,timestamp=this.clock.now()){
    if(!value||!['ready','playing'].includes(this.status))return false;
    const inputTime=Number.isFinite(timestamp)?timestamp:this.clock.now();
    if(this.status==='ready')this.start();
    if(this.startedAt===null){this.startedAt=inputTime;this.deadline=this.durationMs===null?null:inputTime+this.durationMs;if(this.durationMs!==null)this.interval=this.clock.setIntervalTimer(()=>this.tick(this.clock.now()),100);}
    if(this.deadline!==null&&inputTime>this.deadline){this.markDeadlineReached(this.clock.now());return false;}
    let changed=false;
    for(const character of Array.from(String(value))){
      if(this.index>=this.characters.length)break;
      this.entries[this.index]=character;this.attempts++;
      if(character===this.characters[this.index])this.correctKeystrokes++;else this.errors++;
      const previousRoute=this.routeIndex;this.index++;changed=true;this.recomputeRoute();
      if(this.routeIndex>previousRoute){const atWordEnd=this.routeIndex===this.characters.length||/\s/.test(this.characters[this.routeIndex-1]);if(atWordEnd){const wordsCompleted=this.wordsCompleted(),progress=this.characters.length?this.routeIndex/this.characters.length:0,accuracy=this.attempts?this.correctKeystrokes/this.attempts*100:100,last=this.progressSamples.at(-1);if(!last||last.wordsCompleted!==wordsCompleted||last.progress!==Math.round(progress*100)||last.accuracy!==Math.round(accuracy))this.progressSamples.push({wordsCompleted,progress:Math.round(progress*100),accuracy:Math.round(accuracy)});}}
      if(this.routeIndex===this.characters.length){this.finish('completed',inputTime);break;}
    }
    if(changed)this.callbacks.onUpdate(this.snapshot());return changed;
  }
  backspace(){
    if(!['ready','playing'].includes(this.status)||this.index===0)return false;
    this.index--;this.entries[this.index]=null;this.recomputeRoute();this.callbacks.onUpdate(this.snapshot());return true;
  }
  recomputeRoute(){let index=0;while(index<this.index&&this.entries[index]===this.characters[index])index++;this.routeIndex=index;}
  pause(now=this.clock.now()){
    if(this.status!=='playing')return false;
    if(this.startedAt!==null){this.elapsedMs=this.deadline===null?Math.max(0,now-this.startedAt):Math.min(this.durationMs,Math.max(0,now-this.startedAt));if(this.deadline!==null&&now>=this.deadline){this.markDeadlineReached(now);return true;}}
    this.status='paused';this.stopInterval();this.callbacks.onUpdate(this.snapshot());return true;
  }
  resume(now=this.clock.now()){
    if(this.status!=='paused')return false;
    this.status='playing';if(this.startedAt!==null){this.startedAt=now-this.elapsedMs;this.deadline=this.durationMs===null?null:this.startedAt+this.durationMs;if(this.deadline!==null)this.interval=this.clock.setIntervalTimer(()=>this.tick(this.clock.now()),100);}
    this.callbacks.onUpdate(this.snapshot());return true;
  }
  tick(now=this.clock.now()){
    if(this.status!=='playing'||this.startedAt===null)return;
    this.elapsedMs=this.deadline===null?Math.max(0,now-this.startedAt):Math.min(this.durationMs,Math.max(0,now-this.startedAt));
    if(this.deadline!==null&&now>=this.deadline)this.markDeadlineReached(now);
    this.callbacks.onUpdate(this.snapshot());
  }
  markDeadlineReached(now=this.clock.now()){
    if(this.status!=='playing'||this.deadlineReached)return;
    this.deadlineReached=true;this.elapsedMs=this.durationMs??Math.max(0,now-(this.startedAt||now));this.stopInterval();
    this.pendingTimeout=this.clock.setTimer(()=>{this.pendingTimeout=null;if(this.status==='playing'&&this.routeIndex<this.characters.length)this.finish('incomplete',this.deadline);},this.eventGraceMs);
  }
  finish(status='completed',timestamp=this.clock.now()){
    if(this.completionSent||TERMINAL.has(this.status))return false;
    this.status=status;this.completionSent=true;this.elapsedMs=this.durationMs!==null&&status==='incomplete'?this.durationMs:(this.startedAt===null?0:Math.max(0,timestamp-this.startedAt));this.stopTimers();const result=this.snapshot();this.callbacks.onUpdate(result);this.callbacks.onComplete(result);return true;
  }
  discard(){if(TERMINAL.has(this.status))return false;this.status='discarded';this.stopTimers();this.callbacks.onUpdate(this.snapshot());return true;}
  stopTimers(){this.stopInterval();if(this.pendingTimeout!==null&&this.pendingTimeout!==undefined){this.clock.clearTimer(this.pendingTimeout);this.pendingTimeout=null;}}
  stopInterval(){if(this.interval!==null&&this.interval!==undefined){this.clock.clearIntervalTimer(this.interval);this.interval=null;}}
  checkpointBoundaries(){const boundaries=[];for(let i=0;i<this.characters.length;i++)if(/\s/.test(this.characters[i]))boundaries.push(i+1);if(this.characters.length&&!boundaries.includes(this.characters.length))boundaries.push(this.characters.length);return boundaries;}
  snapshot(){
    const elapsedMs=this.startedAt===null?this.elapsedMs:this.status==='playing'?this.deadline===null?Math.max(0,this.clock.now()-this.startedAt):Math.min(this.durationMs,Math.max(0,this.clock.now()-this.startedAt)):this.elapsedMs;
    const correct=this.correctKeystrokes,accuracy=this.attempts?correct/this.attempts*100:100,wordsCompleted=this.wordsCompleted();
    const boundaries=this.checkpointBoundaries();
    return {text:this.text,entries:[...this.entries],index:this.index,routeIndex:this.routeIndex,progress:this.characters.length?this.routeIndex/this.characters.length:0,attempts:this.attempts,correctKeystrokes:correct,errors:this.errors,accuracy,wordsCompleted,progressSamples:this.progressSamples.map(point=>({...point})),checkpoints:boundaries.map((boundary,i)=>({index:i+1,position:boundary,active:this.routeIndex>=boundary})),elapsedMs,remainingMs:this.deadline===null?null:Math.max(0,this.durationMs-elapsedMs),durationMs:this.durationMs,status:this.status,context:this.context,difficulty:this.difficulty,passageId:this.passageId,speedReliable:elapsedMs>=3000};
  }
  wordsCompleted(){return this.characters.slice(0,this.routeIndex).join('').trim().split(/\s+/).filter(Boolean).length;}
}
