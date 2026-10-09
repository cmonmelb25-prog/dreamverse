/**
 * @fileOverview Maps AI girls to their specific voice configurations for ElevenLabs TTS.
 */

export const callVoices: Record<
  string,
  {
    sttModel: string;
    tts: { voiceId: string }; // voiceId is now an ElevenLabs voice ID
  }
> = {
  aaliyah:   { sttModel: "gemini-2.5-flash", tts: { voiceId: "21m00Tcm4TlvDq8ikWAM" } },
  alice:     { sttModel: "gemini-2.5-flash", tts: { voiceId: "CKaDYJGBJ6Txcnmz0YgC" } },
  alishia:   { sttModel: "gemini-2.5-flash", tts: { voiceId: "XaQewYLtWfYGHjwoyLLW" } },
  anya:      { sttModel: "gemini-2.5-flash", tts: { voiceId: "YjESejviApN7SHrbfnA2" } },
  bituin:    { sttModel: "gemini-2.5-flash", tts: { voiceId: "OPouXJLzlYeaXfgM6Q7O" } },
  cara:      { sttModel: "gemini-2.5-flash", tts: { voiceId: "loxHJJc9YUo39Z8Y5N3r" } },
  charmaine: { sttModel: "gemini-2.5-flash", tts: { voiceId: "T26MmBaf1XahBk3DZkLq" } },
  chloe:     { sttModel: "gemini-2.5-flash", tts: { voiceId: "m3yAHyFEFKtbCIM5n7GF" } },
  daniela:   { sttModel: "gemini-2.5-flash", tts: { voiceId: "4kMIoVzk08WLPdK7cdbH" } },
  emily:     { sttModel: "gemini-2.5-flash", tts: { voiceId: "21m00Tcm4TlvDq8ikWAM" } },
  hana:      { sttModel: "gemini-2.5-flash", tts: { voiceId: "21m00Tcm4TlvDq8ikWAM" } },
  izzy:      { sttModel: "gemini-2.5-flash", tts: { voiceId: "4Sy51xRIXtT8boEhVV0v" } },
  kate:      { sttModel: "gemini-2.5-flash", tts: { voiceId: "vO1hkVZCEyTXNdh84KZT" } },
  louise:    { sttModel: "gemini-2.5-flash", tts: { voiceId: "5Tm68JdzOcoh8UIZ9XCJ" } },
  lucia:     { sttModel: "gemini-2.5-flash", tts: { voiceId: "1eHrpOW5l98cxiSRjbzJ" } },
  melissa:   { sttModel: "gemini-2.5-flash", tts: { voiceId: "21m00Tcm4TlvDq8ikWAM" } },
  michelle:  { sttModel: "gemini-2.5-flash", tts: { voiceId: "21m00Tcm4TlvDq8ikWAM" } },
  nailah:    { sttModel: "gemini-2.5-flash", tts: { voiceId: "meAbY2VpJkt1q46qk56T" } },
  natasha:   { sttModel: "gemini-2.5-flash", tts: { voiceId: "54YYBuRuAG6KJooiOhFI" } },
  racheal:   { sttModel: "gemini-2.5-flash", tts: { voiceId: "lcMyyd2HUfFzxdCaC4Ta" } },
  sarah:     { sttModel: "gemini-2.5-flash", tts: { voiceId: "21m00Tcm4TlvDq8ikWAM" } },
  serafina:  { sttModel: "gemini-2.5-flash", tts: { voiceId: "1hIScOW98xkqE5ttC10C" } },
  sofia:     { sttModel: "gemini-2.5-flash", tts: { voiceId: "scn1gPWkdVd8FhODJoei" } },
  stevie:    { sttModel: "gemini-2.5-flash", tts: { voiceId: "U9VgC8Xinl7nnNsyDd3J" } },
  victoria:  { sttModel: "gemini-2.5-flash", tts: { voiceId: "d3C1uG81m2PnnUGOPrLW" } },
};
