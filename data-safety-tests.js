// Проверки безопасности резервных копий и пользовательских раскладов.
// Запуск: node data-safety-tests.js
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(__dirname+'/app.js','utf8');
const start=src.indexOf('function validateCustomSpread(x){');
const end=src.indexOf('\nfunction init(){',start);
if(start<0||end<0)throw new Error('Не найдены функции проверки пользовательских раскладов');
const store=new Map();
const sandbox={
  APP_VERSION:'4.3.1 Universal',
  settings:{theme:'night'}, readings:[], spreads:[{id:'daily',name:'Карта дня',count:1,positions:[['focus','Фокус','Главная тема']]}],
  cards:JSON.parse(fs.readFileSync(__dirname+'/cards.json','utf8')),
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},
  Date, JSON, Set, Array, Number, String, Boolean, RegExp
};
vm.createContext(sandbox);
vm.runInContext(src.slice(start,end)+'\nthis.validateCustomSpread=validateCustomSpread;this.loadCustomSpreads=loadCustomSpreads;this.saveCustomSpreads=saveCustomSpreads;this.mergeCustomSpreads=mergeCustomSpreads;this.archivePayload=archivePayload;this.studyArchivePayload=studyArchivePayload;this.studyState=studyState;',sandbox);
const studyStart=src.indexOf('function validateArchiveStudy(');
const studyEnd=src.indexOf('\ndocument.addEventListener("change"',studyStart);
if(studyStart<0||studyEnd<0)throw new Error('Не найдены функции прогресса школы');
const studySandbox={cards:sandbox.cards,studyState:{learned:{},weak:{},correct:0,total:0},saveStudy:()=>true,Math,Number,Set,Array,String,Boolean,Object};
vm.createContext(studySandbox);
vm.runInContext(src.slice(studyStart,studyEnd)+'\nthis.validateArchiveStudy=validateArchiveStudy;this.mergeArchiveStudy=mergeArchiveStudy;',studySandbox);
let passed=0,failed=0;
function test(n,f){try{f();console.log('✓ '+n);passed++}catch(e){console.error('✗ '+n+' — '+e.message);failed++}}
function assert(v,m){if(!v)throw Error(m)}
const valid={id:'custom-123',name:'Мой расклад',description:'Проверка',count:2,positions:[['p1','Фокус','Главная тема'],['p2','Шаг','Следующее действие']]};
test('валидная пользовательская схема проходит проверку',()=>assert(sandbox.validateCustomSpread(valid),'не принята'));
test('пустое название схемы отклоняется',()=>assert(!sandbox.validateCustomSpread({...valid,name:'  '}),'принята пустая схема'));
test('более десяти позиций отклоняются',()=>assert(!sandbox.validateCustomSpread({...valid,count:11,positions:Array.from({length:11},(_,i)=>['p'+i,'Имя','Описание'])}),'принята схема >10 позиций'));
test('повторяющиеся ID позиций отклоняются',()=>assert(!sandbox.validateCustomSpread({...valid,positions:[['p1','Один','Описание'],['p1','Два','Описание']]}),'приняты повторные позиции'));
test('слишком длинные поля отклоняются',()=>assert(!sandbox.validateCustomSpread({...valid,name:'x'.repeat(81)}),'принято слишком длинное имя'));
test('импорт схем сохраняет встроенные и добавляет пользовательские',()=>{sandbox.spreads=[{id:'daily',name:'Карта дня'}];const r=sandbox.mergeCustomSpreads([valid]);assert(sandbox.spreads.some(x=>x.id==='daily')&&sandbox.spreads.some(x=>x.id==='custom-123')&&r.added===1,'неверное слияние')});
test('повторный импорт не дублирует пользовательскую схему',()=>{const before=sandbox.spreads.length;const r=sandbox.mergeCustomSpreads([valid]);assert(sandbox.spreads.length===before&&r.added===0,'схема продублирована')});
test('резервная копия версии 6 содержит историю, схемы и прогресс школы',()=>{sandbox.readings=[{id:'r1'}];sandbox.studyState.learned={'major-00':true};sandbox.studyState.correct=3;sandbox.studyState.total=4;const a=sandbox.archivePayload();assert(a.version===6&&a.readings.length===1&&a.customSpreads.some(x=>x.id==='custom-123'),'неполный архив');assert(a.study&&a.study.learned.includes('major-00')&&a.study.correct===3,'в архиве нет прогресса школы')});
test('прогресс школы проходит проверку и объединяется без потери текущего',()=>{Object.assign(studySandbox.studyState,{learned:{'major-01':true},weak:{},correct:2,total:5});const r=studySandbox.mergeArchiveStudy({learned:['major-00'],weak:['жезлы-2'],correct:4,total:9});assert(r.ok&&r.learned===1&&r.weak===1,'слияние не добавило карты');assert(studySandbox.studyState.learned['major-00']&&studySandbox.studyState.learned['major-01'],'потерян текущий прогресс');assert(studySandbox.studyState.correct===4&&studySandbox.studyState.total===9,'счётчики не объединены по максимуму')});
test('некорректный прогресс школы отклоняется',()=>{assert(!studySandbox.validateArchiveStudy({learned:['нет-такой-карты']}),'принят неизвестный id');assert(!studySandbox.validateArchiveStudy({learned:['major-00','major-00']}),'принят дубль');assert(!studySandbox.validateArchiveStudy({learned:['major-00'],correct:5,total:2}),'приняты счётчики correct > total');assert(!studySandbox.validateArchiveStudy('школа'),'принята строка вместо объекта');assert(studySandbox.validateArchiveStudy({}),'пустой объект должен быть допустим')});
test('импорт ограничивает число пользовательских схем 100',()=>{const many=Array.from({length:110},(_,i)=>({...valid,id:'custom-cap-'+i}));sandbox.spreads=[{id:'daily',name:'Карта дня'}];const r=sandbox.mergeCustomSpreads(many);assert(sandbox.spreads.filter(x=>String(x.id).startsWith('custom-')).length===100&&r.rejected===10,'лимит 100 не соблюдён')});
test('конструктор не позволяет сохранить больше 100 пользовательских схем',()=>assert(src.includes('Можно сохранить не более 100 пользовательских раскладов'),'нет ограничения в интерфейсе'));
test('обычный импорт принимает архивы v1–v6 и старый массив',()=>assert(src.includes('[1,2,3,4,5,6].includes(parsed.version)')&&src.includes('Array.isArray(parsed)?parsed'),'нет совместимости'));
test('зашифрованный импорт сохраняет совместимость v1 и v2',()=>assert(src.includes('![1,2].includes(obj.version)')&&src.includes('payload.version>=2?mergeCustomSpreads'),'нет совместимости encrypted backup'));
test('импорт откатывает состояние при ошибке сохранения',()=>assert(src.includes('readings=beforeReadings;spreads=beforeSpreads;studyState=beforeStudy;'),'нет отката при ошибке'));
test('редакционные поля основных значений уникальны для всех 78 карт',()=>{const c=JSON.parse(fs.readFileSync(__dirname+'/cards.json','utf8'));for(const f of ['core','relationships','thoughts','actions','work','obstacles','result','positive','shadow'])assert(new Set(c.map(x=>x[f])).size===78,'повтор в поле '+f)});
console.log(`\nИтог: ${passed} пройдено, ${failed} ошибок, всего ${passed+failed} проверок.`);if(failed)process.exitCode=1;
