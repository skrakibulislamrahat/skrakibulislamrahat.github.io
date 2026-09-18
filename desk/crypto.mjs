const enc=new TextEncoder(),dec=new TextDecoder();
const ITERATIONS=600000;
const CONTEXT='rahat-private-desk:';
export function base64(bytes) {
  let s=''; for(let i=0;i<bytes.length;i+=8192) s+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(s);
}
export function unbase64(s) { return Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)); }
async function derive(password,salt) {
  const source=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},source,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function newCipher(password) {
  const salt=crypto.getRandomValues(new Uint8Array(16));
  return {salt:base64(salt),key:await derive(password,salt)};
}
export async function seal(value,cipher,purpose='ledger') {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(CONTEXT+purpose)},cipher.key,enc.encode(JSON.stringify(value)));
  return {format:'private-desk',version:1,algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:ITERATIONS,purpose,salt:cipher.salt,iv:base64(iv),ciphertext:base64(new Uint8Array(encrypted))};
}
export async function open(envelope,password,purpose='ledger') {
  if(!envelope || envelope.format!=='private-desk' || envelope.version!==1 || envelope.algorithm!=='AES-256-GCM' ||
      envelope.kdf!=='PBKDF2-SHA256' || envelope.iterations!==ITERATIONS || envelope.purpose!==purpose ||
      typeof envelope.ciphertext!=='string' || envelope.ciphertext.length>6000000) throw Error('Unsupported encrypted file.');
  const salt=unbase64(envelope.salt),iv=unbase64(envelope.iv);
  if(salt.length!==16 || iv.length!==12) throw Error('Invalid encrypted file.');
  const key=await derive(password,salt);
  let raw;
  try { raw=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode(CONTEXT+purpose)},key,unbase64(envelope.ciphertext)); }
  catch { throw Error('Wrong password, or the encrypted file is damaged.'); }
  return {value:JSON.parse(dec.decode(raw)),cipher:{salt:envelope.salt,key}};
}
export async function wrap(value,password,purpose) { return seal(value,await newCipher(password),purpose); }
