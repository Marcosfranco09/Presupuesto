// Keep the hero's layout intact; a decorative copy travels behind the quote.
const astronautSlot = document.querySelector('.astronaut');
const astronautSource = astronautSlot.querySelector('img');
const summaryCard = document.querySelector('.summary');
const traveler = astronautSource.cloneNode();
traveler.className = 'astronaut-traveler';
traveler.setAttribute('aria-hidden', 'true');
document.body.append(traveler);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let origin;
let scrollFrame = 0;
function measureAstronaut() {
  const rect = astronautSource.getBoundingClientRect();
  origin = {x: rect.left + rect.width / 2, y: rect.top + scrollY + rect.height / 2, width: rect.width};
  positionAstronaut();
}
function positionAstronaut() {
  scrollFrame = 0;
  if (!origin) return;
  const card = summaryCard.getBoundingClientRect();
  const targetX = card.left + card.width / 2;
  const targetY = card.top + card.height / 2;
  // The astronaut descends slightly in the viewport until the card catches it.
  const floatingY = origin.y + scrollY * .12;
  const y = Math.min(floatingY, targetY);
  const distance = Math.max(1, targetY + scrollY - origin.y);
  const progress = Math.max(0, Math.min(1, scrollY * 1.12 / distance));
  const ease = progress * progress * (3 - 2 * progress);
  const destinationWidth = Math.min(420, card.width * .95);
  const width = origin.width + (destinationWidth - origin.width) * ease;
  const height = width * 638 / 800;
  const x = origin.x + (targetX - origin.x) * ease;
  const entry = Math.max(0, Math.min(1, (y + height * .42 - card.top) / Math.max(1, card.height / 2 + height * .42)));
  traveler.hidden = reducedMotion.matches;
  astronautSlot.classList.toggle('scroll-active', !reducedMotion.matches);
  traveler.style.width = `${width}px`;
  traveler.style.transform = `translate3d(${x - width / 2}px, ${y - height / 2}px, 0)`;
  traveler.style.filter = `blur(${entry * 3.5}px)`;
  traveler.style.opacity = String(1 - entry * .3);
}
function requestAstronautFrame() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(positionAstronaut);
}
addEventListener('scroll', requestAstronautFrame, {passive:true});
addEventListener('resize', measureAstronaut);
reducedMotion.addEventListener('change', measureAstronaut);
new ResizeObserver(measureAstronaut).observe(summaryCard);
astronautSource.addEventListener('load', measureAstronaut);
measureAstronaut();
