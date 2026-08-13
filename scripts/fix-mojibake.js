// Mojibake repair for .md files (maintenance utility).
// Reverses CP1252->UTF-8 mis-decoding by re-encoding high-char runs to CP1252
// bytes and decoding as UTF-8, iterated up to 5 passes per run until stable.
const fs = require('fs');
const path = require('path');
const cp1252Inv = {
  0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,
  0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,
  0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,
  0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F
};
function toByte(cp){ if(cp<0x80) return cp; if(cp>=0xA0&&cp<=0xFF) return cp; if(cp1252Inv[cp]!==undefined) return cp1252Inv[cp]; return -1; }
function decodeRun(run){
  const bytes=[]; for(const ch of run){ const b=toByte(ch.codePointAt(0)); if(b<0) return null; bytes.push(b); }
  let d; try { d=Buffer.from(bytes).toString('utf8'); } catch { return null; }
  if(d.indexOf('\uFFFD')!==-1) return null; return d;
}
function repair(s){
  return s.replace(/[\u0080-\uFFFF]+/g, (run)=>{ let cur=run; for(let i=0;i<5;i++){ const d=decodeRun(cur); if(d===null||d===cur) break; cur=d; } return cur; });
}
function walk(d){ let r=[]; for(const e of fs.readdirSync(d,{withFileTypes:true})){ const p=path.join(d,e.name); if(e.isDirectory()){ if(e.name==='node_modules')continue; r=r.concat(walk(p)); } else if(e.name.endsWith('.md') || e.name.endsWith('.ts')) r.push(p); } return r; }
let changed=0; for(const f of walk('.')){ const o=fs.readFileSync(f,'utf8'); const fixed=repair(o); if(fixed!==o){ fs.writeFileSync(f,fixed,'utf8'); changed++; console.log('fixed:',f); } }
console.log('files fixed:',changed);
