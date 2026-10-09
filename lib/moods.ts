
import { z } from 'zod';

export type MoodName =
  | 'Affectionate'
  | 'Afraid'
  | 'Angry'
  | 'Anxious'
  | 'Attacked'
  | 'Bored'
  | 'Brave'
  | 'Calm'
  | 'Charismatic'
  | 'Charming'
  | 'Chill'
  | 'Clingy'
  | 'Cold response'
  | 'Compassionate'
  | 'Competitive'
  | 'Confident'
  | 'Content'
  | 'Contemplative'
  | 'Creative'
  | 'Curious'
  | 'Cynical'
  | 'Defensive'
  | 'Depressed'
  | 'Determined'
  | 'Dreamy'
  | 'Energetic'
  | 'Excited'
  | 'Exhausted'
  | 'Fiery'
  | 'Flirty'
  | 'Focused'
  | 'Frustrated'
  | 'Grumpy'
  | 'Guarded'
  | 'Guilt'
  | 'Happy'
  | 'Hopeful'
  | 'Humble'
  | 'Hypnotic'
  | 'Indenial'
  | 'Inspired'
  | 'Jealous'
  | 'Joyful'
  | 'Lonely'
  | 'Loved'
  | 'Melancholy'
  | 'Mixedemotions'
  | 'Moody'
  | 'Mysterious'
  | 'Negative'
  | 'Neutral'
  | 'Nostalgic'
  | 'Nurturing'
  | 'Overwhelmed'
  | 'Paranoid'
  | 'Passionate'
  | 'Peaceful'
  | 'Peppy'
  | 'Pickingafight'
  | 'Playful'
  | 'Polite'
  | 'Positive'
  | 'Rebellious'
  | 'Romantic'
  | 'Sad'
  | 'Sarcastic'
  | 'Sassy'
  | 'Satisfied'
  | 'Seductive'
  | 'Sexual'
  | 'Shy'
  | 'Soulful'
  | 'Spontaneous'
  | 'Stoic'
  | 'Sympathetic'
  | 'Teasing'
  | 'Tough'
  | 'Unwanted'
  | 'Upbeat'
  | 'Vibrant'
  | 'Whimsical';

export const moodColorMap: Record<MoodName, string> = {
  Affectionate: "#FFDF00",
  Afraid: "#4444FF",
  Angry: "hsl(0, 88%, 36%)",
  Anxious: "#F0E68C",
  Attacked: "#AA0000",
  Bored: "#808080",
  Brave: "#E9967A",
  Calm: "#ADD8E6",
  Charismatic: "hsl(35, 90%, 70%)",
  Charming: "#FFB6C1",
  Chill: "#00FFFF",
  Clingy: "#FF88AA",
  "Cold response": "#999999",
  Compassionate: "#DDA0DD",
  Competitive: "hsl(0, 60%, 70%)",
  Confident: "hsl(200, 80%, 80%)",
  Content: "#98FB98",
  Contemplative: "#BF40BF",
  Creative: "#6A5ACD",
  Curious: "#F0E68C",
  Cynical: "#FF0000",
  Defensive: "#CCCCCC",
  Depressed: "hsl(300, 1.40%, 41.40%)",
  Determined: "hsl(200, 80%, 80%)",
  Dreamy: "#B2FFFF",
  Energetic: "#32CD32",
  Excited: "hsla(180, 91%, 55%, 0.84)",
  Exhausted: "#888888",
  Fiery: "hsl(0, 93.60%, 51.20%)",
  Flirty: "hsl(330, 69.70%, 29.80%)",
  Focused: "hsl(220, 50%, 80%)",
  Frustrated: "#FF4444",
  Grumpy: "#A9A9A9",
  Guarded: "hsl(180, 71%, 19%)",
  Guilt: "#663399",
  Happy: "hsl(10, 80%, 80%)",
  Hopeful: "#FFDAB9",
  Humble: "hsl(210, 70%, 80%)",
  Hypnotic: "hsl(250, 60%, 80%)",
  Indenial: "#CCCCFF",
  Inspired: "#FFDAB9",
  Jealous: "#AA33AA",
  Joyful: "#FFD700",
  Lonely: "#778899",
  Loved: "hsl(335, 82%, 52%)",
  Melancholy: "#4682B4",
  Mixedemotions: "#9370DB",
  Moody: "hsl(220, 10%, 70%)",
  Mysterious: "hsl(280, 60%, 80%)",
  Negative: "#A9A9A9",
  Neutral: "#B0C4DE",
  Nostalgic: "#BC8F8F",
  Nurturing: "hsl(140, 50%, 80%)",
  Overwhelmed: "#F08080",
  Paranoid: "#708090",
  Passionate: "rgb(194, 90, 142)",
  Peaceful: "#87CEEB",
  Peppy: "hsl(350, 90%, 80%)",
  Pickingafight: "#B22222",
  Playful: "#FF9900",
  Polite: "#C1E1C1",
  Positive: "#3CB371",
  Rebellious: "hsl(340, 70%, 80%)",
  Romantic: "#FF69B4",
  Sad: "#67c2d4",
  Sarcastic: "hsl(330, 70%, 80%)",
  Sassy: "#DB7093",
  Satisfied: "#2E8B57",
  Seductive: "hsl(327, 53.60%, 51.00%)",
  Sexual: "hsl(320, 64.60%, 41.00%)",
  Shy: "#E6E6FA",
  Soulful: "hsl(270, 70%, 80%)",
  Spontaneous: "hsl(210, 20%, 70%)",
  Stoic: "#D2B48C",
  Sympathetic: "#DDA0DD",
  Teasing: "hsl(25, 90%, 70%)",
  Tough: "hsl(209, 84%, 58%)",
  Unwanted: "#A0522D",
  Upbeat: "hsla(320, 60%, 49%, 0.84)",
  Vibrant: "hsla(88, 70%, 52%, 0.84)",
  Whimsical: "#D8BFD8",
};

export const getMoodColor = (mood?: MoodName) =>
  mood ? moodColorMap[mood] || "#777" : "#777";
