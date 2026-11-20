#!/usr/bin/env bash
# The new S01 film (12 Nov 2026, task 96-1): three vidIQ shots cross-faded, their generated audio dropped, the narration's three lines
# placed on the shots they describe, normalised to -18 LUFS; captions are the narration word for word (WebVTT + a burned-in version).
set -euo pipefail; cd "$(dirname "$0")"; O=out; mkdir -p $O
X=0.6; T1=8; T2=8
L1=(0.00 1.20); L2=(2.40 7.60); L3=(8.80 11.65)   # narration segments (from its pauses)
P1=1.0; P2=7.8; P3=15.6                          # where each line starts in the film
DUR=$(echo "$T1+$T2+8-2*$X" | bc)
ffmpeg -y -v error -i shot1-vidiq-minimax-h3.mp4 -i shot2-vidiq-minimax-h3.mp4 -i shot3-vidiq-minimax-h3.mp4 -filter_complex "
[0:v]scale=1080:1920:flags=lanczos,setsar=1,fps=24[a];[1:v]scale=1080:1920:flags=lanczos,setsar=1,fps=24[b];[2:v]scale=1080:1920:flags=lanczos,setsar=1,fps=24[c];
[a][b]xfade=transition=fade:duration=$X:offset=$(echo "$T1-$X"|bc)[ab];[ab][c]xfade=transition=fade:duration=$X:offset=$(echo "$T1+$T2-2*$X"|bc),format=yuv420p[v]" -map "[v]" -an -c:v libx264 -preset veryfast -crf 19 -threads 2 $O/video.mp4
ffmpeg -y -v error -i narration.mp3 -filter_complex "
[0:a]atrim=${L1[0]}:${L1[1]},asetpts=PTS-STARTPTS,adelay=$(echo "$P1*1000"|bc|cut -d. -f1):all=1[n1];
[0:a]atrim=${L2[0]}:${L2[1]},asetpts=PTS-STARTPTS,adelay=$(echo "$P2*1000"|bc|cut -d. -f1):all=1[n2];
[0:a]atrim=${L3[0]}:${L3[1]},asetpts=PTS-STARTPTS,adelay=$(echo "$P3*1000"|bc|cut -d. -f1):all=1[n3];
[n1][n2][n3]amix=inputs=3:normalize=0:duration=longest[m]" -map "[m]" -t $DUR $O/mix.wav
M=$(ffmpeg -hide_banner -i $O/mix.wav -af loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | python3 -I -c "import sys,json;t=sys.stdin.read();j=json.loads(t[t.rindex('{'):]);print(f\"measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}\")")
ffmpeg -y -v error -i $O/video.mp4 -i $O/mix.wav -af "loudnorm=I=-18:TP=-1.5:LRA=11:$M:linear=true" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -t $DUR -movflags +faststart $O/S01-new.mp4
rm -f $O/video.mp4 $O/mix.wav
cat > $O/S01-new.vtt <<VTT
WEBVTT

1
00:00:01.000 --> 00:00:03.000
Start with a building.

2
00:00:07.800 --> 00:00:13.200
Find everything connected: every room, every device, and what each one depends on.

3
00:00:15.600 --> 00:00:22.000
One record you can search, before something breaks.

4
00:00:19.000 --> 00:00:22.800
Illustration. Synthetic demonstration data.
VTT
ffmpeg -y -v error -i $O/S01-new.mp4 -vf "subtitles=$O/S01-new.vtt:force_style='FontName=Inter,FontSize=14,PrimaryColour=&H00FFFFFF,BackColour=&HB0101418,BorderStyle=4,Outline=0,MarginV=60'" -c:v libx264 -preset veryfast -crf 19 -c:a copy -threads 2 -movflags +faststart $O/S01-new-captioned.mp4
ffmpeg -y -v error -ss 9 -i $O/S01-new.mp4 -frames:v 1 -q:v 3 $O/poster.jpg
