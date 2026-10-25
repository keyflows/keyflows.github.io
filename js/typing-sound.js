let audioContext=null,resumePending=false;

function playTone(){
  const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),start=audioContext.currentTime;
  oscillator.type='sine';oscillator.frequency.setValueAtTime(430,start);
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.025,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+.045);
  oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(start);oscillator.stop(start+.05);
}

export function playTypingSound(enabled=true){
  if(!enabled)return false;
  const AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioContextClass)return false;
  audioContext??=new AudioContextClass();
  if(audioContext.state==='suspended'&&!resumePending){
    resumePending=true;
    audioContext.resume().then(()=>{resumePending=false;if(audioContext.state==='running')playTone();},error=>{resumePending=false;console.error('Typing sound could not be enabled.',error);});
    return true;
  }
  if(audioContext.state!=='running')return false;
  playTone();
  return true;
}
