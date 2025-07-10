const SCREEN_KIT = document.getElementById("screen-kit");
const SCREEN_SETUP = document.getElementById("screen-setup");
const SCREEN_GAME = document.getElementById("screen-game");
const SCREEN_LEADER = document.getElementById("screen-leaderboard");

const KIT_BTNS = document.querySelectorAll(".kit-buttons button");
const KIT_ACTIONS = document.getElementById("kit-actions");
const INP_CODE = document.getElementById("input-code");
const BTN_HOST = document.getElementById("btn-host");
const BTN_JOIN = document.getElementById("btn-join");

const SETUP_TITLE = document.getElementById("setup-title");
const SETUP_CODE = document.getElementById("setup-code");
const INP_NAME = document.getElementById("input-name");
const BTN_ENTER = document.getElementById("btn-enter");

const GAME_CODE = document.getElementById("game-code");
const TIMER = document.getElementById("timer");
const GAME_AREA = document.getElementById("game-area");
const BTN_QUESTION = document.getElementById("btn-question");
const Q_UI = document.getElementById("question-ui");
const Q_TEXT = document.getElementById("question-text");
const ANSWER_OPTS = document.getElementById("answer-options");
const FEEDBACK = document.getElementById("feedback");

const LB_LIST = document.getElementById("leaderboard-list");
const BTN_RESTART = document.getElementById("btn-restart");

const AREA=400, SIZE=40, SPEED=8, DECAY=0.4, GAIN=20, DURATION=300;
let selectedKit="", mode="", gameCode="", me=null, players=[], timer=0, asking=false, keys={};

KIT_BTNS.forEach(b=>{
  b.onclick = ()=>{
    KIT_BTNS.forEach(x => x.classList.remove("selected"));
    b.classList.add("selected");
    selectedKit = b.dataset.kit;
    KIT_ACTIONS.classList.remove("hidden");
  };
});

BTN_HOST.onclick = ()=>{ mode="host"; gameCode=randCode(); startSetup(); };
BTN_JOIN.onclick = ()=>{ if(!INP_CODE.value) return; mode="join"; gameCode=INP_CODE.value.toUpperCase(); startSetup(); };

function startSetup(){
  SCREEN_KIT.classList.replace("active","hidden");
  SCREEN_SETUP.classList.replace("hidden","active");
  SETUP_TITLE.textContent = mode==="host" ? "Hosting Game" : "Joining Game";
  SETUP_CODE.textContent = `Code: ${gameCode}`;
}

BTN_ENTER.onclick = ()=>{
  if(!INP_NAME.value.trim()) return;
  me = {id: Date.now(), name:INP_NAME.value, color:`hsl(${Math.random()*360},70%,50%)`, x:rand(AREA-SIZE), y:rand(AREA-SIZE), energy:100, tags:0};
  players.push(me);
  startGame();
};

function startGame(){
  timer=DURATION;
  SCREEN_SETUP.classList.replace("active","hidden");
  SCREEN_GAME.classList.replace("hidden","active");
  GAME_CODE.textContent = gameCode;
  renderPlayers();
  requestAnimationFrame(gameLoop);
  setInterval(()=>{
    if(timer>0) TIMER.textContent = formatTime(--timer);
    if(timer===0) finishGame();
  },1000);
}

function gameLoop(){
  if(asking===false){
    let moved=false;
    if(keys.ArrowUp && me.y>0){ me.y-=SPEED;moved=true; }
    if(keys.ArrowDown && me.y<AREA-SIZE){ me.y+=SPEED;moved=true; }
    if(keys.ArrowLeft && me.x>0){ me.x-=SPEED;moved=true; }
    if(keys.ArrowRight && me.x<AREA-SIZE){ me.x+=SPEED;moved=true; }
    if(moved){ me.energy = Math.max(0,me.energy-DECAY); COLLIDE(); renderPlayers(); }
  }
  requestAnimationFrame(gameLoop);
}

function COLLIDE(){
  players.forEach(p=>{
    if(p!==me && Math.abs(me.x-p.x)<SIZE && Math.abs(me.y-p.y)<SIZE){
      me.tags++;
    }
  });
}

function renderPlayers(){
  GAME_AREA.innerHTML="";
  players.forEach(p=>{
    const el = document.createElement("div");
    el.className="player";
    el.style.left=p.x+"px";
    el.style.top=p.y+"px";
    el.style.background=p.color;
    el.innerHTML = `
      <div class="energy-bar">
        <div class="fill" style="width:${p.energy}%"></div>
      </div>
      ${p.name}
    `;
    GAME_AREA.appendChild(el);
  });
}

BTN_QUESTION.onclick = ()=>{ if(asking) return; asking=true; Q_UI.classList.remove("hidden"); startQuestion(); };

function startQuestion(){
  const q = genQ();
  Q_TEXT.textContent = q.text;
  ANSWER_OPTS.innerHTML = "";
  q.choices.forEach(c=>{
    const btn = document.createElement("button");
    btn.textContent = c;
    btn.onclick = ()=>{
      asking=false;
      Q_UI.classList.add("hidden");
      if(c===q.answer){ me.energy=Math.min(100,me.energy+GAIN); FEEDBACK.textContent="✅"; }
      else FEEDBACK.textContent="❌";
      setTimeout(()=>FEEDBACK.textContent="",1000);
      renderPlayers();
    };
    ANSWER_OPTS.appendChild(btn);
  });
}

function finishGame(){
  SCREEN_GAME.classList.replace("active","hidden");
  SCREEN_LEADER.classList.replace("hidden","active");
  players.sort((a,b)=>b.tags-a.tags).forEach((p,i)=>{
    const line = document.createElement("p");
    line.textContent = `${i+1}. ${p.name}: ${p.tags} tags`;
    LB_LIST.appendChild(line);
  });
}

BTN_RESTART.onclick = ()=>location.reload();
document.addEventListener("keydown",e=>keys[e.key]=true);
document.addEventListener("keyup",e=>keys[e.key]=false);

function rand(n){ return Math.random()*n; }
function randCode(){ return Math.random().toString(36).substring(2,6).toUpperCase(); }
function formatTime(s){
  const m=Math.floor(s/60), ss=s%60;
  return `${m}:${ss.toString().padStart(2,"0")}`;
}

function genQ(){
  const r = ()=>Math.floor(Math.random()*10)+1;
  let a,b,ans,text;
  if(selectedKit==="multiplication"){ a=r();b=r(); ans=a*b; text=`${a} × ${b} = ?`; }
  else if(selectedKit==="division"){ b=r(); ans=r(); a=b*ans; text=`${a} ÷ ${b} = ?`; }
  else if(selectedKit==="addition"){ a=r();b=r(); ans=a+b; text=`${a} + ${b} = ?`; }
  else { a=r()+10; b=r(); ans=a-b; text=`${a} − ${b} = ?`; }
  const choices=[ans];
  while(choices.length<4){
    const w = ans + Math.floor(Math.random()*11-5);
    if(w>=0 && !choices.includes(w)) choices.push(w);
  }
  return {text, answer:ans, choices:choices.sort(()=>Math.random()-0.5)};
}

