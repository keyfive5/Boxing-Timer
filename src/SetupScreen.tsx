import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from './theme';
import { fmtTime, PRESETS, Settings, workoutTotalSec } from './settings';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
}

// Press-and-hold auto-repeat for stepper buttons
function useRepeat(fn: () => void) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timeout.current) clearTimeout(timeout.current);
    if (interval.current) clearInterval(interval.current);
    timeout.current = null;
    interval.current = null;
  };

  const start = () => {
    fnRef.current();
    timeout.current = setTimeout(() => {
      interval.current = setInterval(() => fnRef.current(), 110);
    }, 450);
  };

  useEffect(() => stop, []);
  return { onPressIn: start, onPressOut: stop };
}

function StepButton({
  icon,
  onStep,
  disabled,
  label,
}: {
  icon: 'add' | 'remove';
  onStep: () => void;
  disabled: boolean;
  label: string;
}) {
  const repeat = useRepeat(onStep);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={repeat.onPressIn}
      onPressOut={repeat.onPressOut}
      style={({ pressed }) => [
        styles.stepBtn,
        pressed && { backgroundColor: colors.surfacePressed },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Ionicons name={icon} size={26} color={colors.text} />
    </Pressable>
  );
}

function StepperRow({
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.stepperRight}>
        <StepButton icon="remove" onStep={onDec} disabled={!canDec} label={`Decrease ${label}`} />
        <Text style={styles.cardValue}>{value}</Text>
        <StepButton icon="add" onStep={onInc} disabled={!canInc} label={`Increase ${label}`} />
      </View>
    </View>
  );
}

// Durations step by 10s under a minute, 30s above
function stepDuration(sec: number, dir: 1 | -1, min: number, max: number): number {
  const step = (dir > 0 ? sec >= 60 : sec > 60) ? 30 : 10;
  return Math.max(min, Math.min(max, sec + dir * step));
}

export default function SetupScreen({ settings, onChange, onStart }: Props) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  const activePreset = PRESETS.find(
    (p) =>
      p.rounds === settings.rounds &&
      p.roundSec === settings.roundSec &&
      p.restSec === settings.restSec
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>BOXING TIMER</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle}>TOTAL {fmtTime(workoutTotalSec(settings))}</Text>
        </View>

        <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const active = activePreset?.name === p.name;
            return (
              <Pressable
                key={p.name}
                accessibilityRole="button"
                accessibilityLabel={`Preset ${p.name}`}
                accessibilityState={{ selected: active }}
                onPress={() => set({ rounds: p.rounds, roundSec: p.roundSec, restSec: p.restSec })}
                style={({ pressed }) => [
                  styles.chip,
                  active && styles.chipActive,
                  pressed && !active && { backgroundColor: colors.surfacePressed },
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <StepperRow
          label="ROUNDS"
          value={String(settings.rounds)}
          onDec={() => set({ rounds: Math.max(1, settings.rounds - 1) })}
          onInc={() => set({ rounds: Math.min(99, settings.rounds + 1) })}
          canDec={settings.rounds > 1}
          canInc={settings.rounds < 99}
        />
        <StepperRow
          label="ROUND TIME"
          value={fmtTime(settings.roundSec)}
          onDec={() => set({ roundSec: stepDuration(settings.roundSec, -1, 10, 1200) })}
          onInc={() => set({ roundSec: stepDuration(settings.roundSec, 1, 10, 1200) })}
          canDec={settings.roundSec > 10}
          canInc={settings.roundSec < 1200}
        />
        <StepperRow
          label="REST TIME"
          value={fmtTime(settings.restSec)}
          onDec={() => set({ restSec: stepDuration(settings.restSec, -1, 10, 600) })}
          onInc={() => set({ restSec: stepDuration(settings.restSec, 1, 10, 600) })}
          canDec={settings.restSec > 10}
          canInc={settings.restSec < 600}
        />
        <StepperRow
          label="GET READY"
          value={settings.prepSec === 0 ? 'OFF' : `${settings.prepSec}s`}
          onDec={() => set({ prepSec: Math.max(0, settings.prepSec - 5) })}
          onInc={() => set({ prepSec: Math.min(60, settings.prepSec + 5) })}
          canDec={settings.prepSec > 0}
          canInc={settings.prepSec < 60}
        />

        <View style={styles.card}>
          <View style={styles.toggleLeft}>
            <Ionicons name="volume-high" size={22} color={colors.textMuted} />
            <Text style={styles.cardLabel}>SOUND</Text>
          </View>
          <Switch
            accessibilityLabel="Sound"
            value={settings.soundOn}
            onValueChange={(v) => set({ soundOn: v })}
            trackColor={{ false: colors.surfacePressed, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.card}>
          <View style={styles.toggleLeft}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.textMuted} />
            <Text style={styles.cardLabel}>VIBRATION</Text>
          </View>
          <Switch
            accessibilityLabel="Vibration"
            value={settings.vibrateOn}
            onValueChange={(v) => set({ vibrateOn: v })}
            trackColor={{ false: colors.surfacePressed, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start workout"
          onPress={onStart}
          style={({ pressed }) => [styles.startBtn, pressed && { backgroundColor: colors.primaryPressed }]}
        >
          <Text style={styles.startText}>START</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 16 },
  header: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
  title: { fontFamily: font.bold, fontSize: 40, color: colors.text, letterSpacing: 2 },
  titleRule: { width: 56, height: 4, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6 },
  subtitle: { fontFamily: font.semi, fontSize: 18, color: colors.textMuted, letterSpacing: 2, marginTop: 12 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: font.semi, fontSize: 16, color: colors.textMuted, letterSpacing: 1 },
  chipTextActive: { color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    minHeight: 72,
  },
  cardLabel: { fontFamily: font.semi, fontSize: 20, color: colors.text, letterSpacing: 1.5 },
  stepperRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    fontFamily: font.bold,
    fontSize: 30,
    color: colors.text,
    minWidth: 84,
    textAlign: 'center',
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { fontFamily: font.bold, fontSize: 30, color: colors.text, letterSpacing: 4 },
});
