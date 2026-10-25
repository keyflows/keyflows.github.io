export function calculateStats({attempts=0,correct=0,errors=0,elapsedMs=0}={}){
  const minutes=Math.max(0,elapsedMs)/60000;
  const raw=minutes>0?attempts/5/minutes:0;
  const net=minutes>0?Math.max(0,(attempts-errors)/5/minutes):0;
  return {rawWpm:raw,netWpm:net,accuracy:attempts?correct/attempts*100:100,attempts,correct,errors,elapsedMs};
}
export function makePaceSample(previous={},current={}){
  const elapsedMs=Math.max(0,Number(current.elapsedMs||0)-Number(previous.elapsedMs||0));
  if(!elapsedMs)return null;
  const attempts=Math.max(0,Number(current.attempts||0)-Number(previous.attempts||0));
  const correct=Math.max(0,Number(current.correct||0)-Number(previous.correct||0));
  const errors=Math.max(0,Number(current.errors||0)-Number(previous.errors||0));
  const interval=calculateStats({attempts,correct,errors,elapsedMs});
  const totalAccuracy=Number(current.accuracy);
  return {
    timeSeconds:Math.max(0,Number(current.elapsedMs||0)/1000),
    intervalSeconds:elapsedMs/1000,
    netWpm:interval.netWpm,
    rawWpm:interval.rawWpm,
    accuracy:Number.isFinite(totalAccuracy)?totalAccuracy:interval.accuracy
  };
}
export function roundStats(stats){return {...stats,rawWpm:Math.round(stats.rawWpm),netWpm:Math.round(stats.netWpm),accuracy:Math.round(stats.accuracy*10)/10};}
export function formatDuration(seconds){return seconds<60?`${Math.round(seconds)}s`:`${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`;}
export function dailyKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
