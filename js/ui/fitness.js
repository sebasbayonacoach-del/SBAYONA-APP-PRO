// BAYONA · user experience shell
// The user app stays intentionally simple; specialist tools remain behind rooms.
import { S, todayKey } from '../state.js';
import { esc, t } from '../i18n.js';
import { BUILDERS, UI, el, openSection, toast } from './shared.js';
import { renderHoy } from './hoy.js';
import { PLAN_META, planFromProfile } from '../entitlements.js';

const paths = {
  hoy:'M3 10 12 3l9 7v10H3Z M9 20v-7h6v7',
  training:'m5 5 14 14 M3 8l5-5 M16 21l5-5 M2 5l3-3 M19 22l3-3 M5 11l6-6 M13 19l6-6',
  progress:'M4 20h17 M6 15v-4 M12 15V7 M18 15V3',
  wellbeing:'M3 12h4l3-7 4 14 3-7h4',
  profile:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  arrow:'M5 12h14 M13 6l6 6-6 6',
  nutrition:'M7 3v7 M3 3v4a4 4 0 0 0 8 0V3 M7 11v10 M20 3c-5 2-5 9 0 9V3v18',
  recovery:'M5 12a7 7 0 1 0 7-7 M3 5v7h7',
  plan:'M4 5h16v16H4Z M8 3v5 M16 3v5 M4 11h16',
  settings:'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
};
export const icon = (key) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${(paths[key] || paths.arrow).split(' M').map((d,i)=>`<path d="${i?'M':''}${d}"/>`).join('')}</svg>`;

const friendly = (w) => (w?.name || '').replace(/^OPERACIÓN:\s*/, '').toLocaleLowerCase('es').replace(/^./,x=>x.toUpperCase());
const route = (key,title,sub,ico=key) => {
  const b=el('button','fit-route',`<span class="fit-route-icon">${icon(ico)}</span><span><strong>${esc(title)}</strong><small>${esc(sub)}</small></span>${icon('arrow')}`);
  b.dataset.destination=key;
  b.onclick=()=>openSection(key);
  return b;
};
function sectionTitle(title) {
  return el('div','fit-section-heading',`<h3>${esc(title)}</h3>`);
}
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function weekStrip(){
  const now=new Date(),offset=(now.getDay()+6)%7,week=S.weekPlan();
  const strip=el('div','fit-week');
  strip.setAttribute('aria-label',t('fitness.week'));
  for(let i=0;i<7;i++){
    const day=new Date(now);day.setDate(now.getDate()-offset+i);const key=dateKey(day);
    const done=key===todayKey()?S.data.today.trained:S.data.history.some(h=>h.date===key&&h.workouts);
    const cell=el('div',`fit-day ${i===offset?'current':''} ${done?'done':''}`,`<span>${['L','M','X','J','V','S','D'][i]}</span><b>${day.getDate()}</b><i>${done?'✓':week[i]?'•':'·'}</i>`);
    const state=done?t('fitness.dayDone'):week[i]?t('fitness.dayPlanned'):t('fitness.dayRecovery');
    cell.setAttribute('aria-label',t('fitness.dayAria',{
      date:day.toLocaleDateString('es',{weekday:'long',day:'numeric'}),
      state,
      today:i===offset?t('fitness.todaySuffix'):'',
    }));
    strip.append(cell);
  }
  return strip;
}

function moodStrip(today,rerender){
  const wrap=el('section','fit-mood');
  wrap.innerHTML=t("fitness.moodPrompt");
  const row=el('div','fit-mood-row');
  const moods=[
    ['😴',2,'Muy baja'],
    ['😕',4,'Baja'],
    ['🙂',6,'Bien'],
    ['😊',8,'Muy bien'],
    ['⚡',10,'A tope'],
  ];
  moods.forEach(([emoji,value,label])=>{
    const b=el('button','fit-mood-btn',emoji);
    b.type='button';
    b.setAttribute('aria-label',`Energía: ${label}`);
    b.setAttribute('aria-pressed',String(today.energy!=null&&Math.abs(today.energy-value)<=1));
    b.onclick=()=>{
      const wasEmpty = today.energy == null;
      S.logEnergy(value);
      toast('GUARDADO',label);
      if (wasEmpty) window.dispatchEvent(new CustomEvent('bayona:first-mood-recorded', { detail:{ value, label } }));
      rerender();
    };
    row.append(b);
  });
  wrap.append(row);
  return wrap;
}

function room(key,title,sub,ico=key){
  const b=el('button','fit-room',`<span class="fit-room-icon">${icon(ico)}</span><span><strong>${esc(title)}</strong><small>${esc(sub)}</small></span><b>${icon('arrow')}</b>`);
  b.type='button';
  b.onclick=()=>openSection(key);
  return b;
}

function home(body){
  body.textContent='';
  const p=S.data.profile,today=S.data.today,active=S.getActiveSession(),stats=S.data.stats;
  const pending=active&&!['completada','abandonada'].includes(active.status)?active:null;
  const w=S.todayWorkout();

  const avatar=p.face
    ? `<img src="${esc(p.face)}" alt="">`
    : `<span>${esc((p.name&&p.name!=='TÚ'?p.name:'B').slice(0,1).toUpperCase())}</span>`;
  const greeting=p.name&&p.name!=='TÚ'?`Hola, ${esc(p.name)}.`:'Tu día.';
  const membership=PLAN_META[planFromProfile(p)]?.label || 'FREE';
  const head=el('section','fit-app-head',`
    <div>
      <small>${esc(new Date().toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'}))}</small>
      <h2>${greeting}</h2>
      <span>BAYONA ONE · ${esc(String(p.goal||'TU OBJETIVO').replace(' Y ',' · '))} · ${esc(membership)}</span>
    </div>
    <button class="fit-profile-chip" type="button" aria-label="Abrir mi perfil">${avatar}</button>`);
  head.querySelector('.fit-profile-chip').onclick=()=>openSection('profile');
  body.append(head);

  if((stats?.workouts||0)===0&&!today.trained&&!pending){
    body.append(el('div','fit-first-guide',`
      <strong>EMPIEZA AQUÍ</strong>
      <span><i>1</i> cómo estás</span>
      <span><i>2</i> tu sesión</span>
      <span><i>3</i> tu progreso</span>`));
  }

  body.append(moodStrip(today,()=>home(body)));

  const hero=el('section','fit-today-hero');
  const title=pending?friendly(pending):today.trained?'Hecho por hoy':w?friendly(w):'Hoy no tienes sesión';
  const meta=pending
    ? `${pending.logged} / ${pending.plannedSets} series`
    : today.trained
      ? 'Entrenamiento completado'
      : w
        ? `${w.min} min · ${w.exercises.length} ejercicios`
        : 'Tu cuerpo también progresa cuando descansa';
  hero.innerHTML=`<div class="fit-today-top"><span>HOY</span><span>${today.trained?'✓':''}</span></div><h3>${esc(title)}</h3><p>${esc(meta)}</p>`;
  const action=el('button','fit-today-action',
    pending?'Retomar sesión':today.trained?'Ver progreso':w?'Empezar':'Ver entrenamientos');
  action.type='button';
  action.onclick=()=>pending
    ? UI.actions.resumeSession?.()
    : today.trained
      ? openSection('progress')
      : w
        ? UI.actions.openTraining?.(w.id)
        : openSection('training');
  hero.append(action);
  body.append(hero);

  body.append(el('div','fit-house-title','<span>TU ESPACIO</span><small>Todo lo demás vive aquí.</small>'));
  const rooms=el('section','fit-room-grid');
  rooms.append(
    room('training','Entrenar','Sesiones y ejercicios','training'),
    room('nutrition','Comer','Nutrición e hidratación','nutrition'),
    room('recovery','Recuperar','Sueño y descanso','recovery'),
    room('progress','Evolucionar','Historial y cambios','progress')
  );
  body.append(rooms);

  body.append(el('div','fit-week-title','<span>ESTA SEMANA</span>'));
  body.append(weekStrip());
}

function openTool(id){
  const b=document.getElementById(id);
  if(b)b.click();
  else toast('UN MOMENTO','La herramienta aún se está preparando. Vuelve a intentarlo.');
}

export function installFitnessUI(){
  const nav=document.getElementById('panel-nav');
  nav.innerHTML=[
    ['hoy','Inicio'],
    ['training','Entrenar'],
    ['progress','Progreso'],
    ['profile','Perfil'],
  ].map(([key,label])=>`<button class="rail-btn" data-go="${key}">${icon(key)}<span>${label}</span></button>`).join('');

  BUILDERS.daily=renderHoy;
  BUILDERS.home=home;
  BUILDERS.hoy=home;

  // Conservado para enlaces internos; ya no compite en la navegación principal.
  BUILDERS.wellbeing=body=>{
    body.append(el('div','fit-page-intro','<span class="fit-eyebrow">TU BIENESTAR</span><h3>Lo que sostiene tu día.</h3>'));
    const grid=el('div','fit-route-grid');
    [
      ['nutrition','Nutrición','Comidas e hidratación.'],
      ['recovery','Recuperación','Sueño, descanso y movilidad.'],
      ['rhythm','Mi ritmo','Registro personal opcional.'],
      ['daily','Registro del día','Tus acciones de hoy.'],
    ].forEach(([key,title,sub])=>grid.append(route(key,title,sub,key==='daily'?'plan':key)));
    const health=route('wellbeing','Salud','Cuestionario opcional.','wellbeing');
    health.onclick=()=>openTool('bh-launch');
    grid.append(health);
    body.append(grid);
  };

  const profile=BUILDERS.profile;
  BUILDERS.profile=body=>{
    profile(body);
    const extras=el('section','fit-settings');
    extras.append(sectionTitle('Más'));
    [
      ['plan','Mi planificación','Calendario y programa'],
      ['appearance','Mi imagen','Foto y apariencia'],
      ['account','Mi cuenta','Cuenta y sincronización'],
      ['more','Privacidad','Permisos, exportación y datos'],
    ].forEach(([key,title,sub])=>extras.append(route(key,title,sub,'settings')));
    body.append(extras);
  };

  document.getElementById('foot-hint').textContent=t('fitness.tagline');
}
