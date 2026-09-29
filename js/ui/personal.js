import { S } from '../state.js';
import { esc, t } from '../i18n.js';
import { BUILDERS, el, openSection } from './shared.js';
import { GOALS, EXPERIENCE, AVAILABILITY, EQUIPMENT, validateProfile, profileWeek } from '../personalization.js';
import { readCycle, saveCycle, logCycle, deleteCycle, cycleSummary, localDate } from '../cycle.js';
const select = (id, label, values, selected) => `<label for="${id}">${label}</label><select id="${id}" name="${id}">${values.map(v => `<option value="${esc(v)}" ${String(v) === String(selected) ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
const status = (form, text, error = false) => { const n = form.querySelector('[role="status"]'); n.textContent = text; n.dataset.error = String(error); };
function hero(kicker, title, sub) {
  return el('div', 'personal-hero', `<div class="personal-eyebrow">${kicker}</div><h3>${title}</h3><p>${sub}</p>`);
}
BUILDERS.profile = (body) => {
  body.textContent = '';
  body.scrollTop = 0;
  body.append(hero('HECHO PARA TU VIDA', 'Tu punto de partida.<br>Tu siguiente paso.', 'Un plan sostenible empieza por el tiempo y el material que tienes. Puedes cambiarlo cuando quieras.'));
  const p = S.data.profile;
  const form = el('form', 'personal-form card');
  form.innerHTML = `<label for="profile-name">${esc(t("personal.name"))}</label><input id="profile-name" name="name" maxlength="18" value="${esc(p.name)}" autocomplete="given-name" placeholder="Tu nombre o apodo">
    ${select('goal','Tu objetivo',GOALS,p.goal)}
    ${select('experience','Tu experiencia',EXPERIENCE,p.experience || EXPERIENCE[1])}
    ${select('availability','Tu semana',AVAILABILITY,p.availability || AVAILABILITY[1])}
    ${select('equipment','Tu material',EQUIPMENT,p.equipment || EQUIPMENT[1])}
    ${select('sessionMinutes','Minutos por sesión · duración aproximada',[15,30,45,60],p.sessionMinutes || 30)}
    <p class="personal-note">La propuesta semanal se adapta a tu disponibilidad y material. Con mancuernas o bandas empezamos con una base de peso corporal; puedes elegir otros protocolos. Las sesiones asignadas por tu entrenador y una sesión ya iniciada se conservan.</p>
    <div class="personal-week" aria-label="${esc(t("personal.weekPreview"))}"></div>
    <button class="btn btn-primary btn-block" type="submit">GUARDAR MI PERFIL</button><p role="status" aria-live="polite"></p>`;
  const preview = () => {
    const data = Object.fromEntries(new FormData(form));
    const days = profileWeek(data);
    form.querySelector('.personal-week').innerHTML = days.map((x,i) => `<div class="${x ? 'planned' : ''}"><span>${['L','M','X','J','V','S','D'][i]}</span><b>${x === 'mobility_flow' ? '↝' : x ? '●' : '—'}</b></div>`).join('');
  };
  form.addEventListener('change',preview);
  form.onsubmit = e => {
    e.preventDefault();
    try {
      const next = validateProfile(Object.fromEntries(new FormData(form)));
      const old = {...S.data.profile};
      Object.assign(S.data.profile,next);
      if (!S.save()) { S.data.profile = old; throw new Error('No se pudo guardar. Revisa el espacio del dispositivo y reintenta.'); }
      status(form,'Perfil guardado. Tu calendario ya está actualizado.');
    } catch(error) { status(form,error.message,true); }
  };
  body.append(form); preview();
  const btn = el('button','btn btn-block','VER MI ENTRENAMIENTO'); btn.onclick = () => openSection('training'); body.append(btn);
};
BUILDERS.rhythm = (body) => {
  body.textContent = '';
  body.scrollTop = 0;
  const data = readCycle();
  const summary = cycleSummary(data);
  body.append(hero('ESCUCHA TU CUERPO', 'Cada día cuenta.<br>A tu ritmo.', 'Tu ciclo es parte de tu contexto. Tus sensaciones y tus decisiones guían la sesión de hoy.'));
  const privacy = el('div','card personal-privacy',`<h4>${data.consent ? 'DIARIO ACTIVADO' : 'TÚ ELIGES QUÉ REGISTRAR'}</h4><p>Opcional, sin fotos y sin conexión a la nube. Los datos se guardan en este navegador; quien tenga acceso a este perfil del dispositivo puede verlos. Puedes borrarlos cuando quieras.</p>`);
  body.append(privacy);
  if (data.consent) {
    const metrics = el('div','personal-metrics');
    metrics.innerHTML = `<div><span>${esc(t("cycle.since"))}</span><strong>${summary.day ? `Día ${summary.day}` : 'Sin fecha'}</strong></div><div><span>PRÓXIMO INICIO · ESTIMACIÓN</span><strong>${summary.next !== null ? `En ~${summary.next} días` : 'Sin estimación'}</strong></div>`;
    body.append(metrics);
    body.append(el('p','personal-note','La fecha prevista es orientativa. No confirma ovulación ni fertilidad y no sirve como anticonceptivo. Si el ciclo es irregular o hay anticoncepción hormonal, no mostramos predicciones.'));
    const entry = summary.entry;
    const daily = el('form','personal-form card');
    daily.innerHTML = `<div class="card-row"><h4>${esc(t("cycle.today"))}</h4><span class="pill">${esc(localDate())}</span></div>
      ${select('pain','Molestias',['ninguno','leve','moderado','intenso'],entry?.pain || '')}
      ${select('energy','Energía',['baja','media','alta'],entry?.energy || '')}
      ${select('mode','Hoy prefiero',['habitual','suave','descanso'],entry?.mode || 'habitual')}
      <label class="personal-check"><input type="checkbox" name="bleeding" ${entry?.bleeding ? 'checked' : ''}>He tenido sangrado hoy</label>
      <p class="personal-note">Suave reduce las series de tu misión de hoy hasta un 70%, conservando al menos una por ejercicio. Descanso deja la decisión en tus manos. Ninguna opción resta puntos.</p>
      <button type="submit" class="btn btn-primary btn-block">${entry ? 'ACTUALIZAR' : 'GUARDAR'} MI DÍA</button><p role="status" aria-live="polite"></p>`;
    if (!entry) for (const id of ['pain','energy']) { const s = daily.querySelector('#'+id); s.insertAdjacentHTML('afterbegin','<option value="" selected>Elige una opción</option>'); s.required = true; }
    daily.onsubmit = e => {
      e.preventDefault();
      try { const d = Object.fromEntries(new FormData(daily)); logCycle({...d,bleeding:d.bleeding === 'on'}); BUILDERS.rhythm(body); const msg = body.querySelector('[data-saved]'); msg.textContent = t("cycle.saved"); msg.focus({preventScroll:true}); }
      catch(error) { status(daily,'No se ha guardado: '+error.message,true); }
    };
    body.append(daily);
    body.append(el('p','personal-note','<span role="status" tabindex="-1" data-saved></span>'));
    body.append(el('div','card personal-guidance',`<h4>TU SESIÓN DE HOY</h4><p>${esc(summary.guidance)}</p>`));
    const train = el('button','btn btn-block',entry?.mode === 'descanso' ? 'VER RECUPERACIÓN' : 'VER MI ENTRENAMIENTO');
    train.onclick = () => openSection(entry?.mode === 'descanso' ? 'recovery' : 'training'); body.append(train);
    if (data.entries.length) {
      const history = el('details','card personal-history');
      history.innerHTML = `<summary>${esc(t("cycle.history"))} · ${data.entries.length}</summary><p class="personal-note">Conservamos hasta 90 días registrados; puedes actualizar el día actual.</p>${data.entries.slice(-14).reverse().map(e => `<div class="personal-history-row"><time>${esc(e.date)}</time><span>Energía ${esc(e.energy)} · molestias ${esc(e.pain)}<br>${e.bleeding ? 'Con sangrado · ' : ''}${esc(e.mode)}</span></div>`).join('')}`;
      body.append(history);
    }
  }
  const settings = el('details','card personal-settings'); settings.open = !data.consent;
  settings.innerHTML = `<summary>${data.consent ? 'AJUSTAR MI DIARIO' : 'ACTIVAR MI DIARIO OPCIONAL'}</summary>`;
  const config = el('form','personal-form');
  config.innerHTML = `<label for="cycle-start">${esc(t("cycle.start"))}</label><input id="cycle-start" name="start" type="date" max="${localDate()}" value="${esc(data.start)}">
    <label for="cycle-length">Duración habitual del ciclo en días</label><input id="cycle-length" name="length" type="number" min="15" max="90" step="1" value="${data.length}" required>
    <label class="personal-check"><input type="checkbox" name="regular" ${data.regular ? 'checked' : ''}>Mis ciclos suelen ser regulares</label>
    <label class="personal-check"><input type="checkbox" name="hormonal" ${data.hormonal ? 'checked' : ''}>Uso anticoncepción hormonal</label>
    <label class="personal-check"><input type="checkbox" name="consent" required ${data.consent ? 'checked' : ''}>Quiero guardar estos datos sensibles en este dispositivo para llevar mi diario. Entiendo que es opcional.</label>
    <button type="submit" class="btn btn-primary btn-block">${data.consent ? 'GUARDAR AJUSTES' : 'ACTIVAR DIARIO'}</button><p role="status" aria-live="polite"></p>`;
  config.onsubmit = e => {
    e.preventDefault();
    try { const d = Object.fromEntries(new FormData(config)); saveCycle({...d,regular:d.regular === 'on',hormonal:d.hormonal === 'on',consent:d.consent === 'on'}); BUILDERS.rhythm(body); }
    catch(error) { status(config,'No se ha guardado: '+error.message,true); }
  };
  settings.append(config); body.append(settings);
  if (data.consent) {
    const danger = el('details','card personal-settings');
    danger.innerHTML = `<summary>${esc(t("cycle.deleteTitle"))}</summary><p>${esc(t("cycle.deleteText"))}</p>`;
    const remove = el('button','btn btn-block','CONFIRMAR BORRADO DEL DIARIO');
    remove.onclick = () => { try { deleteCycle(); BUILDERS.rhythm(body); } catch { remove.textContent = t("cycle.deleteError"); } }; danger.append(remove); body.append(danger);
  }
  body.append(el('p','personal-note','Si no menstruas, no quieres registrarlo o tu situación es distinta, puedes usar BAYONA con normalidad sin activar este diario.'));
};
export function rhythmTrainingCard() {
  const data = readCycle(); if (!data.consent) return null;
  const s = cycleSummary(data);
  const card = el('div','card personal-guidance',`<div class="card-row"><h4>MI RITMO HOY</h4><span class="pill">${s.entry ? esc(s.entry.mode.toUpperCase()) : 'SIN REGISTRO'}</span></div><p>${esc(s.guidance)}</p>`);
  const b = el('button','btn btn-block','ACTUALIZAR MIS SENSACIONES'); b.onclick=()=>openSection('rhythm'); card.append(b); return card;
}
