# Visa mentor clarification — 2026-08-29 (transcript)

Source: `~/Movies/Visa_mentor.mov` (11:04). Whisper `large-v3-turbo` + pyannote diarization, merged word-level. Summary and action items: `docs/visa-mentor-meeting-2026-08-29.md`.

Speaker labels: **Kaleb** is voice-matched. The Visa mentor was not in the voice library; her voice is the dominant one (~6.8 min of talk time) and diarization split it across **Speaker 4 and Speaker 5** in a noisy room — read those two as one person unless a line is obviously a teammate's interjection. Speakers 1–3 are teammates (unmatched). Single-word fragments are often misattributed; timestamps are reliable.

---

[00:04] Kaleb: For the part

[00:06] Speaker 5: on the gateway on their payment, like this

[00:14] Kaleb: one here,

[00:15] Speaker 5: so what are you

[00:17] Speaker 3: expecting? Is it more of like… Deploying the actual agent on their site, or it's more of having a separate agent that

[00:32] Speaker 5: gets data off their catalogue, then consumers

[00:36] Speaker 4: can just interact with the agent, maybe through telegram or what's that? The second

[00:40] Speaker 3: one. So like on the consumer side, the

[00:44] Speaker 4: interface can be as simple as telegram? Yeah, it could be telegram,

[00:49] Kaleb: right, because at the end of the day, nowadays, what

[00:51] Speaker 5: do people go to social media? Social

[00:54] Kaleb: media, telegram, Facebook, Instagram, you know, whatever.

[00:57] Speaker 1: But then, the question is, if it's an agent,

[01:02] Speaker 4: let's say right now, I'm an end user. I want to buy something. So I may go to…

[01:17] Kaleb: I need to give them, and I prompt them, right, as it's what I'm

[01:21] Speaker 5: searching for. So in the example that Abichi gave, was to book a cheapest flight to Tokyo, to Japan, I think, to Japan, right?

[01:28] Speaker 4: So Japan

[01:29] Speaker 5: is a one -way.

[01:30] Speaker 4: The question is when do you want to go? Because when you say Japan is like, if you book years, days ahead, you're going to be very cheap. But then you want the best to speak when

[01:41] Speaker 5: you want to go, where you want to go.

[01:43] Speaker 4: So you may say that, okay, what made Japan's five? I want to go to see Sakura, I want to go to Sakura season. And all of you know Sakura season is a very short season, right?

[01:52] Speaker 5: So,

[01:52] Speaker 4: and even that short season, different parts of Japan have different Sakura season. I may not want to go to Tokyo because Tokyo is like everything has gone new. I've gone to Tokyo many times. So I want to go to Hokkaido instead because I think Sakura and Hokkaido should be beautiful. So then I said, okay, me as an end user, I'll prompt the agent to say that book me a cheaper start to Japan

[02:12] Speaker 2: in Hokkaido during Sakura season. Correct?

[02:18] Speaker 1: Then that way I'm able to narrow down

[02:20] Speaker 5: further. So then what the LYRN do is that they'll search the whole web to find you that whatever you ask for. It could be SIA, it could be ANA, it could be JAL, it could be SCOTE. Not so many, there's so many MLs out there. Or they can even search Skyscanner could be one of them, right? People will Skyscanner first. And then they go to the email website. Next moment, what the ARN agent does is you'll prompt you with all

[02:44] Kaleb: these possibilities. Then for you to re -answer the questions

[02:48] Speaker 4: back, that kind of thing. Yes, they can't ask you another question.

[02:50] Kaleb: It's like, yes, no. How about SIA, are you okay with full -fledged carrier or you want a low -cost carrier? For this side, is it more towards the consumer side interface or is it the merchant side? Or is it both?

[03:01] Speaker 2: Both.

[03:02] Kaleb: So you're looking for both. So you must have one platform for the merchant side to upload their whatever catalogue.

[03:07] Speaker 2: There are even physical menu, there are like Shopify

[03:10] Speaker 1: website, there are whatever. Correct. Then from there,

[03:14] Kaleb: link, then that's the thing. There's like one platform, then the other platform. Let's say we do a telegram board. Then how is it that you must show that it's like, you know.

[03:23] Speaker 4: It's able to talk to each other.

[03:25] Kaleb: Yeah. So in this case. That's the, that's

[03:27] Speaker 4: the. Yes. If you want it to be able to talk to each other. Number one, the merchant products or the goods and services must be the surface of the end user very quickly. And next is, as an end user, when you search for it, it must be friction -free.

[03:41] Kaleb: Okay.

[03:42] Speaker 4: So it's both sides. So this platform that is, this is not any, this is the merchant. Is this like the

[03:48] Speaker 5: merchant platform or is it like a Visa specific platform or is it like a? No, it's a Visa platform. It

[03:53] Kaleb: can be

[03:53] Speaker 3: anything. It can be anything. Okay. But with the example you talked about, we are talking about the agent exploring the whole web, like throughout multiple merchants. But is it what Visa want to see is how we integrate the agent with a specific merchant? Yeah. So like

[04:08] Speaker 5: for example, I am, I sell electronics. Then I want this agent to operate like their catalog and the purchasers only on my shop. So

[04:17] Speaker 3: then this agent, but this one agnostic agent right, can be tailored to any kind of shop.

[04:23] Speaker 4: Yes. Yeah, right. It can be tailored to any agent. It's not any kind of shop. Any agents. Because, let's say right now I'm an agent. Like right now I'm Google Jomera for example.

[04:31] Speaker 3: Yeah.

[04:31] Speaker 4: Right, I search right. I want, usually they will show you a lot of products.

[04:36] Speaker 3: Yeah, right. So then

[04:40] Kaleb: how do you surface that to the agent, so that your, what your product will become? Then wait, isn't this just like agenting SEO like on the, what do you call it, on the merchant side? Mm

[04:54] Speaker 5: -hmm. Isn't that, then that's, that's slightly different isn't it? Then isn't like

[04:58] Speaker 4: the whole problem statement, how do you like improve your merchant like product, agenting SEO? No, it's actually both right. Because number one, the agent, the merchant products must

[05:08] Speaker 5: be picked up by the agent. So, for example, right, let's say right now I'm going to go, I go shopping.

[05:14] Speaker 4: Let's say I go Uniqlo, I

[05:16] Speaker 5: look for a t -shirt. Right? So, what you see is picture and size. Then the dimension, right? Then you buy from there. But then as a LOM,

[05:26] Speaker 4: they cannot see picture. Right? Even don't see

[05:29] Speaker 5: picture, LOM see text. So how can you enable the back end, which is a merchant information to be surfaced, such as

[05:36] Speaker 4: text, such as AI readable? It must be

[05:39] Speaker 5: AI readable, right? Because with picture, I mean, it's good for the end user. As in, right now as a shopper, I go

[05:44] Kaleb: to Uniqlo, yeah, I say, I want to see a picture. But then, AI agent cannot see picture. They

[05:49] Speaker 4: can see picture. No, no, no. Now it's multi -model. Yeah, multi -model. It's like visual

[05:53] Speaker 3: language model.

[05:54] Speaker 4: Okay. I

[05:54] Speaker 3: mean, it's possible. Can you build that new to it? Recently. What we are imagining is, okay, example, I'm Uniqlo. Then I use what we build to, okay, we have this agent, then we upload. Like example, let's say Uniqlo has an API for our catalog.

[06:10] Speaker 5: Then we upload our whole catalog into this agent. Then

[06:13] Speaker 4: end users who want to buy from Uniqlo, instead of going to the website, they use our agent to shop for them. Yes.

[06:19] Speaker 3: Yeah.

[06:20] Speaker 4: That's what we are looking for. Yes, correct. So in this case, the agent, instead of you going to Uniqlo website,

[06:25] Speaker 3: Yeah, we go to the agent.

[06:26] Speaker 4: You go to the agent. Just to shop at Uniqlo. Yes. But then, in this case, if you go to the agent to shop at Uniqlo, you might as well go to Uniqlo.

[06:35] Kaleb: Okay. How about, then it will be a very specific, like, clothing

[06:39] Speaker 4: agent.

[06:41] Kaleb: You can. You need to narrow your score. Because if not, you go haywire, right? Then if not, you're

[06:47] Speaker 4: just better off, like, just going to like Gemini or whatever to shop. Then you need to. No, because if, let's say, you already

[06:53] Kaleb: determined Uniqlo as a merchant.

[06:56] Speaker 1: Then you might as well go to Uniqlo. Right now, what I want is.

[06:59] Kaleb: Like clothing. So you just want, like, clothing. And then,

[07:01] Speaker 5: like, multiple merchants can

[07:02] Speaker 4: pull into that data

[07:03] Speaker 5: pool. Then, like, for example, Uniqlo

[07:05] Speaker 4: or, like, Cotton On will go into this, uh, our agent later. And then, like, as an end user, like, when I search my, this agent board, right? It will pull from all of them. Yes, you should pull from all of them.

[07:14] Speaker 1: But then,

[07:15] Speaker 4: you as a, let's say, you're Uniqlo. How do you ensure that Uniqlo product surface? I mean, yes, you can surface cotton on and so on with other brands, right? But I want to make sure that Uniqlo is top most when you search, when you do a search. So then, that's when your L &M model has to be such a... Well, it's very defined. That, you know, let's say, you may want to be more specific. The T -shirt, right? T -shirt, there are so many material material. T -shirt, and buttons, with collar. So, in this case, your L &M model has to be picked up that kind of thing.

[07:49] Speaker 5: Describe their product.

[07:50] Speaker 4: So, let's say right now, I live. I go shopping at Uniqlo, you know? I have not decided in Uniqlo, you know? I just know I want a T -shirt. I said, I want a T -shirt. Black colour, with collar, with buttons.

[08:02] Speaker 1: Not

[08:02] Speaker 4: hot. Not hot. Yes. Crispy, right? No one can, whatever. So,

[08:06] Speaker 1: from the merchants, their concern is whether their products get surfaced. Yes. But the thing is, if we are building an Asian layer for a lot of these merchants, right? It's like, for example, you go on Google, right?

[08:18] Speaker 5: Like, they're not going to show you all the links

[08:20] Speaker 4: at once. It's like a list of the links. That's why it's like...

[08:24] Speaker 1: Then how do we make sure that all our merchants are placed equally on the Asian layer?

[08:28] Speaker 4: Yeah, but then, yes, they'll give you a list, right? But you must make sure your brand is one of the lists. If your brand is not one of the lists, then...

[08:35] Speaker 2: I'm sorry.

[08:36] Speaker 4: You're not even considered. I think that comes under consumer end point of view, right? Can our agent prompt them as well enough to give them the better recommendations?

[08:44] Speaker 5: Okay. So, discovery, that comes under discovery. Discovery. So, it's a search and discovery, yes. When it comes to the merchant platform itself, right? Let's say we talk about clothing itself, right? Clothing, they can upload. They can have their materials in multiple shops. Like, let's talk more about Uniqlo. You might have one centralized place for them to keep their information. But, that's why the information you're talking about small and

[09:06] Speaker 2: medium mostly, right? So, small and medium, let's say Singapore, can have many outputs.

[09:11] Speaker 3: Not exactly

[09:12] Speaker 2: everything is tracked or like... And then you

[09:16] Speaker 5: want to make it easy for the merchants to upload also. So,

[09:20] Speaker 2: can our merchant point of view be like... They just take a photo and then upload to our agent and then we can use that as a listing also?

[09:27] Speaker 4: Yes, yes. But then like I said... Just like you mentioned nowadays, it can pick

[09:31] Speaker 2: up a picture, is it? Yeah. I mean, let's say the model is able to pick up pictures, then yeah, good.

[09:35] Kaleb: I thought you cannot. Because in the past, we know. Yeah, in the past, yeah.

[09:38] Speaker 4: No, no. Very recent. Like a fast stream, actually. It's very fast. It's them fast. It's super fast. It's super fast. Yeah, super fast. Yeah, technology has also so fast.

[09:46] Speaker 5: So, if you even pick up pictures, then good. Right. So, at least your product, you want your product

[09:50] Speaker 4: to its surface to the end. Okay. Okay.

[09:54] Speaker 3: Okay. So, in general, it's just a shopping agent but tailored

[09:56] Speaker 4: for

[09:57] Speaker 1: a specific category. Instead of an agent platform... Oh, do you need her? Just finish off. Just to... I don't want to interrupt you. It's actually been sent to you, but who's still waiting for you as well?

[10:06] Speaker 3: Oh. Oh, okay. Thank you. Okay.

[10:09] Speaker 5: So, it's a general... It's an agent for a specific category instead of an agent that tailors to

[10:14] Speaker 4: that merchant's shop only. Yes. Yeah, I agree. Okay. You want it to surface to your... So, how can you enable... Make sure that your product is shown to the audience.

[10:28] Speaker 2: In the demo, do we have to actually show how the agent goes and does the web crawl or does like, you know, in Canvassel go and look out about the merchant's product?

[10:38] Speaker 5: Okay. We need to show that in the demo.

[10:39] Speaker 4: Okay. You

[10:39] Speaker 2: imagine right now, what does an agent do? Okay. You go along that line, you check.

[10:44] Speaker 5: Okay. Okay. Understood. Okay.

[10:49] Speaker 3: Thank you. Thank you.

[10:50] Speaker 4: Thank you.

[10:53] Speaker 3: Thank

[10:53] Speaker 5: you.

[10:56] Speaker 1: Thank

[10:57] Speaker 5: you. Thank you. Thank you. Maybe three years.

[11:00] Speaker 3: Oh. Thank you. Thank you. Thank you.

