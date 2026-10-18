// BAYONA · Mi Universo: el usuario importa voluntariamente su archivo personal.
// Solo se almacena CIFRADO en este dispositivo. Nunca entra en S.data ni en Supabase.
import { el, elT, openSection, toast } from './shared.js';
import { normalizeArchive, archiveSummary, findProjects, encryptArchive, decryptArchive, validateFileSize, VAULT_KEY } from '../personal/archive.js';

let unlockedArchive = null;

function getVault() {
  try { return JSON.parse(localStorage.getItem(VAULT_KEY) || 'null'); } catch { return null; }
}
function download(name, value) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function button(label,fn,klass='btn btn-block') {
  const b=elT('button',klass,label);b.type='button';b.addEventListener('click',fn);return b;
}
function content(elm, title, value) {
  if(!value) return;
  const row=el('div','kv');row.append(elT('span','k',title),elT('span','v',value));elm.appendChild(row);
}

export function renderPersonalArchive(body) {
  body.textContent='';
  body.appendChild(button('← VOLVER A MÁS',()=>openSection('more'),'btn btn-ghost btn-block'));
  body.appendChild(elT('div','sec-label','MI UNIVERSO · ARCHIVO PERSONAL'));
  const head=el('div','card shine');
  head.appendChild(elT('h4','','TU HISTORIA. TUS PROYECTOS. TU FUTURO.'));
  head.appendChild(elT('div','sub','Una memoria de proyectos que controlas tú. Nada se sube a servidores ni se añade a la memoria de otros usuarios.'));body.appendChild(head);
  const vault=getVault();
  if (!unlockedArchive) {
    const box=el('div','card');
    const label=elT('label','sub',vault?'DESBLOQUEAR ARCHIVO PRIVADO':'IMPORTAR Y PROTEGER TU HISTORIA');
    const pass=el('input','input');pass.type='password';pass.autocomplete='new-password';pass.placeholder='Frase privada (mínimo 12 caracteres)';pass.setAttribute('aria-label','Frase de protección del archivo');
    box.append(label,pass);
    if(vault) {
      box.appendChild(button('DESBLOQUEAR',async()=>{
        try { unlockedArchive=await decryptArchive(vault,pass.value);renderPersonalArchive(body); }
        catch(e){toast('NO SE PUDO ABRIR',e.message,'danger');}
      }));
    } else {
      const input=el('input','input');input.type='file';input.accept='.json,application/json';input.setAttribute('aria-label','Seleccionar archivo BAYONA JSON o copia cifrada');
      box.appendChild(input);
      box.appendChild(button('IMPORTAR Y CIFRAR',async()=>{
        try {
          const file=input.files?.[0];if(!file)throw new Error('Selecciona el archivo JSON.');
          validateFileSize(file.size);
          const source=JSON.parse(await file.text());
          const isVault=source?.format==='bayona-private-vault';
          const parsed=isVault?await decryptArchive(source,pass.value):normalizeArchive(source);
          const encrypted=isVault?source:await encryptArchive(parsed,pass.value);
          localStorage.setItem(VAULT_KEY,JSON.stringify(encrypted));
          unlockedArchive=parsed;toast('ARCHIVO IMPORTADO','Bóveda privada disponible en este dispositivo.');renderPersonalArchive(body);
        }catch(e){toast('NO SE PUDO IMPORTAR',e.message||'Comprueba el archivo.','danger');}
      }));
    }
    box.appendChild(elT('div','media-caption','No utilizamos datos privados precargados. Esta bóveda local usa AES-GCM; si pierdes la frase y no conservas el JSON original o una copia, no se puede recuperar. Puedes volver a importar una copia cifrada con la misma frase. Tu progreso de entrenamiento no se modifica.'));
    body.appendChild(box);return;
  }
  const doc=unlockedArchive;const stats=archiveSummary(doc);
  const title=el('div','card');title.appendChild(elT('h4','',doc.owner||'MI UNIVERSO'));
  content(title,'MISIÓN',doc.mission);content(title,'PROYECTOS',String(stats.projects));content(title,'HITOS',String(stats.milestones));
  if(doc.principles.length) title.appendChild(elT('div','sub',doc.principles.join(' · ')));
  body.appendChild(title);
  const actions=el('div','opt-row');
  actions.appendChild(button('COPIA CIFRADA',()=>download('bayona-universo-cifrado.json',getVault()),'btn'));
  actions.appendChild(button('BLOQUEAR',()=>{unlockedArchive=null;renderPersonalArchive(body);},'btn'));
  actions.appendChild(button('ELIMINAR BÓVEDA',()=>{
    if(!window.confirm('Se borrará el archivo privado cifrado de este dispositivo. La copia JSON original no se modifica. ¿Eliminar?'))return;
    localStorage.removeItem(VAULT_KEY);unlockedArchive=null;renderPersonalArchive(body);toast('BÓVEDA ELIMINADA','Archivo local eliminado.');
  },'btn btn-danger'));
  body.appendChild(actions);
  const search=el('input','input');search.type='search';search.placeholder='Buscar proyectos…';search.setAttribute('aria-label','Buscar proyectos');
  const categories=el('select','input');categories.setAttribute('aria-label','Filtrar por área');
  const all=el('option','', 'Todas las áreas');all.value='';categories.appendChild(all);
  const areas=[...new Set(doc.projects.map(p=>p.area||'Otros'))].sort();
  for(const area of areas){const o=elT('option','',area);o.value=area;categories.appendChild(o);}
  body.append(search,categories);
  const list=el('div','archive-projects');body.appendChild(list);
  const renderList=()=>{
    list.textContent='';const matches=findProjects(doc,search.value,categories.value);
    list.appendChild(elT('div','sec-label',`PROYECTOS · ${matches.length}`));
    for(const p of matches){const card=el('details','card');const sum=elT('summary','',p.name);card.appendChild(sum);
      content(card,'ÁREA',p.area);content(card,'ESTADO',p.status);content(card,'DESDE',p.since);
      if(p.description)card.appendChild(elT('p','sub',p.description));
      if(p.next)content(card,'SIGUIENTE',p.next);list.appendChild(card);
    }
    if(!matches.length)list.appendChild(elT('div','sub','No hay proyectos con ese filtro.'));
  };
  search.addEventListener('input',renderList);categories.addEventListener('change',renderList);renderList();
  if(doc.milestones.length){body.appendChild(elT('div','sec-label','LÍNEA DE TIEMPO'));
    for(const m of [...doc.milestones].sort((a,b)=>b.date.localeCompare(a.date))){const card=el('details','card');card.appendChild(elT('summary','',`${m.date||'Sin fecha'} · ${m.title}`));
      if(m.detail)card.appendChild(elT('div','sub',m.detail));body.appendChild(card);}
  }
  body.appendChild(elT('div','media-caption','Archivo local cifrado: NO sincronizado con ChatGPT, Google Drive ni Supabase. Para usarlo en otro móvil, conserva el JSON original e impórtalo allí.'));
}