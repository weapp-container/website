import {searchIndex} from '../../../data/search';
export async function GET() {return new Response(JSON.stringify(await searchIndex('en')), {headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600'}});}
