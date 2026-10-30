// Main contains Node and Deno tests. Run each suite with its native runtime.
import {readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=readdirSync('scripts/tests').filter(name=>name.endsWith('.test.ts')).sort().map(name=>'scripts/tests/'+name);
const deno=files.filter(file=>/Deno\.test/.test(readFileSync(file,'utf8')));
const node=files.filter(file=>!deno.includes(file));
for(const [runtime,args] of [[process.execPath,['--import','tsx','--test',...node]],['deno',['test','--no-check','--allow-read','--allow-env',...deno]]]){
 if(!args.length)continue;
 const result=spawnSync(runtime,args,{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
