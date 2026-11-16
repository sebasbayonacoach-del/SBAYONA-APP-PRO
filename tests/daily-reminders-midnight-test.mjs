// Regresión APP 6.0: ventana de entrenamiento y deduplicación al cruzar medianoche.
import assert from 'node:assert/strict';
import { dueDailyReminder } from '../js/notifications/daily.js';

const plan = { grupos: [{ items: [{ id: 'sesion', titulo: 'Entrenamiento', done: false }] }] };
const preferences = { asked: true, morning: false, evening: false, preTraining: true, preTrainingAt: '23:45' };
const at = (day, hour, minute) => new Date(2026, 10, day, hour, minute);
const due = (now, sent = [], prefs = preferences) => dueDailyReminder({ plan, preferences: prefs, now, sent });

const before = due(at(16, 23, 50));
assert.equal(before?.id, '2026-11-16:preTraining', 'El aviso debe aparecer antes de medianoche');

const after = due(at(17, 0, 10));
assert.equal(after?.id, '2026-11-16:preTraining', 'Debe conservar la fecha original tras medianoche');
assert.equal(due(at(17, 0, 10), [before.id]), null, 'No debe duplicarse tras medianoche');
assert.equal(due(at(17, 0, 31)), null, 'Debe terminar al superar los 45 minutos');
assert.equal(due(at(16, 23, 44)), null, 'No debe enviarse antes de la hora configurada');
assert.equal(due(at(16, 23, 50), [], { ...preferences, asked: false }), null, 'Sin consentimiento no debe enviar');
assert.equal(due(at(16, 23, 50), [], { ...preferences, preTraining: false }), null, 'Desactivado no debe enviar');
console.log('PASS: 7 comprobaciones de recordatorios APP 6.0');
