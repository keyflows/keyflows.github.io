const KEY='keyflows.data';
const LEGACY_KEY='keyflow.data';
const defaults={version:1,settings:{theme:'system',mode:'time',duration:30,wordCount:25,difficulty:'standard',punctuation:false,numbers:false,goal:10,customText:''},sessions:[],challenges:{},streak:{current:0,lastPractice:null},achievements:[]};
function validSession(s){return s&&typeof s==='object'&&Number.isFinite(s.netWpm)&&Number.isFinite(s.accuracy)&&Number.isFinite(s.elapsedMs)&&s.elapsedMs>=0&&typeof s.date==='string';}
export function validateData(value){
  if(!value||typeof value!=='object'||value.version!==1)return null;
  const d={...defaults,...value,settings:{...defaults.settings,...(value.settings||{})},sessions:Array.isArray(value.sessions)?value.sessions.filter(validSession).slice(-500):[],challenges:value.challenges&&typeof value.challenges==='object'?value.challenges:{},streak:value.streak&&typeof value.streak==='object'?value.streak:defaults.streak,achievements:Array.isArray(value.achievements)?value.achievements.filter(x=>typeof x==='string'):[]};
  for(const k of Object.keys(defaults.settings))if(typeof d.settings[k]!==typeof defaults.settings[k])d.settings[k]=defaults.settings[k];
  if(!['dark','light','system'].includes(d.settings.theme))d.settings.theme='system';
  if(!['time','words','custom','daily'].includes(d.settings.mode))d.settings.mode='time';
  if(!['easy','standard','hard'].includes(d.settings.difficulty))d.settings.difficulty='standard';
  if(![15,30,60,120].includes(d.settings.duration))d.settings.duration=30;
  if(![10,25,50,100].includes(d.settings.wordCount))d.settings.wordCount=25;
  if(![5,10,15,20].includes(d.settings.goal))d.settings.goal=10;
  d.settings.customText=d.settings.customText.slice(0,12000);
  const streak=d.streak;d.streak={current:Number.isInteger(streak.current)&&streak.current>=0?Math.min(streak.current,10000):0,lastPractice:typeof streak.lastPractice==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(streak.lastPractice)?streak.lastPractice:null};
  for(const [key,value] of Object.entries(d.challenges)){if(!/^\d{4}-\d{2}-\d{2}$/.test(key)||!value||!Number.isFinite(value.netWpm)||!Number.isFinite(value.accuracy)||value.netWpm<0||value.accuracy<0||value.accuracy>100)delete d.challenges[key];}
  return d;
}
export function loadData(){try{const stored=localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY);return validateData(JSON.parse(stored))||structuredClone(defaults);}catch{return structuredClone(defaults);}}
export function saveData(data){try{localStorage.setItem(KEY,JSON.stringify(validateData(data)||defaults));return true;}catch{return false;}}
export function exportData(data){return JSON.stringify(validateData(data)||defaults,null,2);}
export function importData(text){try{const parsed=JSON.parse(text);const clean=validateData(parsed);if(!clean)throw new Error('Unsupported or invalid Keyflow file.');return {ok:true,data:clean};}catch(error){return {ok:false,error:error.message};}}
export function clearData(){try{localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY);return true;}catch{return false;}}
export function getStorageKey(){return KEY;}
