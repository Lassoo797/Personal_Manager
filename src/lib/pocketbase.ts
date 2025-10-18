import PocketBase from 'pocketbase';

// Vytvoríme novú inštanciu PocketBase klienta
// URL adresa musí zodpovedať tej, kde beží vaša PocketBase databáza
const pb = new PocketBase('http://192.168.50.249:8090');

// (Voliteľné) Zapne automatické zrušenie požiadaviek, ak je to potrebné
pb.autoCancellation(true);

export default pb;
