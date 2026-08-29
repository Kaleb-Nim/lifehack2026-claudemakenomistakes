// Consumer Telegram bot — HARDCODED demo flow (see docs/merchant-onboarding-demo-script.md §6.6).
// Nothing here calls a model. The consumer-flow pair owns this file; extend the script, keep the fake latency.

import { Bot, InlineKeyboard } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN in apps/consumer-bot/.env (see .env.example)");
  process.exit(1);
}

const bot = new Bot(token);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Per-chat step so the scripted replies come out in order regardless of what the user types.
const step = new Map<number, number>();

bot.command("start", async (ctx) => {
  step.set(ctx.chat.id, 0);
  await ctx.reply(
    "Hi — I'm the electronics shopping agent. I search every shop that's onboarded with me. Tell me what you're looking for.",
  );
});

bot.on("message:text", async (ctx) => {
  const id = ctx.chat.id;
  const s = step.get(id) ?? 0;

  if (s === 0) {
    step.set(id, 1);
    await ctx.reply("Got it. Two quick things — is it mostly for notes and browsing, or heavier work like video editing? And do you need it before term starts?");
    return;
  }

  if (s === 1) {
    step.set(id, 2);
    const thinking = await ctx.reply("Searching 3 shops…");
    await sleep(5000); // fake thinking, per team decision
    await ctx.api.deleteMessage(id, thinking.message_id);
    await ctx.reply(
      [
        "Two good fits under $1,400:",
        "",
        "1. Acer Swift Go 14 — Bizgram Asia (Sim Lim #05-50)",
        "   $1,299 cash/PayNow · $1,349 card · 14\" 2.8K OLED · 1.3 kg",
        "   Acer SG 2-yr carry-in · collect today, shop has 2",
        "",
        "2. Lenovo IdeaPad Slim 5 14 — PC Themes (#04-15)",
        "   $1,099 · OLED · 16 GB · 1.4 kg · 2-yr Lenovo",
        "",
        "The Swift Go 14 has the better screen and battery for notes + light photo editing.",
      ].join("\n"),
      { reply_markup: new InlineKeyboard().text("Buy the Swift Go 14", "buy").text("Ask something", "ask") },
    );
    return;
  }

  if (s === 2) {
    await ctx.reply(
      "On the Swift Go 14: RAM is soldered (16 GB, not upgradeable), but the SSD is — Bizgram installs a Samsung 990 Pro in-shop the same day, free with purchase.",
      { reply_markup: new InlineKeyboard().text("Buy the Swift Go 14", "buy") },
    );
  }
});

bot.callbackQuery("ask", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Go ahead — e.g. \"can I add RAM later?\"");
});

bot.callbackQuery("buy", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    [
      "Transaction preview — nothing is charged yet.",
      "",
      "Acer Swift Go 14 (SFG14-73-56VK)",
      "Merchant: Bizgram Asia, #05-50 Sim Lim Square",
      "Price: $1,349 (card price)",
      "Collect: today, 10:00–19:30",
      "Pay with: Visa •••• 4242",
      "",
      "I will only pay after you confirm.",
    ].join("\n"),
    { reply_markup: new InlineKeyboard().text("Confirm and pay $1,349", "confirm").text("Cancel", "cancel") },
  );
});

bot.callbackQuery("confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  const m = await ctx.reply("Authorising with Visa…");
  await sleep(2500);
  await ctx.api.editMessageText(
    ctx.chat!.id,
    m.message_id,
    [
      "Paid ✓  $1,349 · Visa •••• 4242 · auth 7F3K2Q",
      "",
      "Bizgram Asia has your order. Show this message at #05-50 Sim Lim Square to collect — open daily 10:00–19:30.",
    ].join("\n"),
  );
});

bot.callbackQuery("cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Cancelled — nothing was charged.");
});

bot.start();
console.log("consumer-bot running (hardcoded demo flow)");
