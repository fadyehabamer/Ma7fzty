import * as LocalAuthentication from 'expo-local-authentication';

// All calls are guarded so the app never crashes if the native module
// isn't present yet (e.g. before the dev-client has been rebuilt).

export const isBiometricAvailable = async (): Promise<boolean> => {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return false;
        return await LocalAuthentication.isEnrolledAsync();
    } catch {
        return false;
    }
};

export const getBiometricLabel = async (lang: string): Promise<string> => {
    const isAr = lang === 'ar';
    try {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return isAr ? 'بصمة الوجه' : 'Face ID';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return isAr ? 'بصمة الإصبع' : 'Fingerprint';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            return isAr ? 'بصمة العين' : 'Iris';
        }
    } catch {
        // fall through to generic label
    }
    return isAr ? 'القياسات الحيوية' : 'Biometrics';
};

export const authenticateBiometric = async (promptMessage: string): Promise<boolean> => {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
            disableDeviceFallback: true, // We use the app passcode as the fallback
        });
        return result.success;
    } catch {
        return false;
    }
};
