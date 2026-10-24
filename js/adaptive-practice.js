import {generateWords} from './text-generator.js';
export function analyzeSessions(sessions=[]){
  if(!sessions.length)return {title:'Start with a quick diagnostic',copy:'A short warm-up helps KeyFlows find a useful practice focus for you.',exercise:'letters'};
  const chars={},pairs={};for(const s of sessions.slice(-20)){for(const [k,v] of Object.entries(s.keyErrors||{}))chars[k]=(chars[k]||0)+v;for(const [k,v] of Object.entries(s.keyPairs||{}))pairs[k]=(pairs[k]||0)+v;}
  const topChar=Object.entries(chars).sort((a,b)=>b[1]-a[1])[0],topPair=Object.entries(pairs).sort((a,b)=>b[1]-a[1])[0];
  if(topPair)return {title:`Give “${topPair[0]}” a little practice`,copy:`This letter pair appeared in ${topPair[1]} mistakes across your recent sessions. A short, relaxed repetition can help you notice its rhythm.`,exercise:'pairs',target:topPair[0]};
  if(topChar)return {title:'Practice a tricky key',copy:`The “${topChar[0]}” key showed up in ${topChar[1]} mismatches. Try a short exercise that gives it a little extra attention.`,exercise:'letters',target:topChar[0]};
  const recent=sessions.slice(-5),avg=recent.reduce((a,s)=>a+(s.accuracy||0),0)/recent.length;
  if(avg<92)return {title:'Make accuracy your focus',copy:'Your recent attempts have room for a few more careful keystrokes. This short exercise rewards a comfortable pace.',exercise:'accuracy'};
  return {title:'Keep your rhythm steady',copy:'Your recent practice looks balanced. A short, mixed exercise can keep your fingers moving comfortably.',exercise:'steady'};
}
export function makeExercise(recommendation,{seed=17}={}){const target=recommendation?.target||'a';if(recommendation?.exercise==='pairs'){const bits=Array.from({length:10},(_,i)=>target+(i%2?'a':'e'));return bits.join(' ');}if(recommendation?.exercise==='letters')return Array.from({length:25},(_,i)=>i%4===0?target:'a').join(' ');return generateWords(30,{difficulty:recommendation?.exercise==='accuracy'?'easy':'standard',seed});}
export function compareAttempt(current,previous=[]){if(!previous.length)return 'Your first focused attempt sets a baseline for next time.';const best=Math.max(...previous.map(x=>x.netWpm||0));const delta=Math.round((current.netWpm||0)-best);return delta>0?`${delta} WPM above your previous best in this exercise.`:delta<0?`${Math.abs(delta)} WPM below your previous best. Keep the pace comfortable.`:'Right alongside your previous best.';}
