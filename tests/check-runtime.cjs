// No dependencies: exercise the real inline functions with controlled clocks and BMKG responses.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/../panel-kontrol.html','utf8');
const slotSource = source.slice(source.indexOf('function workSlot('), source.indexOf('let workQueue'));
const ctx = vm.createContext({Intl, Date}); vm.runInContext(slotSource,ctx);
for (const [date, expected] of [
 ['2026-11-09T00:30:00Z',true],['2026-11-09T09:00:00Z',true],
 ['2026-11-13T09:00:00Z',false],['2026-11-13T09:30:00Z',true],
 ['2026-11-14T00:30:00Z',false],['2026-11-15T09:00:00Z',false],
 ['2026-11-09T00:29:00Z',false],['2026-11-13T00:30:00Z',true]
]) assert.equal(ctx.workSlot(new Date(date)).due,expected,date);
let shown=0, request;
const elements = new Map();
function el(id) { if (!elements.has(id)) elements.set(id,{textContent:'',classList:{add(){},remove(){}},title:''});return elements.get(id); }
const now = Date.now();
let quake={Magnitude:'5.2',DateTime:new Date(now).toISOString(),Coordinates:'-3.763,102.4',Wilayah:'Bengkulu',Dirasakan:'III MMI'};
const qctx=vm.createContext({Date,Number,Math,AbortSignal,console,
 currentDisplayConfig:{quakeConfig:{autoEnable:true,radiusKm:250}},
 BENGKULU_TENGAH_COORD:{lat:-3.763,lon:102.4},KOTA_BENGKULU_COORD:{lat:-3.8,lon:102.26},
 lastSeenQuakeKey:'', document:{getElementById:el},localStorage:{setItem(){}},
 fetch:async(url,opts)=>{request=opts;return {ok:true,json:async()=>({Infogempa:{gempa:quake}})}},showQuakeAlertModal:()=>shown++});
vm.runInContext(source.slice(source.indexOf('function calcQuakeDistanceKm'),source.indexOf('function playEmergencySirenBeep')),qctx);
vm.runInContext(source.slice(source.indexOf('async function pollBmkgRealtimeBengkulu'),source.indexOf('\npollBmkgRealtimeBengkulu();')),qctx);
(async()=>{
 await qctx.pollBmkgRealtimeBengkulu();assert.equal(shown,1);assert.equal(request.cache,'no-store');
 await qctx.pollBmkgRealtimeBengkulu();assert.equal(shown,1,'deduplicate repeated feed');
 quake={...quake,DateTime:new Date(now-86400000).toISOString()};
 await qctx.pollBmkgRealtimeBengkulu();assert.equal(shown,1,'old event must not sound a fresh alarm');
 qctx.fetch=async()=>{throw Error('offline')};await qctx.pollBmkgRealtimeBengkulu();
 assert.equal(el('bmkg-hdr-txt').textContent,'Data tidak tersedia');
 console.log('13 checks passed: WIB workday boundaries, BMKG freshness, deduplication, cache and offline status');
})().catch(e=>{console.error(e);process.exitCode=1});
