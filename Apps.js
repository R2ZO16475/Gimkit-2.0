import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("https://e01d35a8-97bb-4ce0-bff2-548e2f89e5e6-00-1h2mka77cxg9b.picard.replit.dev:3000");

const kits = ["multiplication","division","addition","subtraction"];
const AREA = 400;
const SIZE = 40;
const ENERGY_DECAY = 0.4;
const ENERGY_GAIN = 20;
const GAME_DURATION = 300; // seconds

export default function App(){
  const [view, setView] = useState("home");
  const [connected, setConnected] = useState(false);
  const [gameCode, setGameCode] = useState("");
  const [kit, setKit] = useState("");
  const [joinCode,setJoinCode] = useState("");
  const [name,setName] = useState("");
  const [players,setPlayers] = useState([]);
  const [localId,setLocalId] = useState("");
  const [answering,setAnswering] = useState(false);
  const [currentQ,setCurrentQ] = useState(null);
  const [feedback,setFeedback] = useState("");
  const [timer, setTimer] = useState(GAME_DURATION);

  const keys = useRef({});

  useEffect(()=>{
    window.addEventListener("keydown",e=>keys.current[e.key]=true);
    window.addEventListener("keyup",e=>keys.current[e.key]=false);
    return ()=>{
      window.removeEventListener("keydown",e=>keys.current[e.key]=true);
      window.removeEventListener("keyup",e=>keys.current[e.key]=false);
    };
  },[]);

  useEffect(()=>{
    socket.on("connect",()=>setConnected(true));
    socket.on("disconnect",()=>setConnected(false));
    socket.on("game-created",code=>setView("lobby")||setGameCode(code));
    socket.on("join-success",code=>setView("lobby")||setGameCode(code));
    socket.on("player-list",list=>setPlayers(list));
    socket.on("game-started",()=>{
      setView("game");
      setTimer(GAME_DURATION);
      const interval = setInterval(()=>{
        setTimer(t=> {
          if(t<=1){ clearInterval(interval); socket.emit("time-up",gameCode);}
          return t-1;
        });
      },1000);
    });
    socket.on("update-players",list=>setPlayers(list));
    socket.on("game-end",()=>setView("leaderboard"));
    return ()=>socket.removeAllListeners();
  },[gameCode]);

  useEffect(()=>{
    if(view==="game"){
      requestAnimationFrame(moveLoop);
    }
  },[view,players]);

  function startGame(){ socket.emit("start-game",gameCode); }
  function host(){ socket.emit("host-game",kit); setView("host"); }
  function join(){ socket.emit("join-game",{gameCode:joinCode,name}); setView("join"); }
  function enter(){ socket.emit("enter-game",{gameCode,name}); }
  function answer(){ setAnswering(true); setCurrentQ(genQ()); }
  function genQ(){
    const r=()=>Math.floor(Math.random()*10)+1;
    let a,b,ans,text;
    switch(kit){
      case "multiplication": a=r();b=r();ans=a*b;text=`${a}×${b}=?`;break;
      case "division": b=r();ans=r();a=b*ans;text=`${a}÷${b}=?`;break;
      case "addition": a=r();b=r();ans=a+b;text=`${a}+${b}=?`;break;
      default: a=r()+10;b=r();ans=a-b;text=`${a}-${b}=?`;break;
    }
    const choices=[ans];
    while(choices.length<4){const w=ans+Math.floor(Math.random()*11-5); if(w>=0&&!choices.includes(w)) choices.push(w);}
    return {text,ans,choices:choices.sort(()=>Math.random()-0.5)};
  }
  function submitAnswer(c){
    setAnswering(false);
    if(c===currentQ.ans){
      setFeedback("Correct +20 energy");
      socket.emit("energy", {gameCode,amount:ENERGY_GAIN});
    } else setFeedback("Wrong!");
    setTimeout(()=>setFeedback(""),2000);
  }

  function moveLoop(){
    const me=players.find(p=>p.id===socket.id);
    if(me){
      let moved=false;
      let {x,y}=me;
      const s=8;
      if(keys.current.ArrowUp && y>=s){me.y-=s;moved=true;}
      if(keys.current.ArrowDown&&y<=AREA-SIZE-s){me.y+=s;moved=true;}
      if(keys.current.ArrowLeft&&x>=s){me.x-=s;moved=true;}
      if(keys.current.ArrowRight&&x<=AREA-SIZE-s){me.x+=s;moved=true;}
      if(moved){
        me.energy=Math.max(0,me.energy-ENERGY_DECAY);
        socket.emit("move",{gameCode,x:me.x,y:me.y});
        players.forEach(o=>{
          if(o.id!==me.id && Math.abs(me.x-o.x)<SIZE && Math.abs(me.y-o.y)<SIZE){
            socket.emit("tag",{gameCode,tagger:me.id,tagged:o.id});
          }
        });
      }
      socket.emit("energy_update",{gameCode,energy:me.energy});
    }
    requestAnimationFrame(moveLoop);
  }

  if(view==="home") return (
    <div style={styles.container}>
      <h1>Tag Game</h1>
      <p>{connected?"🟢":"🔴"} Backend</p>
      <div>
        {kits.map(k=>(
          <button key={k} style={styles.btn} onClick={()=>setKit(k)} className={kit===k?"sel":""}>{k}</button>
        ))}
      </div>
      <button disabled={!kit} onClick={host}>Host Game</button>
      <button disabled={!kit} onClick={()=>setView("join")}>Join Game</button>
    </div>
  );

  if(view==="join") return (
    <div style={styles.container}>
      <h2>Join Game</h2>
      <input placeholder="Code" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())}/>
      <input placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)}/>
      <button onClick={join}>Join</button>
    </div>
  );

  if(view==="host"||view==="lobby") return (
    <div style={styles.container}>
      <h2>{view==="host"?"Hosting":"Lobby"}: {gameCode}</h2>
      <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)}/>
      {(view==="host" || view==="lobby") && <button onClick={enter}>Enter Game</button>}
      <button disabled={view!=="lobby"} onClick={startGame}>Start & Tag!</button>
      <div style={styles.area}>{players.map(p=>(
        <div key={p.id} style={{...styles.player,left:p.x,top:p.y,background:p.color}}>
          {p.name}<div style={{...styles.energy, width:p.energy+"%"}}/>
        </div>
      ))}</div>
    </div>
  );

  if(view==="game") return (
    <div style={styles.container}>
      <h2>Time left: {Math.floor(timer/60)}:{String(timer%60).padStart(2,"0")}</h2>
      <div style={styles.area}>{players.map(p=>(
        <div key={p.id} style={{...styles.player,left:p.x,top:p.y,background:p.color}}>
          {p.name}<div style={{...styles.energy, width:p.energy+"%"}}/>
        </div>
      ))}</div>
      <button disabled={answering} onClick={answer}>Answer Question</button>
      {answering && <div>
        <p>{currentQ.text}</p>
        {currentQ.choices.map(c=>(
          <button key={c} onClick={()=>submitAnswer(c)}>{c}</button>
        ))}
      </div>}
      <p>{feedback}</p>
    </div>
  );

  if(view==="leaderboard") {
    const sorted=[...players].sort((a,b)=>b.tags-a.tags);
    return (
      <div style={styles.container}>
        <h1>🏆 Leaderboard</h1>
        {sorted.map((p,i)=><p key={p.id}>{i+1}. {p.name} – {p.tags} tags</p>)}
        <button onClick={()=>window.location.reload()}>Play Again</button>
      </div>
    );
  }

  return null;
}

const styles = {
  container:{display:"flex",flexDirection:"column",alignItems:"center",gap:10,padding:20},
  btn:{margin:5,padding:10},
  area:{position:"relative",width:AREA,height:AREA,background:"#ddd",margin:10},
  player:{position:"absolute",width:SIZE,height:SIZE,borderRadius:"50%",color:"#fff",display:"flex",justifyContent:"center",alignItems:"center",fontSize:10},
  energy:{position:"absolute",bottom:-6,left:0,height:4,background:"#0f0"}
};
