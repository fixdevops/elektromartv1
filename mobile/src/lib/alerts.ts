import { Alert } from 'react-native'
import { getErrorMessage } from './commerce'

export function showError(title: string, error: unknown, fallback?: string): void {
  Alert.alert(title, getErrorMessage(error, fallback))
}

export function showInfo(title: string, message: string): void {
  Alert.alert(title, message)
}
