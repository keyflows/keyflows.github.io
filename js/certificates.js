const certificateTypes={
  completion:{title:'Typing Practice Completion',subtitle:'Completed a KeyFlows typing practice session with at least 90% accuracy.'},
  accuracy:{title:'Careful Typing Milestone',subtitle:'Completed a KeyFlows typing practice session with at least 95% accuracy.'},
  speed:{title:'Steady Speed Milestone',subtitle:'Reached at least 30 net WPM with at least 90% accuracy in a completed session.'},
  reading:{title:'Reading & Typing Course',subtitle:'Completed every Reading & Typing course lesson with at least 90% accuracy.'}
};

const escapeXml=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[<>&'"]/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[char]));
const pdfText=value=>String(value??'').replace(/™/g,'\ue000').normalize('NFKD').replace(/[^\x20-\x7e\ue000]/g,'').replace(/[\\()]/g,'\\$&').replace(/\ue000/g,'\\231');
function wrapText(value,maxLength){
  const lines=[];let line='';
  for(const word of String(value??'').split(/\s+/)){
    if(line&&`${line} ${word}`.length>maxLength){lines.push(line);line=word;}else line=line?`${line} ${word}`:word;
  }
  if(line)lines.push(line);
  return lines;
}

export function availableCertificates(session,sessions=[]){
  if(!session||!Number.isFinite(session.accuracy)||session.accuracy<90||session.journey?.completed===false)return [];
  const available=['completion'];
  if(session.accuracy>=95)available.push('accuracy');
  if(session.speedReliable!==false&&session.netWpm>=30)available.push('speed');
  const readingLessons=[10,11,12,13];
  if(session.course==='reading'&&readingLessons.every(index=>sessions.some(item=>item.lessonIndex===index&&item.course==='reading'&&item.accuracy>=90)))available.push('reading');
  return available.map(id=>({id,...certificateTypes[id]}));
}

export function createCertificateSvg({type='completion',name='',date=new Date().toLocaleDateString(),details=''}={}){
  const certificate=certificateTypes[type]||certificateTypes.completion;
  const recipient=String(name||'').trim().slice(0,80);
  const displayName=recipient||'A dedicated typist',fontSize=Math.min(42,Math.max(22,Math.floor(960/(displayName.length*.56)))),subtitle=wrapText(certificate.subtitle,88);
  const subtitleLines=subtitle.map((line,index)=>`<text x="600" y="${570+index*29}" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" fill="#38463a">${escapeXml(line)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fffdf7"/><stop offset="1" stop-color="#e8eddf"/></linearGradient><linearGradient id="seal" x2="0" y2="1"><stop stop-color="#748b50"/><stop offset="1" stop-color="#344d37"/></linearGradient></defs><rect width="1200" height="850" fill="url(#paper)"/><rect x="28" y="28" width="1144" height="794" rx="15" fill="none" stroke="#344d37" stroke-width="5"/><rect x="46" y="46" width="1108" height="758" rx="10" fill="none" stroke="#b99b5c" stroke-width="2"/><path d="M75 103h135m780 0h135M75 747h135m780 0h135" stroke="#b99b5c" stroke-width="2"/><text x="600" y="103" text-anchor="middle" font-family="Georgia,serif" font-size="27" letter-spacing="4" fill="#344d37">KEYFLOWS™</text><text x="600" y="137" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" letter-spacing="3" fill="#78816f">PERSONAL PRACTICE ACHIEVEMENT</text><circle cx="600" cy="214" r="46" fill="url(#seal)" stroke="#b99b5c" stroke-width="4"/><circle cx="600" cy="214" r="37" fill="none" stroke="#e6d6ae" stroke-width="1.5"/><text x="600" y="226" text-anchor="middle" font-family="Georgia,serif" font-size="38" fill="#fffdf7">K</text><path d="M280 284h640" stroke="#b99b5c" stroke-width="1.5"/><text x="600" y="331" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" letter-spacing="5" fill="#78816f">CERTIFICATE OF PRACTICE</text><text x="600" y="393" text-anchor="middle" font-family="Georgia,serif" font-size="39" fill="#25352a">${escapeXml(certificate.title)}</text><text x="600" y="446" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" fill="#596357">This personal achievement recognizes</text><text x="600" y="505" text-anchor="middle" font-family="Georgia,serif" font-size="${fontSize}" fill="#344d37">${escapeXml(displayName)}</text><path d="M340 520h520" stroke="#aeb99d" stroke-width="1.5"/>${subtitleLines}<text x="600" y="675" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" fill="#596357">${escapeXml(details)}</text><text x="600" y="712" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#78816f">Issued ${escapeXml(date)} · Informal personal achievement, not independently verified.</text><path d="M330 738h540" stroke="#d4c49b" stroke-width="1"/><text x="600" y="770" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="1.2" fill="#344d37">KEYFLOWS™ BY AYUSH NANDANWAR</text><text x="600" y="792" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#78816f">Generated locally · Not an accredited or independently verified credential</text></svg>`;
}

export function createCertificatePdf({type='completion',name='',date=new Date().toLocaleDateString(),details=''}={}){
  const certificate=certificateTypes[type]||certificateTypes.completion;
  const recipient=String(name||'').trim().slice(0,80).normalize('NFKD').replace(/[^\x20-\x7e]/g,'')||'A dedicated typist';
  const scale=.66,x=value=>(value*scale).toFixed(2),y=value=>((850-value)*scale).toFixed(2),fontSize=value=>(value*scale).toFixed(2);
  const nameSize=Math.min(31,Math.max(15,Math.floor(960/(recipient.length*.56))));
  const circlePath=(cx,cy,r)=>{
    const centerX=Number(x(cx)),centerY=Number(y(cy)),radius=r*scale,handle=radius*.55228475;
    return `${centerX} ${(centerY+radius).toFixed(2)} m ${(centerX+handle).toFixed(2)} ${(centerY+radius).toFixed(2)} ${(centerX+radius).toFixed(2)} ${(centerY+handle).toFixed(2)} ${(centerX+radius).toFixed(2)} ${centerY} c ${(centerX+radius).toFixed(2)} ${(centerY-handle).toFixed(2)} ${(centerX+handle).toFixed(2)} ${(centerY-radius).toFixed(2)} ${centerX} ${(centerY-radius).toFixed(2)} c ${(centerX-handle).toFixed(2)} ${(centerY-radius).toFixed(2)} ${(centerX-radius).toFixed(2)} ${(centerY-handle).toFixed(2)} ${(centerX-radius).toFixed(2)} ${centerY} c ${(centerX-radius).toFixed(2)} ${(centerY+handle).toFixed(2)} ${(centerX-handle).toFixed(2)} ${(centerY+radius).toFixed(2)} ${centerX} ${(centerY+radius).toFixed(2)} c`;
  };
  const operations=['0.98 0.97 0.93 rg 0 0 792 561 re f',`0.20 0.29 0.22 RG ${fontSize(3)} w ${x(28)} ${y(822)} ${x(1144)} ${fontSize(794)} re S`,`0.73 0.60 0.35 RG ${fontSize(2)} w ${x(46)} ${y(804)} ${x(1108)} ${fontSize(758)} re S`,`0.73 0.60 0.35 RG ${fontSize(2)} w ${x(75)} ${y(103)} m ${x(210)} ${y(103)} l ${x(990)} ${y(103)} m ${x(1125)} ${y(103)} l ${x(75)} ${y(747)} m ${x(210)} ${y(747)} l ${x(990)} ${y(747)} m ${x(1125)} ${y(747)} l S`,`0.20 0.29 0.22 rg ${circlePath(600,214,46)} h f`,`0.73 0.60 0.35 RG ${fontSize(4)} w ${circlePath(600,214,46)} h S`,`0.95 0.91 0.80 RG ${fontSize(1.5)} w ${circlePath(600,214,37)} h S`];
  const addCenteredText=(text,font,size,svgY,color='0.20 0.25 0.21')=>{
    const safe=pdfText(text),scaledSize=fontSize(size),width=safe.length*Number(scaledSize)*.27;
    operations.push(`BT /${font} ${scaledSize} Tf ${color} rg ${((792-width)/2).toFixed(2)} ${y(svgY)} Td (${safe}) Tj ET`);
  };
  addCenteredText('KEYFLOWS™','F2',27,103,'0.20 0.29 0.22');
  addCenteredText('PERSONAL PRACTICE ACHIEVEMENT','F1',13,137,'0.42 0.46 0.40');
  addCenteredText('K','F3',38,226,'0.98 0.97 0.93');
  operations.push(`0.73 0.60 0.35 RG ${fontSize(1.5)} w ${x(280)} ${y(284)} m ${x(920)} ${y(284)} l S`);
  addCenteredText('CERTIFICATE OF PRACTICE','F2',18,331,'0.42 0.46 0.40');
  addCenteredText(certificate.title,'F3',39,393,'0.15 0.21 0.17');
  addCenteredText('This personal achievement recognizes','F1',19,446);
  addCenteredText(recipient,'F3',nameSize,505,'0.20 0.29 0.22');
  operations.push(`0.68 0.72 0.61 RG ${fontSize(1.5)} w ${x(340)} ${y(520)} m ${x(860)} ${y(520)} l S`);
  wrapText(certificate.subtitle,88).slice(0,3).forEach((line,index)=>addCenteredText(line,'F1',20,570+index*29,'0.25 0.31 0.26'));
  addCenteredText(details,'F2',17,675,'0.20 0.29 0.22');
  addCenteredText(`Issued ${date} - Informal personal achievement, not independently verified.`,'F1',15,712,'0.42 0.46 0.40');
  operations.push(`0.82 0.77 0.63 RG ${fontSize(1)} w ${x(330)} ${y(738)} m ${x(870)} ${y(738)} l S`);
  addCenteredText('KEYFLOWS™ BY AYUSH NANDANWAR','F2',16,770,'0.20 0.29 0.22');
  addCenteredText('Generated locally - Not an accredited or independently verified credential','F1',11,792,'0.42 0.46 0.40');
  const stream=operations.join('\n'),objects=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 561] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf='%PDF-1.4\n',offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const xrefOffset=pdf.length;
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

export async function createCertificatePng(svgMarkup){
  const imageUrl=URL.createObjectURL(new Blob([svgMarkup],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('The certificate image could not be prepared.'));image.src=imageUrl;});
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=850;
    const context=canvas.getContext('2d');
    if(!context)throw new Error('This browser cannot create a certificate image.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The certificate image could not be downloaded.')),'image/png'));
  }finally{URL.revokeObjectURL(imageUrl);}
}
