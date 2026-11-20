// bot.js
const { Telegraf } = require('telegraf');
const WebSocket = require('ws');

const BOT_TOKEN = '9001719911:AAFr3K_Kc6OXGvzuRzjTWJe76U98pYEPS98';
const ADMIN_ID = 9256345316;

const bot = new Telegraf(BOT_TOKEN);

let history = [];
let wsConnected = false;
let rawMessages = []; // Для отладки

function getPrediction() {
  if (history.length < 5) return "⏳ Мало данных для прогноза.";
  
  const last5 = history.slice(0, 5);
  let lowCount = last5.filter(x => x < 50).length;
  let highCount = last5.filter(x => x >= 50).length;

  if (lowCount >= 4) return "🟢 ВЫСОКИЙ ШАНС ЗАЛЕТА (было много сливов)";
  if (highCount >= 4) return "🔴 ВЫСОКИЙ ШАНС СЛИВА (было много залетов)";
  
  return "⚪️ Нейтральный исход. Лучше пропустить.";
}

function connectToUpgrader() {
  // СЮДА ВСТАВЬ ССЫЛКУ WSS ИЗ DEVTOOLS
  const wsUrl = 'wss://uptrader.pro/ws'; // ЭТО ПРИМЕР, ЗАМЕНИ!

  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    wsConnected = true;
    console.log('[WS] Подключен к сокету');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      // Логируем сырые сообщения, чтобы ты мог скинуть мне пример
      if (rawMessages.length < 5) {
        console.log('[RAW MSG]', msg);
        rawMessages.push(msg);
      }

      // --- ЗДЕСЬ НАСТРОЙКА ПАРСИНГА ---
      // Например, если сайт присылает { type: 'game', data: { winner: 'green', roll: 67.5 } }
      // Тебе нужно найти поле с результатом (roll, winner, multiplier и т.д.)
      
      if (msg.type === 'game_result' || msg.roll !== undefined) {
        const roll = msg.roll || msg.data?.roll;
        if (roll !== undefined) {
          history.unshift(roll);
          if (history.length > 100) history.pop();
          console.log(`[WS] Дроп: ${roll}`);
        }
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    wsConnected = false;
    console.log('[WS] Соединение закрыто. Переподключение через 5 сек...');
    setTimeout(connectToUpgrader, 5000);
  });

  ws.on('error', (err) => console.error('[WS] Ошибка:', err.message));
}

connectToUpgrader();

function isAdmin(ctx) {
  return ctx.from && ctx.from.id === ADMIN_ID;
}

bot.start((ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('⛔ Нет доступа.');
  ctx.reply(`🤖 Бот запущен.\nСокет: ${wsConnected ? '🟢 Онлайн' : '🔴 Офлайн'}\nНапиши "Прогноз" для предсказания.\nНапиши "Сырой" чтобы увидеть последние 5 сообщений с сокета (для отладки).`);
});

bot.on('text', (ctx) => {
  if (!isAdmin(ctx)) return;
  const text = ctx.message.text.toLowerCase();

  if (text === 'прогноз' || text === 'залет') {
    const pred = getPrediction();
    let histText = history.length > 0 ? history.slice(0, 5).map(x => x.toFixed(1)).join(', ') : 'Нет данных';
    ctx.reply(`🎲 *Анализ:*\n\n${pred}\n\n_Последние дропы:_ ${histText}`, { parse_mode: 'Markdown' });
  }

  if (text === 'сырой') {
    if (rawMessages.length === 0) return ctx.reply('Пока нет сообщений. Подожди.');
    ctx.reply(`📦 *Последние сообщения с сокета:*\n\n\`\`\`json\n${JSON.stringify(rawMessages.slice(-3), null, 2)}\n\`\`\``, { parse_mode: 'Markdown' });
  }
});

bot.launch();
console.log('Bot up');
