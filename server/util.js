export const curve=h=>Math.min(95,Math.round(10+40*Math.exp(-((h-7)**2)/6)+62*Math.exp(-((h-18)**2)/8)));
export const status=p=>p<40?'green':p<75?'yellow':'red';
export const fmtH=h=>`${h%12||12}${h<12?'am':'pm'}`;
