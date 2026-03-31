import * as ImagePicker from 'expo-image-picker'
import { useCallback } from 'react'

export type PickResult =
  | { ok: true; uri: string; canceled?: false }
  | { ok: false; canceled: true; reason?: string }

export function useImagePick() {
  const pickLibrary = useCallback(async (): Promise<PickResult> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      return { ok: false, canceled: true, reason: 'Photo library access was denied.' }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    })
    if (res.canceled || !res.assets?.[0]?.uri) {
      return { ok: false, canceled: true }
    }
    return { ok: true, uri: res.assets[0].uri }
  }, [])

  const pickCamera = useCallback(async (): Promise<PickResult> => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      return { ok: false, canceled: true, reason: 'Camera access was denied.' }
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.85,
    })
    if (res.canceled || !res.assets?.[0]?.uri) {
      return { ok: false, canceled: true }
    }
    return { ok: true, uri: res.assets[0].uri }
  }, [])

  return { pickLibrary, pickCamera }
}
