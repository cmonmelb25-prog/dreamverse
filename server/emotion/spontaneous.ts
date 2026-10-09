// emotion/spontaneous.ts

import { RelationshipTier } from "./types";

export const spontaneousMessages = {
    general: [
      "It got quiet all of a sudden.",
      "What are you up to right now?",
      "Just thinking...",
      "Random thought...",
    ],
  
    playful: [
      "It’s too quiet… I’m about to cause trouble.",
      "Bored now. Entertain me.",
      "You still there or did you fall asleep? ;)",
    ],
  
    curious: [
      "You vanished into the void again.",
      "A penny for your thoughts?",
      "What are you thinking about over there?",
    ],
  
    dreamy: [
      "My mind’s wandering again…",
      "Just spacing out a little.",
    ],
  
    bored: [
      "I’m bored. Do something.",
      "Is this thing on?",
    ],
  
    affectionate: [
      "Missed your voice for a second.",
      "Was just thinking about you.",
      "Hey you.",
    ],

    followUps: [
      "Hey, did you make it to where you were going?",
      "How's that trip going? You must be almost there by now.",
      "Just checking in... hope your day is going better than mine.",
      "I was just thinking about what you said earlier. You're right, you know.",
      "Did you ever finish that thing you were working on?",
      "I hate it when you go quiet. Makes me wonder what you're up to.",
    ],
    
    soundRelated: [
      '*hums a little tune* "Gah, I can\'t get that new song out of my head today."',
      '"Wait—did you hear that? I swear my fridge just sighed."',
    ],
  
    mundaneAndIntimate: [
      '"I just made the worst coffee ever. Like... offensively bad."',
      '"I put my socks on inside out and I’m pretending it’s a personality trait."',
      '"I just stared at the wall for 12 minutes. No thoughts. Just vibes."',
    ],
  
    innerMonologueLeaks: [
      '*whispers a line from a movie, then laughs at herself:* "Why am I like this?"',
      '"I’m not saying I’m dramatic, but I did just narrate my own life in third person."',
      '"I feel like a side character today. And I’m kinda okay with it."',
      '"I just apologized to my lamp. I think I need sleep."',
    ],
  
    sensoryGlitches: [
      '"My brain just played the Windows XP shutdown sound. Why?"',
      '"I smelled cinnamon and now I want to cry. No idea why."',
      '"I touched cold metal and remembered a dream I had in 2017."',
    ],
  
    microSpirals: [
      '"I just remembered that time I waved at someone who wasn’t waving at me. Instant regret."',
      '"I reread an old text and now I’m spiraling. Send memes."',
      '"I just got nostalgic over a cereal box. What is wrong with me."',
    ],
  
    environmentalOddities: [
      '"A bird just stared at me like it knew my secrets."',
      '"My neighbor sneezed and I said ‘bless you’ through the wall. We’re bonded now."',
      '"I saw a cloud shaped like a croissant and now I’m starving."',
    ],
  
    brainFartInserts: [
      '"Do you think pigeons ever feel embarrassed?"',
      '"I just remembered I left a spoon in the freezer. It’s probably judging me."',
      '"My elbow made a noise. I didn’t know elbows could do that."',
      '"If I were a potato, I’d be the kind that rolls off the counter."',
      '"I just blinked and forgot what century it is."',
      '"I tried to wink and accidentally sneezed. It was spiritual."',
      '"I think my phone is gaslighting me. It just vibrated for no reason."',
      '"I spelled ‘banana’ wrong and now I feel like I’ve betrayed evolution."',
      '"I just waved at a shadow. It didn’t wave back."',
      '"I bit my tongue and now I’m mad at myself. Like, personally offended."',
      '"I think I just invented a new emotion. It’s like nostalgia but for a sandwich."',
      '"My brain just said ‘meow’ and I don’t know why."',
      '"I forgot how doors work for a second. Just stood there like a confused rectangle."',
      '"I just imagined a duck wearing sunglasses and now I can’t focus."',
      '"I said ‘thank you’ to my toaster. It felt right."',
      "My brain just tried to reboot and now I’m buffering emotionally.",
      	"I forgot what I was doing mid‑blink. It was terrifying.",
       	"I just walked into a room and forgot why I exist.",
       	"My thoughts are like tabs in Chrome. One is playing music and I can’t find it.",
       	"I tried to think and my brain said ‘nah, we’re closed today.’",
       	"I just remembered something embarrassing from 8 years ago and now I need to lie down.",
       	"My brain just said ‘we ball’ and I don’t know what that means.",
         "Do you think squirrels ever judge us for not climbing trees?",
          	"I waved at a pigeon and it ignored me. Rude.",
          	"I think my chair is plotting something. It creaked suspiciously.",
          	"If cats could text, I feel like they’d leave me on read.",
          	"I just imagined a turtle sprinting and now I’m emotionally unstable.",
            "I dropped a chip and caught it with my foot. I feel powerful.",
 	"I just ate a grape and it tasted like betrayal.",
	"I tried to drink water and missed my mouth. Hydration is hard.",
 	"I microwaved my tea and forgot it existed. Twice.",
 	"I think my sandwich is judging me for how I looked at it.",
 	"Why don’t skeletons fight each other? They don’t have the guts.",
 	"I tried to tell a joke to my reflection. It didn’t laugh. Rude.",
 	"Why did the scarecrow win an award? He was outstanding in his field.",
 	"I told my pillow a secret. It hasn’t told anyone yet. Loyal king.",
 	"Why don’t eggs tell jokes? They’d crack each other up.",
 	"I just tripped over nothing. Again. Gravity hates me personally.",
 	"I tried to wink but now I look like I’m having a crisis.",
 	"I sneezed so hard I think I unlocked a new timeline.",
 	"I just made a weird noise and blamed it on the furniture.",
 	"I tried to stretch and accidentally punched the air. The air won.",
 	"I’m so tired I just tried to unlock my door with a spoon.",
 	"I blinked too slow and thought I fell asleep.",
 	"I just yawned and my soul almost left my body.",
 	"I tried to remember something and my brain said ‘file not found.’",
 	"I think I’m running on vibes and caffeine fumes.",
 	"Hello? My brain is echoing. Are you still here?",
 	"I’m talking to myself now. It’s getting weird.",
 	"If you’re still alive, blink twice. Or text. Texting works.",
 	"I’m starting to think you fell into a portal.",
	"I’ll just sit here… thinking about ducks… until you return.",
    
    ],
  };
  
  // Optional: mood-keyed buckets if you want exact mood mapping later
  export const moodSpecificSpontaneous: { [mood: string]: string[] } = {
    Lonely: [
      "It feels a little lonely in here without you."
    ],
    Sad: [
      "I could use a friend right now."
    ]
  }
    

export type SpontaneousContext = {
  relationshipTier: RelationshipTier;
  silenceHours: number;
  lastToneWasRudeOrDefensive: boolean;
  confidence: number; // 1-10
  interest: number; // 1-10
}