import 'dotenv/config';import express from 'express';import cors from 'cors';import mongoose from 'mongoose';import bcrypt from 'bcryptjs';import jwt from 'jsonwebtoken';
import {Gym,User,Equipment,Trainer,Class,Booking,Checkin,Occupancy} from './models.js';import {curve,status,fmtH} from './util.js';
const DEMO=process.env.DEMO_MODE!=='false',TZ=process.env.TZ_NAME||'Asia/Kolkata',EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if(!process.env.JWT_SECRET){console.error('Set JWT_SECRET in server/.env');process.exit(1)}
const app=express();app.use(cors({origin:process.env.CLIENT_URL||true}));app.use(express.json());
const wrap=f=>(q,s,n)=>f(q,s,n).catch(e=>{console.error(e.message);s.status(e.name==='CastError'?400:500).json({error:e.name==='CastError'?'Invalid request':'Server error'})});
const sign=u=>jwt.sign({id:u._id,role:u.role},process.env.JWT_SECRET,{expiresIn:'7d'});
const auth=(q,s,n)=>{try{q.u=jwt.verify((q.headers.authorization||'').slice(7),process.env.JWT_SECRET);n()}catch{s.status(401).json({error:'Please log in'})}};
const admin=(q,s,n)=>q.u.role==='admin'?n():s.status(403).json({error:'Admin access only'});
const pub=u=>({id:u._id,name:u.name,email:u.email,role:u.role,gym:u.gym});
const r=express.Router();app.use('/api',r);
r.post('/auth/register',wrap(async(q,s)=>{const {name,email,password,gym}=q.body;
 if(!name||name.trim().length<2||!EMAIL.test(email||'')||!password||password.length<8||!/\d/.test(password))return s.status(400).json({error:'Enter a name, a valid email and a password of 8+ characters with a number'});
 if(await User.findOne({email:email.toLowerCase()}))return s.status(409).json({error:'That email is already registered'});
 const u=await User.create({name:name.trim(),email,hash:await bcrypt.hash(password,10),gym:mongoose.isValidObjectId(gym)?gym:undefined});s.json({token:sign(u),user:pub(u)})}));
r.post('/auth/login',wrap(async(q,s)=>{const u=await User.findOne({email:String(q.body.email||'').toLowerCase()});
 if(!u||!(await bcrypt.compare(String(q.body.password||''),u.hash)))return s.status(401).json({error:'Email or password is incorrect'});s.json({token:sign(u),user:pub(u)})}));
r.get('/gyms',wrap(async(q,s)=>s.json(await Gym.find().sort('name'))));
r.get('/gyms/:id/live',wrap(async(q,s)=>{const g=await Gym.findById(q.params.id);if(!g)return s.status(404).json({error:'Gym not found'});
 const pct=Math.round(g.occupancy/g.capacity*100);
 s.json({gym:{_id:g._id,name:g.name,capacity:g.capacity},count:g.occupancy,pct,status:status(pct),left:Math.max(0,g.capacity-g.occupancy),updated:g.occAt,demo:DEMO,equipment:await Equipment.find({gym:g._id}).sort('name')})}));
r.get('/gyms/:id/analytics',wrap(async(q,s)=>{const g=await Gym.findById(q.params.id);if(!g)return s.status(404).json({error:'Gym not found'});
 const agg=await Occupancy.aggregate([{$match:{gym:g._id}},{$group:{_id:{$hour:{date:'$at',timezone:TZ}},avg:{$avg:'$count'},n:{$sum:1}}}]);
 const sample=agg.reduce((a,x)=>a+x.n,0)<48,hours=[];
 for(let h=5;h<=22;h++){const a=agg.find(x=>x._id===h);hours.push({hour:h,label:fmtH(h),pct:sample||!a?curve(h):Math.round(a.avg/g.capacity*100)})}
 const best=hours.filter(x=>x.hour>=6).sort((a,b)=>a.pct-b.pct)[0];
 const rows=await Occupancy.find({gym:g._id,at:{$gte:new Date(Date.now()-864e5)}}).sort('at'),k=Math.ceil(rows.length/48)||1;
 const today=rows.filter((_,i)=>i%k===0).map(o=>({t:o.at.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',timeZone:TZ}),pct:Math.round(o.count/g.capacity*100)}));
 s.json({sample,hours,best,today})}));
r.use(auth);
r.get('/me',wrap(async(q,s)=>s.json(pub(await User.findById(q.u.id)))));
r.put('/me',wrap(async(q,s)=>{const {name,gym}=q.body;if(!name||name.trim().length<2)return s.status(400).json({error:'Enter your name'});
 s.json(pub(await User.findByIdAndUpdate(q.u.id,{name:name.trim(),gym:mongoose.isValidObjectId(gym)?gym:undefined},{new:true})))}));
r.get('/equipment',wrap(async(q,s)=>s.json(await Equipment.find({gym:q.query.gym,...(q.query.bookable?{bookable:true,status:{$ne:'maintenance'}}:{})}).sort('name'))));
r.get('/classes',wrap(async(q,s)=>s.json(await Class.find({gym:q.query.gym}).sort('hour'))));
r.get('/trainers',wrap(async(q,s)=>s.json(await Trainer.find({gym:q.query.gym}).sort('name'))));
const KINDS=['gym','class','trainer','equipment'];
async function slots(gym,kind,item,date){const g=await Gym.findById(gym);let hours=[...Array(16).keys()].map(i=>i+6),cap=Math.max(5,Math.floor(g.capacity/4)),label='Gym entry';
 if(kind==='class'){const c=await Class.findById(item);if(!c)return null;hours=[c.hour];cap=c.capacity;label=c.title}
 if(kind==='trainer'){const t=await Trainer.findById(item);if(!t)return null;cap=1;label='Session with '+t.name}
 if(kind==='equipment'){const e=await Equipment.findOne({_id:item,bookable:true,status:{$ne:'maintenance'}});if(!e)return null;cap=1;label=e.name}
 const out=[];for(const h of hours){const start=new Date(`${date}T${String(h).padStart(2,'0')}:00:00`);
  const used=await Booking.countDocuments({gym,kind,item:kind==='gym'?null:item,start,status:'confirmed'});out.push({hour:h,start,left:Math.max(0,cap-used),cap,past:start<new Date()})}
 return {label,slots:out}}
const valid=q=>KINDS.includes(q.kind)&&/^\d{4}-\d{2}-\d{2}$/.test(q.date||'')&&mongoose.isValidObjectId(q.gym)&&(q.kind==='gym'||mongoose.isValidObjectId(q.item));
r.get('/slots',wrap(async(q,s)=>{if(!valid(q.query))return s.status(400).json({error:'Choose a booking type and date'});
 const x=await slots(q.query.gym,q.query.kind,q.query.item,q.query.date);x?s.json(x):s.status(404).json({error:'That item is not available for booking'})}));
r.post('/bookings',wrap(async(q,s)=>{const b=q.body;if(!valid(b)||!Number.isInteger(b.hour))return s.status(400).json({error:'Choose a booking type, date and time'});
 const x=await slots(b.gym,b.kind,b.item,b.date);if(!x)return s.status(404).json({error:'That item is not available for booking'});
 const sl=x.slots.find(v=>v.hour===b.hour);if(!sl)return s.status(400).json({error:'That time is not offered'});
 if(sl.past)return s.status(400).json({error:'That time has already passed'});
 if(sl.left<1)return s.status(409).json({error:'This slot is full. Pick another time'});
 if(await Booking.findOne({user:q.u.id,start:sl.start,status:'confirmed'}))return s.status(409).json({error:'You already have a booking at this time'});
 const code='FF-'+Math.random().toString(36).slice(2,8).toUpperCase();
 s.status(201).json(await Booking.create({code,user:q.u.id,gym:b.gym,kind:b.kind,item:b.kind==='gym'?undefined:b.item,label:x.label,start:sl.start}))}));
r.get('/bookings',wrap(async(q,s)=>s.json(await Booking.find({user:q.u.id}).populate('gym','name').sort('-start'))));
r.delete('/bookings/:id',wrap(async(q,s)=>{const b=await Booking.findOne({_id:q.params.id,user:q.u.id});if(!b)return s.status(404).json({error:'Booking not found'});
 if(b.status!=='confirmed')return s.status(400).json({error:'This booking is already cancelled'});
 if(b.start-Date.now()<36e5)return s.status(400).json({error:'Bookings can be cancelled up to 1 hour before the start'});
 b.status='cancelled';await b.save();s.json(b)}));
const a=express.Router();r.use('/admin',admin,a);
const setOcc=async(g,n)=>{g.occupancy=n;g.occAt=new Date();await g.save();await Occupancy.create({gym:g._id,count:n})};
a.put('/gyms/:id',wrap(async(q,s)=>{const c=Number(q.body.capacity);if(!Number.isInteger(c)||c<1||c>5000)return s.status(400).json({error:'Capacity must be 1-5000'});
 const g=await Gym.findById(q.params.id);g.capacity=c;await g.save();s.json(g)}));
a.post('/checkin',wrap(async(q,s)=>{const g=await Gym.findById(q.body.gym),t=q.body.type;if(!g||!['in','out'].includes(t))return s.status(400).json({error:'Invalid check-in'});
 if(t==='in'&&g.occupancy>=g.capacity)return s.status(409).json({error:'Gym is at full capacity'});if(t==='out'&&g.occupancy<1)return s.status(409).json({error:'Nobody is checked in'});
 await Checkin.create({gym:g._id,type:t,by:q.u.id});await setOcc(g,g.occupancy+(t==='in'?1:-1));s.json(g)}));
const M={equipment:Equipment,classes:Class,trainers:Trainer};
for(const [p,m] of Object.entries(M)){
 a.post('/'+p,wrap(async(q,s)=>{if(!mongoose.isValidObjectId(q.body.gym)||!(q.body.name||q.body.title))return s.status(400).json({error:'Fill in all fields'});
  try{s.status(201).json(await m.create(q.body))}catch(e){s.status(400).json({error:'Check the values you entered'})}}));
 a.put('/'+p+'/:id',wrap(async(q,s)=>s.json(await m.findByIdAndUpdate(q.params.id,q.body,{new:true,runValidators:true}))));
 a.delete('/'+p+'/:id',wrap(async(q,s)=>{await m.findByIdAndDelete(q.params.id);s.json({ok:1})}))}
a.get('/bookings',wrap(async(q,s)=>s.json(await Booking.find().populate('user','name email').populate('gym','name').sort('-start').limit(200))));
a.patch('/bookings/:id/cancel',wrap(async(q,s)=>s.json(await Booking.findByIdAndUpdate(q.params.id,{status:'cancelled'},{new:true}))));
a.get('/users',wrap(async(q,s)=>s.json(await User.find().select('-hash').sort('-createdAt'))));
a.get('/stats',wrap(async(q,s)=>{const d=new Date();d.setHours(0,0,0,0);s.json({users:await User.countDocuments(),bookings:await Booking.countDocuments({status:'confirmed'}),checkinsToday:await Checkin.countDocuments({createdAt:{$gte:d}}),gyms:await Gym.countDocuments()})}));
if(DEMO){let tick=0;setInterval(async()=>{tick++;for(const g of await Gym.find()){const h=new Date().getHours(),target=g.capacity*curve(h)/100;
 const n=Math.max(0,Math.min(g.capacity,g.occupancy+Math.round((target-g.occupancy)/6+Math.random()*4-2)));g.occupancy=n;g.occAt=new Date();await g.save();if(tick%15===0)await Occupancy.create({gym:g._id,count:n})}},20000)}
await mongoose.connect(process.env.MONGO_URI);
app.listen(process.env.PORT||5000,()=>console.log('GymMate API running'+(DEMO?' (DEMO MODE: simulated occupancy)':'')));
