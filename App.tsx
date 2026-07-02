import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { colors } from './src/theme';
import { DEFAULTS, loadSettings, saveSettings, Settings } from './src/settings';
import SetupScreen from './src/SetupScreen';
import TimerScreen from './src/TimerScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<'setup' | 'timer'>('setup');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  if (!fontsLoaded || !settings) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  const handleChange = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      {screen === 'setup' ? (
        <SetupScreen settings={settings} onChange={handleChange} onStart={() => setScreen('timer')} />
      ) : (
        <TimerScreen settings={settings} onExit={() => setScreen('setup')} />
      )}
    </View>
  );
}
