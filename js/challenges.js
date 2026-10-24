import {dailyPrompts} from './text-generator.js';
import {dailyKey} from './statistics.js';
export function getDailyChallenge(date=new Date()){const key=dailyKey(date);let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))>>>0;return {...dailyPrompts[hash%dailyPrompts.length],key};}
export function saveChallengeResult(challenges,result){const key=result.challengeKey;if(!key)return challenges;const old=challenges[key];if(!old||result.netWpm>old.netWpm)challenges[key]={netWpm:result.netWpm,accuracy:result.accuracy,date:result.date};return challenges;}
