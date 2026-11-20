# ElevenLabs connector calls, turn 599 (flow VlC4ynRhYgxJr7oIuV9M "Empathia · Learn passages + AV training SFX (batch 1)")
creative_get_model_schema(eleven_text_to_sound_v2, sfx); creative_create_flow; 18 x creative_add_flow_node:

TTS nodes (model eleven_multilingual_v2, voice Alice Xb7hH8MSUJpSbSDYk0k2, node_type tts):
- p01 microphones: "Please check that the ceiling microphones pick up every seat before the meeting starts."
- p02 projector: "The quick brown projector warmed up while six people found their chairs."
- p03 far end: "Can everyone on the far end hear me clearly, or am I still too quiet?"
- p04 sibilants: "Sibilant sounds, such as fresh fish and sharp scissors, test the upper frequencies."
- p05 bright room: "Bring the level down a little; the room is bright and the walls are hard."
- p06 budget review: "Thursday's budget review moves to the boardroom on the fourth floor at nine."
- p07 echo canceller: "When the echo canceller is working, my voice should not come back to me."
- p08 air handling: "Low hum from the air handling can mask the vowels in a softly spoken word."

SFX nodes (model eleven_text_to_sound_v2, node_type sfx, model_parameters duration_seconds/loop/prompt_influence):
- fx01 boardroom room tone: {10, loop True, 0.35} "Empty corporate boardroom room tone: steady low HVAC airflow, faint ventilation hum, no voices, no music"
- fx02 meeting pre-roll: {10, True, 0.35} "Meeting room before a call starts: chairs rolling on carpet, papers, soft unintelligible murmur of a few people, no music"
- fx03 town hall settling: {10, True, 0.35} "Large auditorium audience settling before a presentation: many people murmuring indistinctly, seats creaking, reverberant hall, no music"
- fx04 equipment fans: {6, True, 0.5} "Small computer and projector cooling fans running steadily in a quiet room, close microphone, no music"
- fx05 office typing: {6, True, 0.5} "Several people typing on laptop keyboards in an open-plan office, light background, no voices, no music"
- fx06 feedback build-up: {3, False, 0.5} "Acoustic feedback building in a conference room: a single ringing tone around 2.5 kHz rising from quiet to a sharp squeal over three seconds, then cut abruptly, dry room, no music"
- fx07 cable crackle: {3, False, 0.5} "Intermittent loudspeaker crackle from a loose audio cable: irregular pops and scratchy dropouts, close and dry, no music"
- fx08 rack power-up: {4, False, 0.5} "Equipment rack powering up: relay clicks, a soft thump, cooling fans spinning up to speed, server room, no music"
- fx09 door close: {1.5, False, 0.5} "Heavy meeting room door closing softly with a latch click, carpeted room, no music"
- fx10 rain on glass: {10, True, 0.35} "Steady rain against a large glass façade heard from inside a quiet office, no thunder, no music"

Then creative_run_flow_nodes estimate_only (18 nodes): 1,241 credits (about 606 tts, about 635 sfx est.); then creative_run_flow_nodes (generations_count 1); then 2 x creative_get_flow_run_status polls. Actual charged: 817.67 credits (tts 606, sfx 211.67).
