// Fitness presentation layer. All records and actions stay in the existing domain modules.
import { S, todayKey } from '../state.js';
import { WORKOUTS, EXERCISES } from '../data.js';
import { esc, t } from '../i18n.js';
import { readCycle, cycleSummary } from '../cycle.js';
import { BUILDERS, UI, el, openSection, toast } from './shared.js';
import { checkInModal, renderHoy } from './hoy.js';

const paths = {
 hoy:'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',
 training:'m5 5 14 14 M3 8l5-5 M16 21l5-5 M2 5l3-3 M19 22l3-3 M5 11l6-6 M13 19l6-6',
 progress:'M4 20h17 M6 15v-4 M12 15V7 M18 15V3',
 wellbeing:'M3 12h4l3-7 4 14 3-7h4',
 profile:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
 arrow:'M5 12h14 M13 6l6 6-6 6',
 clock:'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 rhythm:'M12 3a9 9 0 1 0 9 9 M12 3v5 M16 4l-2 4 M20 7l-4 2',
 nutrition:'M7 3v7 M3 3v4a4 4 0 0 0 8 0V3 M7 11v10 M20 3c-5 2-5 9 0 9V3v18',
 recovery:'M5 12a7 7 0 1 0 7-7 M3 5v7h7',
 mind:'M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9',
 plan:'M4 5h16v16H4Z M8 3v5 M16 3v5 M4 11h16',
 settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
 centro:'M4 21h16 M6 21V9 M10 21V9 M14 21V9 M18 21V9 M3 9l9-5 9 5',
 acceso:'M4 21h16 M6 21V10 M10 21V10 M14 21V10 M18 21V10 M3 10l9-6 9 6 M12 14v3',
 portal:'M4 4h16v16H4Z M4 9h16 M8 13h8 M8 16h5',
};
export const icon = (key) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${(paths[key] || paths.arrow).split(' M').map((d,i)=>`<path d="${i?'M':''}${d}"/>`).join('')}</svg>`;
const friendly = w => (w?.name || '').replace(/^OPERACIÓN:\s*/, '').toLocaleLowerCase('es').replace(/^./,x=>x.toUpperCase());
const route = (key,title,sub,ico=key) => {
 const b=el('button','fit-route',`<span class="fit-route-icon">${icon(ico)}</span><span><strong>${esc(title)}</strong><small>${esc(sub)}</small></span>${icon('arrow')}`);
 b.dataset.destination=key; b.onclick=()=>openSection(key); return b;
};
function sectionTitle(title, action, destination) {
 const h=el('div','fit-section-heading',`<h3>${esc(title)}</h3>`);
 if(action){const b=el('button','fit-text-button',esc(action)+' →');b.onclick=()=>openSection(destination);h.append(b);}return h;
}
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function weekStrip(){
 const now=new Date(),offset=(now.getDay()+6)%7,week=S.weekPlan();
 const strip=el('div','fit-week');strip.setAttribute('aria-label',t('fitness.week'));
 for(let i=0;i<7;i++){
  const day=new Date(now);day.setDate(now.getDate()-offset+i);const key=dateKey(day);
  const done=key===todayKey()?S.data.today.trained:S.data.history.some(h=>h.date===key&&h.workouts);
  const cell=el('div',`fit-day ${i===offset?'current':''} ${done?'done':''}`,`<span>${['L','M','X','J','V','S','D'][i]}</span><b>${day.getDate()}</b><i>${done?'✓':week[i]?'•':'·'}</i>`);
  const state = done ? t('fitness.dayDone') : week[i] ? t('fitness.dayPlanned') : t('fitness.dayRecovery');
  cell.setAttribute('aria-label', t('fitness.dayAria', {
   date: day.toLocaleDateString('es', { weekday:'long', day:'numeric' }),
   state,
   today: i===offset ? t('fitness.todaySuffix') : '',
  }));strip.append(cell);
 }return strip;
}
function home(body){
 body.textContent='';
 const p=S.data.profile,today=S.data.today,active=S.getActiveSession();
 const pending=active&&!['completada','abandonada'].includes(active.status)?active:null;
 const w=S.todayWorkout();const workout=w||WORKOUTS.mobility_flow;
 const head=el('div','fit-welcome',`<div><p>${esc(new Date().toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'}))}</p><h3>Vamos a por ello${p.name?`, ${esc(p.name)}`:''}.</h3><span>Tu próxima versión empieza aquí.</span></div><span class="fit-avatar" aria-hidden="true">${esc((p.name||'B').slice(0,1).toUpperCase())}</span>`);body.append(head,weekStrip());
 const layout=el('div','fit-home-grid');
 const primary=el('div','fit-primary-column');
 const card=el('section','fit-session-card');
 const title=pending?friendly(pending):today.trained?'Sesión completada':friendly(workout);
  const cardCopy = {
   eyebrow: pending ? 'TU SESIÓN GUARDADA' : today.trained ? 'BIEN HECHO' : w ? 'TU SESIÓN DE HOY' : 'HOY, RECUPERA',
   body: pending ? `${pending.logged} de ${pending.plannedSets} series registradas` : today.trained ? 'Cada serie suma. Date tiempo para recuperar.' : esc(workout.desc),
   minutes: pending ? pending.minutes : workout.min,
   suffix: pending ? '' : ' aprox.',
   exercises: pending ? pending.exercises.length : workout.exercises.length,
  };
  const cardHtml = `<div class="fit-card-top"><span class="fit-eyebrow">${cardCopy.eyebrow}</span><span class="fit-session-symbol">${icon('training')}</span></div><h3>${esc(title)}</h3><p>${cardCopy.body}</p><div class="fit-session-meta"><span>${icon('clock')} ${cardCopy.minutes} min${cardCopy.suffix}</span><span>${cardCopy.exercises} ejercicios</span></div>`;
  card.innerHTML=cardHtml;
 const start=el('button','btn btn-primary fit-start',`${pending?'Continuar sesión':today.trained?'Ver mi progreso':w?'Empezar entrenamiento':'Empezar movilidad'} ${icon('arrow')}`);
 start.id='fit-start';start.onclick=()=>pending?UI.actions.resumeSession?.():today.trained?openSection('progress'):UI.actions.openTraining?.(workout.id);card.append(start);primary.append(card);
 primary.append(sectionTitle('El plan, ejercicio a ejercicio','Ver entrenamientos','training'));
 const preview=el('div','fit-exercise-list');
 (pending?.exercises||workout.exercises).slice(0,4).forEach((x,i)=>{
  const row=el('div','fit-exercise',`<span class="fit-ex-number">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(EXERCISES[x.ex]?.name||x.ex)}</strong><small>${esc(EXERCISES[x.ex]?.muscle||'')} · ${x.sets} × ${x.reps}${x.timed||['plank','mobility','breathing'].includes(x.ex)?' s':' reps'}</small></span><span class="fit-ex-check" aria-hidden="true">${icon('training')}</span>`);preview.append(row);
 });primary.append(preview);layout.append(primary);
 const secondary=el('div','fit-secondary-column');secondary.append(sectionTitle('Lo que llevas construido','Ver progreso','progress'));
 const stats=S.data.stats;secondary.append(el('div','fit-stats',`<div><strong>${stats.workouts}</strong><span>entrenamientos</span></div><div><strong>${stats.sets}</strong><span>series registradas</span></div><div><strong>${stats.prs}</strong><span>récords personales</span></div>`));
 const check=el('section','fit-checkin',`<span class="fit-eyebrow">ANTES DE EMPEZAR</span><h3>¿Cómo te sientes hoy?</h3><p>${today.energy==null?'Un momento para escucharte y ajustar el esfuerzo.':`Energía registrada: ${today.energy}/10. Puedes actualizar tus sensaciones.`}</p>`);
 const checkButton=el('button','btn btn-block','Registrar mis sensaciones');checkButton.onclick=checkInModal;check.append(checkButton);secondary.append(check);
 secondary.append(sectionTitle('Entrenar también es cuidarte'));
 secondary.append(route('rhythm','Mi ritmo',readCycle().consent?cycleSummary(readCycle()).guidance:'Ciclo y sensaciones · opcional','rhythm'));
 secondary.append(route('nutrition','Nutrición e hidratación',`${today.water} ml de agua registrados`,'nutrition'));
 secondary.append(route('recovery','Recuperación','Movilidad, sueño y descanso','recovery'));
 layout.append(secondary);body.append(layout);
}
function openTool(id){const b=document.getElementById(id);if(b)b.click();else toast('UN MOMENTO','La herramienta aún se está preparando. Vuelve a intentarlo.');}
export function installFitnessUI(){
 const nav=document.getElementById('panel-nav');
 nav.innerHTML=[['hoy','Hoy'],['training','Entrenar'],['progress','Progreso'],['wellbeing','Bienestar'],['profile','Perfil'],['centro','Centro']].map(([key,label])=>`<button class="rail-btn" data-go="${key}">${icon(key)}<span>${label}</span></button>`).join('');
 BUILDERS.daily=renderHoy;BUILDERS.home=home;BUILDERS.hoy=home;
 BUILDERS.wellbeing=body=>{
  body.append(el('div','fit-page-intro','<span class="fit-eyebrow">EL OTRO LADO DEL ENTRENAMIENTO</span><h3>Cuida lo que te mueve.</h3><p>Comer, descansar y escuchar a tu cuerpo también forman parte de tu plan.</p>'));
  const grid=el('div','fit-route-grid');
  [['rhythm','Mi ritmo','Tu ciclo, tus sensaciones, tus decisiones.'],['nutrition','Nutrición','Comidas, energía e hidratación.'],['recovery','Recuperación','Movilidad y registro de descanso.'],['mind','Calma y respiración','Un espacio para bajar el ritmo.'],['daily','Mis hábitos de hoy','Tus acciones y registros diarios.']].forEach(([key,title,sub])=>grid.append(route(key,title,sub,key==='daily'?'plan':key)));
  const health=route('wellbeing','Mapa de salud','Cuestionario opcional de bienestar.','wellbeing');health.onclick=()=>openTool('bh-launch');grid.append(health);body.append(grid);
 };
 const profile=BUILDERS.profile;
 BUILDERS.profile=body=>{
  profile(body);
  const extras=el('section','fit-settings');extras.append(sectionTitle('Tu espacio'));
  [['plan','Mi planificación','Calendario y programa'],['coachos','Entrenador','Gestionar mi plan'],['core','Consultar al asistente','Orientación local sobre entrenamiento'],['armory','Mi personaje','Personalización y recompensas'],['appearance','Apariencia','Tema, tamaño y movimiento'],['account','Mi cuenta','Conexión y sincronización'],['more','Ajustes y privacidad','Permisos, exportación y datos'],['trabajo','Foco y postura','Pausas durante tu día']].forEach(([key,title,sub])=>extras.append(route(key,title,sub,'settings')));
  for(const [id,title,sub] of [['bv-launch','Cámara de entrenamiento','Registro de movimiento opcional'],['bd-fab','Diario de sesión','Revisar tus series registradas']]){const b=route('profile',title,sub,'training');b.onclick=()=>openTool(id);extras.append(b);}body.append(extras);
 };
 document.getElementById('foot-hint').textContent=t('fitness.tagline');
}
