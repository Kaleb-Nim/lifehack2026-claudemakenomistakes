# Cashew: DevPost submission

## Inspiration

After speaking with the manager at Visa we realised that one of the important breakthroughs to come about in the future is for agentic payments. Just like how humans we moved from real life purchases to online e-commerce, next shift will be for agents to populate the internet and make payments wherever necessary.

The problem is that most small shops are not ready for that shift. We found one in Sim Lim Square, Bizgram Asia, trading since 2003. They list over 10,000 products and publish not a single price. If you want to know what anything costs you WhatsApp them and they send back a PDF. Ask any AI assistant for a laptop in Singapore and it will never send you there.

They are not a badly run shop. There is just nothing there an agent can read.

## What it does

Cashew has two sides.

On the merchant side, a shop owner talks to a voice agent for five minutes. No forms, no catalogue dashboard. They say their shop name, we go look them up online and read back what we found, and they correct us. Then they upload whatever they already have lying around: shelf photos, a PDF price list, a screenshot of a supplier's WhatsApp message. Cashew reads all of it and turns it into structured product data.

When something is missing we ask for it specifically. If the model sticker on a box is facing away from the camera, we ask them to turn the box and shoot the side, and we say why: the model number is what people actually type when they search.

Every request has a skip button. Merchants who feel interrogated give up halfway, so we take no for an answer, say what it costs them once, and move on.

Then they set their pricing rules and return policy, connect a payout account, and they are live.

On the consumer side, a shopper opens Telegram and says what they want in normal language. The agent asks one or two questions to narrow it down, then searches across every merchant we have onboarded rather than one shop's inventory. Checkout happens inside the chat on a simulated Visa flow, with a transaction preview and biometric confirmation before anything is charged.

The merchant sees the sale land on their dashboard seconds later.

## How we built it

Two apps in one repo.

The merchant side is Next.js 16 with React 19 and Tailwind 4. The voice runs on OpenAI's Realtime API, with the session secret minted server side so the browser never holds a real key. Uploaded PDFs get rasterised with pdfjs so we read the actual page instead of guessing from a filename. An LLM pass normalises everything into structured listings.

The consumer side is Python with python-telegram-bot and an OpenAI tool calling loop. It has five tools: product discovery, buy and pay, cancel order, check order status, and remember.

Products live in Postgres with ParadeDB, which gives us keyword search and vector search in the same database. We needed both. Model numbers need exact matching, "something light for travelling" needs meaning.

Orders live in Supabase. The dashboard reads them server side and polls every five seconds, so a sale made in Telegram appears on the merchant's screen without anyone touching a keyboard.

We also kept a hardcoded copy of both apps for filming. Recording a live model is how you lose four hours to a bad take.

## Challenges we ran into

**Four names for the same shop.** Four of us were building in parallel, and at one point the merchant was Bizgram in the onboarding flow, Hock Seng in the pitch script, Nova Electronics in the bot and Ah Seng on the dashboard. A shopper was buying a product the merchant had never onboarded. We wrote one canonical data file and pointed everything at it.

**Five minutes against maximum detail.** Five minutes of talking is roughly 800 words in total, both sides. You cannot interrogate anyone in that. So we flipped it: infer everything possible from the upload, and only ask about things a photo genuinely cannot answer, like whether a laptop is a local set or a parallel import.

**A missing column that looked like a broken connection.** Our dashboard query named a column that did not exist yet. Postgres fails the entire query when one column is missing, so the page reported "not connected" while the credentials were perfectly fine. That one cost us more time than it should have.

**Keys that must never reach a browser.** Our orders table is locked so only the service key can read it, which means that key is the only thing protecting it. It stays server side. We grepped the built browser bundle to prove it was not sitting in there.

## Accomplishments that we're proud of

The onboarding feels like talking to someone who did their homework. It looks the shop up before asking anything, so the merchant spends the call correcting us instead of typing from scratch.

The skip button, honestly. It was a deliberate call and it is the difference between a conversation and a form being read aloud.

The loop closes. A shopper pays in Telegram and the sale shows up on the merchant dashboard seconds later. Both halves are real and they talk to each other.

And we built it around a real shop instead of inventing one. Bizgram has been in Sim Lim since 2003 with 10,000 products and no prices. Anyone can check that while we are still talking.

## What we learned

Agents do not browse, they skip. If a field is missing an agent will not guess, because guessing means buying the wrong thing on someone's card. It moves to a shop whose data answers the question. That reframed the whole project for us. We are not making listings prettier, we are making them exist at all.

The merchants who need this most are the ones who will never finish a dashboard. Most small businesses here have fewer than 25 staff. Nobody in that shop is writing a product feed on a Tuesday afternoon.

Talk to the mentor early. Our first idea was a chatbot sitting on one merchant's own website. The Visa mentor pointed out that if you have already decided to shop at Uniqlo, you may as well just go to Uniqlo. One sentence and we rebuilt the whole thing.

## What's next for Cashew

Onboard real shops. The merchant flow works, so the obvious next step is walking into Sim Lim and running it with an owner who has never seen it before.

Make the ranking honest. Right now how complete a listing is decides who surfaces first. We think that is fair for small shops because it rewards the ones who put the work in rather than the ones who can pay, but it needs testing with real merchants before we go around claiming it works.

Charge for it. A cut of each settled sale is the obvious model and it lines up with how payments already work. We have not built billing yet.

And the boring one: real bank connections instead of a simulated payout screen. Not glamorous, but nobody goes live without it.
