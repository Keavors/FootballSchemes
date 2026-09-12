/* У кого на шаге изогнутая стрелка перемещения: id → изгиб */
/* Стрелки перемещения по игрокам: id → стрелка (в ней изгиб и точки пути) */
function moveBends(f, P) {
  const out = {};
  (f.arrows || []).forEach(a => { if (a.kind === 'move' && a.target && P[a.target]) out[a.target] = a; });
  return out;
}
/* Изгиб паса, по которому мяч летит к новому владельцу или в точку */
/* Стрелка паса, по которой летит мяч к новому владельцу или в точку */
function passBend(f, ball) {
  if (!ball) return null;
  return (f.arrows || []).find(x => x.kind !== 'move' && x.to && (ball.owner
    ? x.to.e === ball.owner
    : (x.to.p && Array.isArray(ball.at) && Math.hypot(x.to.p[0] - ball.at[0], x.to.p[1] - ball.at[1]) < 3))) || null;
}
/* Очерёдность внутри шага: кто двигается первым, кто следом.
   Возвращает число очередей и номер очереди для каждого игрока, стрелки и мяча. */
function frameOrders(f, P) {
  const ent = {}, arrow = {};
  let phases = 1;
  const num = v => Math.max(1, Math.min(4, Math.round(+v || 1)));
  (f.arrows || []).forEach(a => {
    const n = num(a.ord);
    arrow[a.id] = n;
    phases = Math.max(phases, n);
    if (a.kind === 'move' && a.target) ent[a.target] = n;
  });
  const eord = f.ord || {};
  for (const id in eord) {
    const n = num(eord[id]);
    ent[id] = n;
    phases = Math.max(phases, n);
  }
  for (const id in P) if (!ent[id]) ent[id] = 1;
  let ball = 1;
  if (f.ball) {
    const pass = (f.arrows || []).find(a => a.kind !== 'move' && a.to && (f.ball.owner
      ? a.to.e === f.ball.owner
      : (a.to.p && Array.isArray(f.ball.at) && Math.hypot(a.to.p[0] - f.ball.at[0], a.to.p[1] - f.ball.at[1]) < 3)));
    if (pass) ball = arrow[pass.id] || 1;
    else if (f.ball.owner && ent[f.ball.owner]) ball = ent[f.ball.owner];
  }
  return { phases, ent, arrow, ball };
}