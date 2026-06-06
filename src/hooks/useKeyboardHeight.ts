import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';

/**
 * Tracks the on-screen keyboard height (0 when hidden).
 *
 * React Native's <Modal> renders in its own Android window that ignores the
 * Activity's android:windowSoftInputMode="adjustResize", so the keyboard
 * overlaps content anchored to the bottom. Applying `paddingBottom: kbHeight`
 * to a modal's overlay pushes a bottom sheet above the keyboard, and centers a
 * centered modal within the remaining visible area — on both platforms.
 */
export const useKeyboardHeight = (): number => {
    const [height, setHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e: KeyboardEvent) => setHeight(e.endCoordinates.height);
        const onHide = () => setHeight(0);

        const showSub = Keyboard.addListener(showEvent, onShow);
        const hideSub = Keyboard.addListener(hideEvent, onHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    return height;
};
