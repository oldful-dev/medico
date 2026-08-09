import React from 'react';

/**
 * Safely scrolls a ScrollView or KeyboardAwareScrollView to a target Y coordinate.
 * Handles React Native Fabric, legacy architecture, and ref variants without throwing runtime errors.
 */
export const safeScrollToPosition = (scrollViewRef: React.RefObject<any> | any, targetY: number) => {
    try {
        const ref = scrollViewRef?.current || scrollViewRef;
        if (!ref) return;

        if (typeof ref.scrollToPosition === 'function') {
            ref.scrollToPosition(0, Math.max(0, targetY), true);
        } else if (typeof ref.scrollTo === 'function') {
            ref.scrollTo({ y: Math.max(0, targetY), animated: true });
        } else if (typeof ref.getScrollResponder === 'function') {
            const responder = ref.getScrollResponder();
            if (responder) {
                if (typeof responder.scrollTo === 'function') {
                    responder.scrollTo({ y: Math.max(0, targetY), animated: true });
                } else if (typeof responder.scrollResponderScrollTo === 'function') {
                    responder.scrollResponderScrollTo({ x: 0, y: Math.max(0, targetY), animated: true });
                }
            }
        }
    } catch (err) {
        // Non-fatal — prevents runtime Metro stack overlay
    }
};
