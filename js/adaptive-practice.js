import {generateWords} from './text-generator.js';

function strongestCount(counts={}){
  return Object.entries(counts||{})
    .map(([target,count])=>[target,Number(count)])
    .filter(([target,count])=>target&&Number.isFinite(count)&&count>0)
    .sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0))[0]||null;
}

function keyLabel(value){
  if(value===' ')return 'space';
  if(value==='\n')return 'return';
  if(value==='\t')return 'tab';
  return `“${value}”`;
}

/** Build a transparent, deterministic recommendation from the latest saved session only. */
export function analyzeSessions(sessions=[]){
  const history=Array.isArray(sessions)?sessions:[];
  if(!history.length)return {
    title:'Start with a quick diagnostic',
    copy:'There is no completed session to review yet. Try a short mixed exercise; KeyFlows can use its saved accuracy and error counts to suggest a focus afterward.',
    exercise:'letters',target:'a',basis:'no-history'
  };

  const latest=history.at(-1)||{};
  const sessionId=latest.id??null;
  const topPair=strongestCount(latest.keyPairs);
  const topChar=strongestCount(latest.keyErrors);
  if(topPair){
    const [target,count]=topPair;
    return {
      title:`Practice the ${keyLabel(target)} pair`,
      copy:`In your latest session, the expected pair ${keyLabel(target)} was mistyped ${count} ${count===1?'time':'times'}. Try a short pattern that repeats it with easy keys, then compare your next attempt locally.`,
      exercise:'pairs',target,basis:'latest-session',sessionId,count
    };
  }
  if(topChar){
    const [target,count]=topChar;
    return {
      title:target===' '?'Practice spacing':`Practice the ${keyLabel(target)} key`,
      copy:`In your latest session, the expected ${keyLabel(target)} key was missed ${count} ${count===1?'time':'times'}. This short pattern gives it extra practice; it does not predict an improvement.`,
      exercise:'letters',target,basis:'latest-session',sessionId,count
    };
  }

  const accuracy=Number(latest.accuracy);
  if(Number.isFinite(accuracy)&&accuracy<92)return {
    title:'Slow down for accuracy',
    copy:`Your latest session ended at ${Math.round(accuracy)}% accuracy. Try a gentle word set and focus on fewer mismatches before raising your pace.`,
    exercise:'accuracy',basis:'latest-session',sessionId
  };

  const speedReliable=latest.speedReliable!==false&&Number.isFinite(Number(latest.netWpm));
  const evidence=speedReliable
    ?`Your latest session recorded ${Math.round(accuracy)}% accuracy and ${Math.round(latest.netWpm)} net WPM.`
    :Number.isFinite(accuracy)?`Your latest session recorded ${Math.round(accuracy)}% accuracy; it was too short for a reliable speed score.`:'Your latest session has no reliable speed or accuracy score.';
  return {
    title:'Keep a steady rhythm',
    copy:`${evidence} No repeated key weakness is available from that session. Try a short mixed exercise; the next saved attempt can change this recommendation.`,
    exercise:'steady',basis:'latest-session',sessionId
  };
}

export function makeExercise(recommendation,{seed=17}={}){
  const target=recommendation?.target||'a';
  if(recommendation?.exercise==='pairs'){
    return Array.from({length:10},(_,i)=>target+(i%2?'a':'e')).join(' ');
  }
  if(recommendation?.exercise==='letters'){
    if(target===' ')return 'a a a a a a a a a a a a';
    return Array.from({length:25},(_,i)=>i%4===0?target:'a').join(' ');
  }
  return generateWords(30,{difficulty:recommendation?.exercise==='accuracy'?'easy':'standard',seed});
}

export function compareAttempt(current,previous=[]){
  if(!previous.length)return 'Your first focused attempt sets a baseline for next time.';
  const best=Math.max(...previous.map(x=>x.netWpm||0));
  const delta=Math.round((current.netWpm||0)-best);
  return delta>0?`${delta} WPM above your previous best in this exercise.`:delta<0?`${Math.abs(delta)} WPM below your previous best. Keep the pace comfortable.`:'Right alongside your previous best.';
}
