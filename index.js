
/* =========================
   Game State & Config
   ========================= */
const MAX_OVERS = 5;
const BALLS_PER_OVER = 6;
const MAX_BALLS = MAX_OVERS * BALLS_PER_OVER;

const IND_PLAYERS = [
  "Yashasvi Jaiswal","KL Rahul","Sai Sudharsan","Shubman Gill (c)","Rishabh Pant (wk)",
  "Ravindra Jadeja","Washington Sundar","Shardul Thakur","Anshul Kamboj","Jasprit Bumrah","Mohammed Siraj"
];
const AUS_PLAYERS = [
  "David Warner","Mitchell Marsh","Steven Smith","Marnus Labuschagne","Glenn Maxwell",
  "Cameron Green","Alex Carey (wk)","Pat Cummins (c)","Mitchell Starc","Josh Hazlewood","Adam Zampa"
];

let innings = 1;
let battingTeam = [...IND_PLAYERS];
let bowlingTeam = [...AUS_PLAYERS];

let totalScore = 0;
let wickets = 0;
let ballsBowled = 0;
let currentBatsman = 0;
let firstInningsScore = 0;
let target = 0;

let runsByPlayer = new Array(11).fill(0);
let foursByPlayer = new Array(11).fill(0);
let sixesByPlayer = new Array(11).fill(0);
let overLogs = []; // array of arrays: each inner array is outcomes for that over

/* =========================
   Elements
   ========================= */
const runDisplay = document.getElementById('runDisplay');
const progress = document.getElementById('progress');
const btnPlay = document.getElementById('btnPlay');
const btnNew = document.getElementById('btnNew');
const btnSave = document.getElementById('btnSave');
const btnExport = document.getElementById('btnExport');
const btnSaved = document.getElementById('btnSaved');
const btnSound = document.getElementById('btnSound');
const topScore = document.getElementById('topScore');
const scoreBig = document.getElementById('scoreBig');
const oversInfo = document.getElementById('oversInfo');
const ballsLeftEl = document.getElementById('ballsLeft');
const strikerName = document.getElementById('strikerName');
const batsmanRuns = document.getElementById('batsmanRuns');
const batsman4s = document.getElementById('batsman4s');
const batsman6s = document.getElementById('batsman6s');
const overTimeline = document.getElementById('overTimeline');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const toastIcon = document.getElementById('toastIcon');
const leftPlayers = document.getElementById('leftPlayers');
const rightPlayers = document.getElementById('rightPlayers');
const modal = document.getElementById('modal');
const saveList = document.getElementById('saveList');
const exportAllBtn = document.getElementById('exportAll');
const clearAllBtn = document.getElementById('clearAll');
const closeModalBtn = document.getElementById('closeModal');

/* sound state */
let soundOn = false;
let audioCtx = null;
function ensureAudio(){ if(!audioCtx){ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } }
function beep(f=440, t=0.06, g=0.05, type='sine'){ if(!soundOn) return; ensureAudio(); const o = audioCtx.createOscillator(); const ga = audioCtx.createGain(); o.type=type; o.frequency.value=f; ga.gain.value=g; o.connect(ga); ga.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime+t); }

/* toast show */
function showToast(type, text){
  toastText.textContent = text;
  toastIcon.textContent = type==='4' ? '🏏' : type==='6' ? '💥' : '❌';
  toast.className = 'toast show '+(type==='4'?'four':type==='6'?'six':'out');
  toast.setAttribute('aria-hidden','false');
  if(type==='4'){ beep(720,0.14,0.06,'triangle'); beep(1000,0.1,0.04,'sine'); }
  else if(type==='6'){ beep(1200,0.18,0.08,'sawtooth'); beep(680,0.12,0.05,'sine'); }
  else { beep(320,0.12,0.09,'sine'); beep(220,0.14,0.07,'sawtooth'); }
  setTimeout(()=>{
    toast.className = 'toast';
    toast.setAttribute('aria-hidden','true');
  },900);
}

/* update radar progress (0-1) */
function setProgress(percent){
  const radius = 102;
  const circumference = 2 * Math.PI * radius; // 641.5
  const offset = circumference * (1 - percent);
  progress.style.strokeDashoffset = offset;
}

/* update UI displays */
function updateDisplays(){
  const overs = Math.floor(ballsBowled / BALLS_PER_OVER);
  const balls = ballsBowled % BALLS_PER_OVER;
  
  topScore.textContent = `Total ${totalScore}/${wickets} (${overs}.${balls})`;
  scoreBig.textContent = `${totalScore}/${wickets}`;
  oversInfo.textContent = `${overs}.${balls} overs`;
  ballsLeftEl.textContent = Math.max(0, MAX_BALLS - ballsBowled);
  strikerName.textContent = battingTeam[currentBatsman] || 'Player';
  batsmanRuns.textContent = runsByPlayer[currentBatsman] || 0;
  batsman4s.textContent = foursByPlayer[currentBatsman] || 0;
  batsman6s.textContent = sixesByPlayer[currentBatsman] || 0;
  // update player lists
  leftPlayers.innerHTML = battingTeam.slice(0).map((p,i)=>`${i+1}. ${p} &nbsp;&nbsp;&nbsp;&nbsp; ${runsByPlayer[i]||0} &nbsp;&nbsp;&nbsp;&nbsp; ${foursByPlayer[i]||0} &nbsp;&nbsp; ${sixesByPlayer[i]||0}`).join('<br><br>');
//   rightPlayers.innerHTML = AUS_PLAYERS.slice().map((p,i)=>`${i+1}. ${p} &nbsp;&nbsp; ${runsByPlayer[i+6]||0} &nbsp;&nbsp; ${foursByPlayer[i+6]||0} &nbsp;&nbsp; ${sixesByPlayer[i+6]||0}`).join('<br>');
  renderOverTimeline();
  // progress: use balls progress for subtle ring, percent = ballsBowled / MAX_BALLS
  setProgress(Math.min(1, ballsBowled / MAX_BALLS));
}

/* write a ball to over logs */
function logBall(outcome){
  const overIndex = Math.floor(ballsBowled / BALLS_PER_OVER);
  if(!overLogs[overIndex]) overLogs[overIndex] = [];
  overLogs[overIndex].push(outcome);
  renderOverTimeline();
}

/* render over timeline */
function renderOverTimeline(){
  overTimeline.innerHTML = '';
  for(let i=0;i<overLogs.length;i++){
    if(!overLogs[i]) continue;
    const d = document.createElement('div');
    d.className = 'bubble';
    d.textContent = `${i+1}: ${overLogs[i].join(' ')}`;
    d.title = `Over ${i+1}`;
    overTimeline.appendChild(d);
  }
}

/* end innings & match */
function endInnings(reason){
  if(innings === 1){
    firstInningsScore = totalScore;
    showToast('out', `INNINGS OVER: ${reason}`);
    setTimeout(()=> startSecondInnings(), 900);
  } else {
    // decide result
    let res;
    if(totalScore > target) {
      res = `Australia wins by ${10 - wickets} wicket(s)`;
    } else if(totalScore < target) {
      res = `India wins by ${target - totalScore} run(s)`;
    } else res = 'Match tied';
    showToast('out', `MATCH OVER — ${res}`);
    btnPlay.disabled = true;
  }
}

/* start second innings */
function startSecondInnings(){
  innings = 2;
  battingTeam = [...AUS_PLAYERS];
  bowlingTeam = [...IND_PLAYERS];
  target = firstInningsScore;
  totalScore = 0; wickets = 0; ballsBowled = 0; currentBatsman = 0;
  runsByPlayer = new Array(11).fill(0);
  foursByPlayer = new Array(11).fill(0);
  sixesByPlayer = new Array(11).fill(0);
  overLogs = [];
  updateDisplays();
  setTimeout(()=> { showToast('out', `AUS need ${target + 1} to win`); });
  btnPlay.disabled = false;
  runDisplay.textContent = outcome;
}

/* restart match */
function newMatch(){
  innings = 1; battingTeam = [...IND_PLAYERS]; bowlingTeam = [...AUS_PLAYERS];
  totalScore = 0; wickets = 0; ballsBowled = 0; currentBatsman = 0; firstInningsScore = 0; target = 0;
  runsByPlayer = new Array(11).fill(0);
  foursByPlayer = new Array(11).fill(0);
  sixesByPlayer = new Array(11).fill(0);
  overLogs = [];
  btnPlay.disabled = false;
  updateDisplays();
  showToast('out', 'New match started');
}

/* simulate ball outcome */
function playBall(){
  if(wickets >= 10 || ballsBowled >= MAX_BALLS) return;
  if(innings === 2 && totalScore > target) { endInnings('target achieved'); return; }

  // weighted random outcomes
  const r = Math.random() * 100;
  let outcome;
  if(r < 10) outcome = 'W';
  else if(r < 30) outcome = 0;
  else if(r < 60) outcome = 1;
  else if(r < 72) outcome = 2;
  else if(r < 75) outcome = 3;
  else if(r < 87) outcome = 4;
  else outcome = 6;

  ballsBowled++;
  // handle wicket
  if(outcome === 'W'){
    wickets++;
    logBall('W');
    showToast('out', `WICKET — ${battingTeam[currentBatsman]}`);
    // record final batsman stats (already in arrays)
    currentBatsman = Math.min(currentBatsman + 1, battingTeam.length - 1);
  } else {
    // normal run
    totalScore += outcome;
    runsByPlayer[currentBatsman] += outcome;
    if(outcome === 4){
      foursByPlayer[currentBatsman] += 1;
      showToast('4', 'FOUR!');
    } else if(outcome === 6){
      sixesByPlayer[currentBatsman] += 1;
      showToast('6', 'SIX!');
    }
    logBall(outcome);
    // rotate strike on odd
    if(outcome === 1 || outcome === 3){
      currentBatsman = Math.min(currentBatsman + 1, battingTeam.length - 1);
    }
  }

  // animate meter for last ball
  runDisplay.textContent = (outcome === 'W' ? 'W' : outcome === 0 ? '·' : outcome);
  runDisplay.style.transform = 'scale(1.05)';
  setTimeout(()=> runDisplay.style.transform = '', 160);

  updateDisplays();

  // check end conditions
  if(wickets >= 10){
    endInnings(`${innings===1 ? 'India' : 'Australia'} all out`);
    return;
  }
  if(ballsBowled >= MAX_BALLS){
    endInnings(`${innings===1 ? 'India' : 'Australia'} overs complete`);
    return;
  }
  if(innings === 2 && totalScore > target){
    endInnings('target achieved');
    return;
  }
}

/* sound toggle */
btnSound.addEventListener('click', ()=>{
  soundOn = !soundOn;
  btnSound.textContent = `Sound: ${soundOn ? 'ON':'OFF'}`;
  if(soundOn){ ensureAudio(); audioCtx && audioCtx.resume && audioCtx.resume(); }
});

/* new match */
btnNew.addEventListener('click', ()=> {
  if(confirm('Start a new match? Current state will be reset.')) newMatch();
});

/* play button binding and keyboard space */
btnPlay.addEventListener('click', ()=> playBall());
window.addEventListener('keydown', (e)=> {
  if(e.code === 'Space' && !document.activeElement.matches('input,button')) {
    e.preventDefault(); playBall();
  }
});

/* initial render */
setProgress(0);
updateDisplays();

/* mild entrance animation for progress circle */
let animProgress = 0;
const animateInit = setInterval(()=>{
  animProgress += 0.02;
  setProgress(animProgress);
  if(animProgress >= 0.02) clearInterval(animateInit);
}, 20);

/* keep UI neat on resize */
window.addEventListener('resize', ()=> { /* placeholder if needed */ });
