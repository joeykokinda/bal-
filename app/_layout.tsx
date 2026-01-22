import 'react-native-get-random-values';
import '@ethersproject/shims';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#F9FAFB',
          },
          headerTintColor: '#6C5DD3',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#111827',
          },
          contentStyle: {
            backgroundColor: '#F9FAFB',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="add-wallet" 
          options={{ 
            title: '',
            presentation: 'modal',
            headerShadowVisible: false,
          }} 
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
