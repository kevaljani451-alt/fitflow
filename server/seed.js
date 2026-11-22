import 'dotenv/config';import mongoose from 'mongoose';import bcrypt from 'bcryptjs';import * as M from './models.js';import {curve} from './util.js';
await mongoose.connect(process.env.MONGO_URI);
await Promise.all(Object.values(M).map(m=>m.deleteMany({})));
const gyms=await M.Gym.insertMany([{name:'GymMate Central',address:'12 Ashram Road, Ahmedabad',capacity:100,occupancy:42},{name:'GymMate Riverside',address:'8 Riverfront Walk, Ahmedabad',capacity:60,occupancy:18}]);
await M.User.insertMany([{name:'Admin',email:'admin@fitflow.demo',role:'admin',hash:await bcrypt.hash('Admin@123',10),gym:gyms[0]._id},{name:'Riya Shah',email:'member@fitflow.demo',hash:await bcrypt.hash('Member@123',10),gym:gyms[0]._id}]);
const eq=[['Treadmill 1','Cardio','available',0,1],['Treadmill 2','Cardio','in-use',6,1],['Rowing machine','Cardio','available',0,1],['Squat rack','Strength','in-use',12,1],['Bench press','Strength','in-use',8,0],['Cable station','Strength','available',0,0],['Leg press','Strength','maintenance',0,0]];
const cl=[['Sunrise Yoga','yoga','Meera Joshi',7,20],['CrossFit WOD','crossfit','Dev Patel',18,12],['Zumba Party','zumba','Anita Rao',19,25]];
const tr=[['Karan Mehta','Strength & conditioning'],['Neha Trivedi','Weight loss'],['Arjun Das','Mobility & rehab']];
for(const g of gyms){
 await M.Equipment.insertMany(eq.map(([name,kind,status,waitMin,bookable])=>({gym:g._id,name,kind,status,waitMin,bookable:!!bookable})));
 await M.Class.insertMany(cl.map(([title,type,instructor,hour,capacity])=>({gym:g._id,title,type,instructor,hour,capacity})));
 await M.Trainer.insertMany(tr.map(([name,specialty])=>({gym:g._id,name,specialty})));
 const rows=[];for(let d=14;d>=1;d--)for(let h=5;h<=22;h++){const at=new Date();at.setDate(at.getDate()-d);at.setHours(h,0,0,0);rows.push({gym:g._id,at,count:Math.round(g.capacity*curve(h)/100*(0.85+Math.random()*0.3))})}
 await M.Occupancy.insertMany(rows)}
console.log('Seeded. Admin: admin@fitflow.demo / Admin@123  |  Member: member@fitflow.demo / Member@123');process.exit(0);
