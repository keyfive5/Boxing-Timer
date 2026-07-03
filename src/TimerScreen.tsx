import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { colors, font } from './theme';
import { fmtTime, Settings } from './settings';
import { Phase, useWorkoutTimer } from './useWorkoutTimer';

const bellSrc = require('../assets/sounds/bell.wav');
const bell3Src = require('../assets/sounds/bell3.wav');
const clackSrc = require('../assets/sounds/clack.wav');

interface Props {
  settings: Settings;
  onExit: () => void;
}

const PHASE_BG: Record<Phase, string> = {
  prep: colors.prepBg,
  round: colors.roundBg,
  rest: colors.restBg,
};

const PHASE_LABEL: Record<Phase, string> = {
  prep: 'GET READY',
  round: 'ROUND',
  rest: 'REST',
};

// Fixed-width digit rendering so the clock doesn't jitter as digits change
function BigClock({ ms, fontSize }: { ms: number; fontSize: number }) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const str = fmtTime(totalSec);
  return (
    <View style={styles.clockRow} accessibilityRole="timer" accessibilityLabel={`${str} remaining`}>
      {str.split('').map((ch, i) => (
        <Text
          key={i}
          style={[
            styles.clockChar,
            { fontSize, lineHeight: fontSize * 1.05 },
            ch === ':' ? { width: fontSize * 0.28 } : { width: fontSize * 0.52 },
          ]}
        >
          {ch}
        </Text>
      ))}
    </View>
  );
}

export default function TimerScreen({ settings, onExit }: Props) {
  useKeepAwake();
  const { width } = useWindowDimensions();
  const [soundOn, setSoundOn] = useState(settings.soundOn);
  const soundRef = React.useRef(soundOn);
  soundRef.current = soundOn;

  const bell = useAudioPlayer(bellSrc);
  const bell3 = useAudioPlayer(bell3Src);
  const clack = useAudioPlayer(clackSrc);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const play = async (player: typeof bell) => {
    if (!soundRef.current) return;
    // seekTo must complete before play, or replays after the first are silent on iOS
    try {
      await player.seekTo(0);
      player.play();
    } catch {}
  };

  const buzz = (fn: () => Promise<void>) => {
    if (!settings.vibrateOn) return;
    fn().catch(() => {});
  };

  const timer = useWorkoutTimer(settings, {
    onSegmentStart: (seg) => {
      if (seg.phase === 'round' || seg.phase === 'rest') {
        play(bell);
        buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      }
    },
    onWarning: () => {
      play(clack);
      buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    },
    onCountdownTick: () => {
      buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    },
    onDone: () => {
      play(bell3);
      buzz(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    },
  });

  const { status, segment, remainingMs } = timer;
  const phase = segment.phase;

  const displaySec = Math.ceil(remainingMs / 1000);
  const clockFont = Math.min(
    (displaySec >= 600 ? width * 0.92 : width * 0.9) / (displaySec >= 600 ? 2.9 : 2.4),
    190
  );

  const segProgress = segment.durMs > 0 ? 1 - remainingMs / segment.durMs : 1;

  if (status === 'done') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
        <View style={styles.doneWrap}>
          <Ionicons name="checkmark-circle" size={88} color={colors.primary} />
          <Text style={styles.doneTitle}>COMPLETE</Text>
          <Text style={styles.doneSub}>
            {settings.rounds} {settings.rounds === 1 ? 'ROUND' : 'ROUNDS'} · {fmtTime(settings.roundSec)} EACH
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to setup"
            onPress={onExit}
            style={({ pressed }) => [styles.doneBtn, pressed && { backgroundColor: colors.primaryPressed }]}
          >
            <Text style={styles.doneBtnText}>DONE</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const paused = status === 'paused';
  const bg = paused ? colors.bg : PHASE_BG[phase];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={paused ? 'Close' : 'Pause and show options'}
          onPress={timer.pause}
          disabled={paused}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <Ionicons name="close" size={30} color={colors.text} />
        </Pressable>
        <Text style={styles.roundIndicator}>
          {phase === 'prep' ? 'STARTING' : `ROUND ${segment.round} OF ${settings.rounds}`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={soundOn ? 'Mute sound' : 'Unmute sound'}
          onPress={() => setSoundOn(!soundOn)}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        >
          <Ionicons name={soundOn ? 'volume-high' : 'volume-mute'} size={26} color={colors.text} />
        </Pressable>
      </View>

      {paused ? (
        <View style={styles.centerWrap}>
          <Text style={styles.pausedLabel}>PAUSED</Text>
          <BigClock ms={remainingMs} fontSize={Math.min(clockFont, 150)} />
          <View style={styles.pausedActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume workout"
              onPress={timer.resume}
              style={({ pressed }) => [styles.resumeBtn, pressed && { backgroundColor: colors.primaryPressed }]}
            >
              <Ionicons name="play" size={28} color={colors.text} />
              <Text style={styles.resumeText}>RESUME</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End workout"
              onPress={onExit}
              style={({ pressed }) => [styles.endBtn, pressed && { backgroundColor: colors.surface }]}
            >
              <Text style={styles.endText}>END WORKOUT</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.centerWrap}>
            <Text style={styles.phaseLabel}>{PHASE_LABEL[phase]}</Text>
            <BigClock ms={remainingMs} fontSize={clockFont} />
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, segProgress * 100)}%` }]} />
            </View>
          </View>

          {/* Bottom controls */}
          <View style={styles.controls}>
            <View style={styles.sideSlot} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pause"
              onPress={timer.pause}
              style={({ pressed }) => [styles.pauseBtn, pressed && { transform: [{ scale: 0.96 }], opacity: 0.85 }]}
            >
              <Ionicons name="pause" size={44} color={bg} />
            </Pressable>
            <View style={styles.sideSlot}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip to next"
                onPress={timer.skip}
                style={({ pressed }) => [styles.skipBtn, pressed && styles.iconBtnPressed]}
              >
                <Ionicons name="play-skip-forward" size={26} color={colors.text} />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: 'rgba(255,255,255,0.15)' },
  roundIndicator: { fontFamily: font.semi, fontSize: 22, color: colors.text, letterSpacing: 2 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  phaseLabel: {
    fontFamily: font.semi,
    fontSize: 34,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 6,
    marginBottom: 4,
  },
  clockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  clockChar: { fontFamily: font.bold, color: colors.text, textAlign: 'center' },
  progressTrack: {
    width: '78%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.9)' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  sideSlot: { flex: 1, alignItems: 'center' },
  pauseBtn: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedLabel: {
    fontFamily: font.semi,
    fontSize: 30,
    color: colors.textMuted,
    letterSpacing: 6,
    marginBottom: 8,
  },
  pausedActions: { marginTop: 32, width: '100%', alignItems: 'center', gap: 14 },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 16,
    minHeight: 64,
    width: '86%',
  },
  resumeText: { fontFamily: font.bold, fontSize: 28, color: colors.text, letterSpacing: 3 },
  endBtn: {
    borderRadius: 16,
    minHeight: 56,
    width: '86%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  endText: { fontFamily: font.semi, fontSize: 22, color: colors.primary, letterSpacing: 2 },
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  doneTitle: { fontFamily: font.bold, fontSize: 56, color: colors.text, letterSpacing: 4, marginTop: 16 },
  doneSub: { fontFamily: font.semi, fontSize: 22, color: colors.textMuted, letterSpacing: 2, marginTop: 8 },
  doneBtn: {
    marginTop: 40,
    backgroundColor: colors.primary,
    borderRadius: 16,
    minHeight: 64,
    width: '86%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { fontFamily: font.bold, fontSize: 28, color: colors.text, letterSpacing: 4 },
});
