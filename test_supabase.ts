import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test1() {
  const periodsInt = [
    {ano: 2024, mes: 1}, {ano: 2024, mes: 2}, {ano: 2024, mes: 3}, {ano: 2024, mes: 4},
    {ano: 2024, mes: 5}, {ano: 2024, mes: 6}, {ano: 2024, mes: 7}, {ano: 2024, mes: 8},
    {ano: 2024, mes: 9}, {ano: 2024, mes: 10}, {ano: 2024, mes: 11}, {ano: 2024, mes: 12}
  ];
  let page = 0;
  const pageSize = 1000;
  let query = supabase.from('viw_resumo_hora_mes')
    .select('*');

  const orCond = periodsInt.map(p => `and(ano.eq.${p.ano},mes.eq.${p.mes})`).join(',');
  query = query.or(orCond);

  console.time('query');
  const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
  console.timeEnd('query');
  console.log('Error 1:', error);
}

await test1();
