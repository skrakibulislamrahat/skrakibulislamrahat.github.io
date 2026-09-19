import {base64,unbase64} from './crypto.mjs';
export const OWNER='skrakibulislamrahat';
export class GitHubVault {
  constructor(repo,token,fetcher=globalThis.fetch.bind(globalThis)) {
    if(!/^[A-Za-z0-9_.-]{1,100}$/.test(repo)) throw Error('Enter a repository name, without a URL or owner.');
    if(!token.startsWith('github_pat_')) throw Error('Use a fine-grained GitHub token starting with github_pat_.');
    this.repo=repo;this.token=token;this.fetcher=fetcher;this.branch=null;
    this.base='https://api.github.com/repos/'+OWNER+'/'+encodeURIComponent(repo);
  }
  async request(path,options={},missing=false) {
    let response;
    try {response=await this.fetcher(this.base+path,{...options,cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',
      headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.token,'X-GitHub-Api-Version':'2022-11-28',...(options.body?{'Content-Type':'application/json'}:{})},
      signal:AbortSignal.timeout(25000)});}
    catch(error) {
      if(error?.name==='TimeoutError'||error?.name==='AbortError') throw Error('GitHub took too long to respond. Retry opening the desk; if you were saving, refresh to check whether the save completed.');
      throw Error('The browser could not complete the GitHub request. Reload this page and try again.');
    }
    if(missing && response.status===404) return null;
    if(response.status===409 || response.status===422) throw Error('The GitHub copy may have changed on another device. Refresh, review the latest entries, then try again.');
    if(response.status===401) throw Error('Your GitHub token expired or is invalid. Lock, then choose “Change connection”.');
    if(response.status===403) throw Error('GitHub refused access. Check token Contents read/write permission and expiry, or try again after a rate limit clears.');
    if(response.status===404) throw Error('Repository not found. Create the private repository and allow this token to access it.');
    if(!response.ok) throw Error('GitHub could not complete this request ('+response.status+'). Your previous saved records are unchanged; refresh to check.');
    return response.json();
  }
  async verify() {
    const repo=await this.request('');
    if(repo.private!==true || repo.owner?.login?.toLowerCase()!==OWNER.toLowerCase()) throw Error('Use your own PRIVATE repository. Work records cannot be saved to a public repository.');
    if(repo.archived || repo.disabled) throw Error('This repository is archived or disabled.');
    if(repo.permissions && repo.permissions.push===false) throw Error('This token needs Contents: read and write for the private repository.');
    this.branch=repo.default_branch;
    return repo;
  }
  async read() {
    await this.verify();
    const f=await this.request('/contents/vault.json?ref='+encodeURIComponent(this.branch),{},true);
    if(!f) return null;
    if(f.type!=='file' || f.encoding!=='base64' || !f.content) throw Error('The encrypted file is too large or unsupported. Download a backup from GitHub before making changes.');
    let envelope;
    try {envelope=JSON.parse(new TextDecoder().decode(unbase64(f.content)));} catch {throw Error('The saved vault is not a valid encrypted file.');}
    return {sha:f.sha,envelope};
  }
  async write(envelope,sha) {
    await this.verify();
    const text=JSON.stringify(envelope);
    if(new TextEncoder().encode(text).length>900000) throw Error('This vault is near its file limit. Download a backup before adding more records.');
    const payload={message:'Update encrypted work ledger',branch:this.branch,content:base64(new TextEncoder().encode(text))};
    if(sha) payload.sha=sha;
    const result=await this.request('/contents/vault.json',{method:'PUT',body:JSON.stringify(payload)});
    if(!result.content?.sha) throw Error('GitHub did not confirm the save. Refresh to check its status.');
    return result.content.sha;
  }
  clear() {this.token='';}
}
