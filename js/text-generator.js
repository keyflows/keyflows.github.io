const easyWords = 'the a and to in is it you of that we can my are on for with this make find your time good calm soft warm little open steady gentle focus flow light kind breathe begin next'.split(' ');
const standardWords = 'quiet morning brings a fresh start as light moves slowly across the room take a breath and let your hands settle into a comfortable rhythm small steps can carry us farther than we expect'.split(' ');
const hardWords = 'curiosity transforms ordinary moments into meaningful discoveries; deliberate practice builds confidence through patient repetition. thoughtful attention reveals patterns, precision, and possibility.'.split(' ');
const punctuationWords = ['“steady progress,” she said, “begins with one careful step.”','It’s a quiet day: breathe, focus, and keep moving.','A good rhythm isn’t rushed; it’s chosen.','Practice—patiently, kindly—and let your confidence grow.'];
const numberWords = ['There are 7 quiet minutes in this warm-up.','A small 12% gain can feel meaningful over time.','Try 3 gentle rounds of 20 words each.','The 2026 practice log records your pace locally.'];
const allWords = 'after again almost always another around because before begin between build change choice clear come could create day different early every example feel few first follow from friend give grow hand have help here however just keep know learn leave life like listen live look many maybe more most move much must never new night often once only other our over people place point practice read real right same say see seem share should simple since slow some start still story strong such take tell than then there these thing think through together try turn under until use usually very voice walk want way week well when where while who why will word work world write year yet'.split(' ');
const seededPick = (arr, seed, i) => arr[((seed * 9301 + i * 49297 + 233) >>> 0) % arr.length];
export function generateWords(count=50,{difficulty='standard',punctuation=false,numbers=false,seed=Date.now()}={}){
  const source=difficulty==='easy'?easyWords:difficulty==='hard'?allWords:standardWords;
  const out=[];
  for(let i=0;i<count;i++){
    if(punctuation&&i%7===6) out.push(seededPick(punctuationWords,seed,i).split(' ')[i%3]||seededPick(punctuationWords,seed,i).replace(/[“”]/g,''));
    else if(numbers&&i%8===7) out.push(String((seed+i*37)%997));
    else {let word=seededPick(source,seed,i); if(difficulty==='hard'&&i%13===12)word+=','; out.push(word);}
  }
  return out.join(' ');
}
export const lessonContent=[
 {title:'Home-row keys',group:'START HERE',icon:'⌂',description:'Let your fingers find their home.',text:'asdf jkl; asdf jkl; ask a lad; fall; all fall; a flask'},
 {title:'Upper-row keys',group:'BUILD REACH',icon:'↑',description:'Reach gently for the row above.',text:'qwer uiop qwer uiop write quiet power; we were quite quick'},
 {title:'Lower-row keys',group:'BUILD REACH',icon:'↓',description:'Practice a comfortable reach below.',text:'zxcv bnm zxcv bnm move by hand; brave minds build'},
 {title:'Capital letters',group:'GROW CONFIDENCE',icon:'⇧',description:'Add capitals with a relaxed shift.',text:'A calm Start, a Clear thought, and One small step can Begin a new habit.'},
 {title:'Numbers',group:'GROW CONFIDENCE',icon:'#',description:'Find a steady rhythm with digits.',text:'In 2026, try 5 calm minutes, 3 times a week, for 12 weeks.'},
 {title:'Punctuation',group:'GROW CONFIDENCE',icon:';',description:'Let punctuation become part of the flow.',text:'“Take your time,” she said; “careful practice makes progress!”'},
 {title:'Letter pairs',group:'FIND YOUR FLOW',icon:'↔',description:'Smooth out common combinations.',text:'the quick brown fox moved through the green field and found a quiet place'},
 {title:'Common words',group:'FIND YOUR FLOW',icon:'✎',description:'Build ease with familiar words.',text:'people often learn more when they take time to think and write with care'},
 {title:'Full sentences',group:'FIND YOUR FLOW',icon:'¶',description:'Bring accuracy into natural writing.',text:'Small moments of practice can create a lasting sense of confidence.'},
 {title:'Everyday messages',group:'USEFUL WRITING',icon:'✉',description:'Practice the kind of sentences you type every day.',text:'Hello, I hope your day is going well. Please let me know when you have a moment, and I will get back to you soon.'}
];
export const dailyPrompts=[
 {name:'A little more room',text:'A quiet mind makes room for a thoughtful beginning. Take a breath, trust your hands, and let each small choice bring you closer to a comfortable rhythm.'},
 {name:'The long way around',text:'There is no need to hurry through a new skill. A steady pace gives every careful movement time to become familiar, until the work starts to feel like your own.'},
 {name:'A useful pause',text:'A pause is part of the rhythm. It gives your hands a moment to settle, your attention a place to return, and your next small step a little more intention.'},
 {name:'Made of moments',text:'Progress is often made of ordinary moments: one clear thought, one careful line, one kind return to practice. Add them together and a new confidence begins to take shape.'}
];
