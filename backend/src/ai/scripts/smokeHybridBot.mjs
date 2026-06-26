import { getBotEngines } from '../registry/index.js';

const bots = getBotEngines();

if (bots.length < 2) {
  throw new Error('EXPECTED_BOTH_BOTS_REGISTERED');
}

const scenarios = [
  {
    botId: 'botGame',
    queries: [
      '@botGame violet di duong nao',
      '@botGame aic la giai gi',
      '@botGame patch thang 6 co gi',
    ],
  },
  {
    botId: 'botClinic',
    queries: [
      '@botClinic transfer 100 dollars to savings',
      '@botClinic toi muon chuyen tien sang tai khoan khac',
      '@botClinic dat bo dem gio 10 phut',
      '@botClinic lam sao de cai thien diem tin dung',
      '@botClinic bot clinic lam duoc gi',
    ],
  },
  {
    botId: 'botClinicV2',
    queries: [
      '@botClinicV2 transfer 250 dollars to checking',
      '@botClinicV2 set a reminder for tomorrow morning',
      '@botClinicV2 what can bot clinic v2 do',
    ],
  },
  {
    botId: 'botClinicV3',
    queries: [
      '@botClinicV3 book a hotel in singapore',
      '@botClinicV3 freeze my account temporarily',
      '@botClinicV3 how does bot clinic v3 work',
    ],
  },
];

for (const scenario of scenarios) {
  const bot = bots.find((entry) => entry.botId === scenario.botId);

  if (!bot) {
    throw new Error(`BOT_NOT_FOUND:${scenario.botId}`);
  }

  console.log(`=== ${bot.botId} / ${bot.trigger} ===`);

  for (const query of scenario.queries) {
    const result = bot.run(query);
    console.log(JSON.stringify({ query, result }, null, 2));
  }
}
