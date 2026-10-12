// BAYONA · user experience shell
// The user app stays intentionally simple; specialist tools remain behind rooms.
import { S, todayKey } from '../state.js';
import { esc, t } from '../i18n.js';
import { BUILDERS, UI, el, openSection, toast } from './shared.js';
import { renderHoy } from './hoy.js';
import { todaysSession } from '../engine.js';
import { decideNow } from '../now.js';
import { lifeMissions } from '../game/missions.js';
import { activeOrNextItem, dayProgress, localDateKey, plannerItemsForDate } from '../planner.js';
import {
  PLAN_META, planFromProfile, featureForSection, hasFeature, featureTier,
} from '../entitlements.js';

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

function quickRoute(key,title,sub,ico='arrow'){
  const plan=planFromProfile(S.data.profile);
  const feature=featureForSection(key);
  const locked=feature&&!hasFeature(plan,feature);
  const required=locked?PLAN_META[featureTier(feature)]?.label:null;
  const b=el('button','fit-hub-quick',`<span class="fit-hub-quick-icon">${icon(ico)}</span><span><strong>${esc(title)}</strong><small>${esc(sub)}</small></span><em>${locked?esc(required):icon('arrow')}</em>`);
  b.type='button';
  b.dataset.destination=key;
  if(locked)b.dataset.locked='true';
  b.onclick=()=>openSection(key);
  return b;
}

function runNowAction(decision,w){
  if(!decision)return;
  if(decision.action==='resume')return UI.actions.resumeSession?.();
  if(decision.action==='train')return w?UI.actions.openTraining?.(w.id):openSection('training');
  if(decision.action==='recover')return UI.actions.openTraining?.('mobility_flow');
  if(decision.action==='progress')return openSection('progress');
  if(decision.action==='planner')return openSection('planner');
  return openSection('core');
}

function askBayona(prompt=t('now.changedPrompt')){
  if(UI.actions.openCoachAsk)return UI.actions.openCoachAsk(prompt);
  openSection('core');
  requestAnimationFrame(()=>UI.actions.askCoach?.(prompt));
}

function nowNeed(label,sub,kind,action){
  const b=el('button',`fit-now-need fit-now-need-${kind}`);
  b.type='button';
  b.innerHTML=`<strong>${esc(label)}</strong><small>${esc(sub)}</small>`;
  b.onclick=action;
  return b;
}

function home(body){
  body.textContent='';
  const p=S.data.profile,today=S.data.today,active=S.getActiveSession();
  const w=S.todayWorkout();
  const detail=S.readinessDetail();
  const adjusted=todaysSession();
  const plannerContext=activeOrNextItem(S.data.life, new Date());
  const missionContext=lifeMissions({life:S.data.life,today,date:today.date});
  const decision=decideNow({
    profile:p,
    today,
    readinessDetail:detail,
    activeSession:active,
    workout:w,
    adjustedSession:adjusted,
    plannerContext,
    missionContext,
    history:S.data.history,
  });

  const avatar=p.face
    ? `<img src="${esc(p.face)}" alt="">`
    : `<span>${esc((p.name&&p.name!=='TÚ'?p.name:'B').slice(0,1).toUpperCase())}</span>`;
  const now=new Date();
  const clock=now.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
  const day=now.toLocaleDateString('es',{weekday:'long'});
  const membership=PLAN_META[planFromProfile(p)]?.label || 'FREE';
  const head=el('section','fit-app-head fit-now-head',`
    <div>
      <small>${esc(clock)} · ${esc(day)}</small>
      <h2>${p.name&&p.name!=='TÚ'?`Hola, ${esc(p.name.split(/\s+/)[0])}.`:'Ahora.'}</h2>
      <span>TU CUERPO · TU CONTEXTO · ${esc(membership)}</span>
    </div>
    <button class="fit-profile-chip" type="button" aria-label="Abrir mi perfil">${avatar}</button>`);
  head.querySelector('.fit-profile-chip').onclick=()=>openSection('profile');
  body.append(head);

  if(detail.score==null&&today.energy==null){
    body.append(moodStrip(today,()=>home(body)));
  }

  const hero=el('section',`fit-now-card is-${decision.kind}`);
  const score=decision.status.score==null?'—':String(decision.status.score);
  hero.innerHTML=`
    <div class="fit-now-top">
      <span>${esc(decision.kicker)}</span>
      <span class="fit-now-status"><b>${esc(score)}</b><small>${esc(decision.status.label)}</small></span>
    </div>
    <div class="fit-now-copy">
      <h3>${esc(decision.title)}</h3>
      <p>${esc(decision.body)}</p>
      <div class="fit-now-insight">${esc(decision.insight)}</div>
    </div>`;
  const actions=el('div','fit-now-actions');
  const primary=el('button','fit-now-primary',decision.actionLabel);
  primary.type='button';
  primary.onclick=()=>runNowAction(decision,w);
  const changed=el('button','fit-now-secondary',t('now.ui.changed'));
  changed.type='button';
  changed.onclick=()=>askBayona(decision.secondaryPrompt);
  actions.append(primary,changed);
  hero.append(actions);
  body.append(hero);

  body.append(el('div','fit-now-question',`<span>${esc(t('now.ui.question'))}</span><small>${esc(t('now.ui.questionHint'))}</small>`));
  const needs=el('section','fit-now-needs');
  needs.append(
    nowNeed(t('now.ui.train'),t('now.ui.trainSub'),'train',()=>w?UI.actions.openTraining?.(w.id):openSection('training')),
    nowNeed(t('now.ui.eat'),t('now.ui.eatSub'),'eat',()=>openSection('nutrition')),
    nowNeed(t('now.ui.recover'),t('now.ui.recoverSub'),'recover',()=>openSection('recovery')),
    nowNeed(t('now.ui.ask'),t('now.ui.askSub'),'ask',()=>askBayona())
  );
  body.append(needs);

  const ask=el('button','fit-now-ask');
  ask.type='button';
  ask.innerHTML=`<span>◈</span><strong>${esc(t('now.ui.askButton'))}</strong><small>${esc(t('now.ui.askExamples'))}</small>`;
  ask.onclick=()=>askBayona();
  body.append(ask);

  const planDate=localDateKey();
  const planItems=plannerItemsForDate(S.data.life,planDate);
  const planProgress=dayProgress(S.data.life,planDate);
  const pendingPlan=planItems.filter(x=>x.status==='planned').slice(0,2);
  const dayCard=el('button','fit-life-day');
  dayCard.type='button';
  dayCard.innerHTML=`
    <span class="fit-life-day-kicker">${esc(t('planner.home.kicker'))} · ${esc(t('game.missions.summary',{done:missionContext.done,total:missionContext.total}))}</span>
    <div class="fit-life-day-head"><strong>${esc(pendingPlan.length?t('planner.home.pending',{count:planProgress.pending}):t('planner.home.empty'))}</strong><b>${esc(String(planProgress.done))}/${esc(String(planProgress.total))}</b></div>
    <div class="fit-life-day-list">${pendingPlan.length?pendingPlan.map(item=>`<span><i>${esc(item.start||'·')}</i><em>${esc(item.title)}</em></span>`).join(''):`<span><em>${esc(t('planner.empty.body'))}</em></span>`}</div>
    <small>${esc(t('planner.home.open'))} →</small>`;
  dayCard.onclick=()=>openSection('planner');
  body.append(dayCard);

  body.append(el('div','fit-week-title',`<span>${esc(t('now.ui.week'))}</span><small>${esc(t('now.ui.weekHint'))}</small>`));
  body.append(weekStrip());

  const more=el('div','fit-now-more');
  const plan=el('button','',t('now.ui.plan'));
  const armory=el('button','',t('now.ui.armory'));
  const privacy=el('button','',t('now.ui.privacy'));
  plan.onclick=()=>openSection('plan');
  armory.onclick=()=>openSection('armory');
  privacy.onclick=()=>openSection('more');
  more.append(plan,armory,privacy);
  body.append(more);
}

function openTool(id){
  const b=document.getElementById(id);
  if(b)b.click();
  else toast('UN MOMENTO','La herramienta aún se está preparando. Vuelve a intentarlo.');
}

export function installFitnessUI(){
  const nav=document.getElementById('panel-nav');
  nav.innerHTML=[
    ['hoy',t('now.nav')],
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
    ].forEach(([key,title,sub])=>extras.append(
      key==='plan' ? quickRoute(key,title,sub,'settings') : route(key,title,sub,'settings')
    ));
    body.append(extras);
  };

  document.getElementById('foot-hint').textContent=t('fitness.tagline');

  // BAYONA siempre está a un toque. No es navegación: es la puerta directa
  // al cerebro contextual desde cualquier pantalla del atleta.
  let fab=document.getElementById('bayona-now-fab');
  if(!fab){
    fab=el('button','fit-bayona-fab');
    fab.id='bayona-now-fab';
    fab.type='button';
    fab.setAttribute('aria-label',t('now.ui.fabAria'));
    fab.innerHTML='<span>◈</span><strong>BAYONA</strong>';
    fab.onclick=()=>askBayona();
    document.body.append(fab);
  }
}
