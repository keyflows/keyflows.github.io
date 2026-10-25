const shiftedBase={'~':'`','!':'1','@':'2','#':'3','$':'4','%':'5','^':'6','&':'7','*':'8','(':'9',')':'0','_':'-','+':'=','{':'[','}':']','|':'\\',':':';','"':"'",'<':',','>':'.','?':'/'};
const shiftedSet=new Set(Object.keys(shiftedBase));
const specialKeys=new Set(['BACKSPACE','TAB','CAPS','ENTER','SHIFT-L','SHIFT-R','CTRL-L','CTRL-R','ALT-L','ALT-R','SPACE']);
const rows=[
  [['`','~'],...Array.from('1234567890',digit=>[digit,{'1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')'}[digit]]),['-','_'],['=','+'],['BACKSPACE','⌫']],
  [['TAB','Tab'],...Array.from('QWERTYUIOP'),['[','{'],[']','}'],['\\','|']],
  [['CAPS','Caps'],...Array.from('ASDFGHJKL'),['; ',':'],["'",'"'],['ENTER','Enter']],
  [['SHIFT-L','Shift'],...Array.from('ZXCVBNM'),[',','<'],['.','>'],['/','?'],['SHIFT-R','Shift']],
  [['CTRL-L','Ctrl'],['ALT-L','Alt'],['SPACE','Space'],['ALT-R','Alt'],['CTRL-R','Ctrl']]
];
function keyLabel(data){
  const lookup={'BACKSPACE':'⌫','TAB':'Tab','CAPS':'Caps','ENTER':'Enter','SHIFT-L':'Shift','SHIFT-R':'Shift','CTRL-L':'Ctrl','CTRL-R':'Ctrl','ALT-L':'Alt','ALT-R':'Alt','SPACE':'Space'};
  return lookup[data]??data;
}
export function createVirtualKeyboard(container){
  if(!container)return new Map();
  container.replaceChildren();const map=new Map();
  for(const rowData of rows){const row=document.createElement('div');row.className='journey-key-row';
    for(const entry of rowData){const [raw,shifted]=Array.isArray(entry)?entry:[entry,null],id=String(raw).trim().toUpperCase();const key=document.createElement('span');key.className='journey-key';key.dataset.key=id;key.setAttribute('aria-hidden','true');
      if(shifted&&!specialKeys.has(id)){const small=document.createElement('small');small.textContent=shifted;key.append(small);}
      const label=document.createElement('span');label.textContent=keyLabel(id);key.append(label);
      if(['BACKSPACE','TAB','CAPS','ENTER','SHIFT-L','SHIFT-R','CTRL-L','CTRL-R','ALT-L','ALT-R','SPACE'].includes(id))key.classList.add(`journey-key-${id.toLowerCase()}`);
      row.append(key);map.set(id,key);
    }
    container.append(row);
  }
  container._keyMap=map;return map;
}
export function clearVirtualKey(container){
  if(!container)return;clearTimeout(container._keyTimer);container._keyTimer=null;
  for(const key of container._keyMap?.values()||[])key.classList.remove('is-pressed','is-correct','is-incorrect');
}
export function flashVirtualKey(container,value,expected,shifted=false){
  const map=container?._keyMap;if(!map)return null;
  const char=String(value??'').slice(-1);if(!char)return null;
  let id=char===' '?'SPACE':char==='\b'?'BACKSPACE':char==='\n'?'ENTER':shiftedBase[char]||(/^[a-z]$/i.test(char)?char.toUpperCase():char);
  if(char==='\t')id='TAB';
  const key=map.get(id);if(!key)return null;
  clearVirtualKey(container);key.classList.add('is-pressed');
  const expectedChar=expected===null?null:String(expected??'').slice(-1);
  if(expectedChar!==null)key.classList.add(char===expectedChar?'is-correct':'is-incorrect');
  if(shifted||shiftedSet.has(char)||/^[A-Z]$/.test(char)){map.get('SHIFT-L')?.classList.add('is-pressed');map.get('SHIFT-R')?.classList.add('is-pressed');}
  container._keyTimer=setTimeout(()=>clearVirtualKey(container),260);
  return {key:id,correct:expectedChar===null?null:char===expectedChar};
}
