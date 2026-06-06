// Central icon system. Category / savings-goal / payment "emoji" fields now store
// an Ionicons name. For backward compatibility, any legacy emoji still in storage
// is mapped to an icon at render time via resolveIcon().

export const DEFAULT_ICON = 'pricetag-outline';

// Legacy emoji -> Ionicons name (covers the old default categories + common picks)
export const EMOJI_TO_ICON: Record<string, string> = {
    '🍔': 'fast-food', '🍕': 'pizza', '🍎': 'nutrition', '☕': 'cafe', '🍺': 'beer',
    '🛒': 'cart', '🛍️': 'bag-handle', '🚗': 'car', '🚕': 'car-sport', '🚌': 'bus',
    '🚆': 'train', '✈️': 'airplane', '🚲': 'bicycle', '⛽': 'speedometer',
    '🏠': 'home', '🏡': 'home', '🛏️': 'bed', '💡': 'bulb', '💧': 'water',
    '⚡': 'flash', '📶': 'wifi', '📱': 'phone-portrait', '☎️': 'call',
    '🎮': 'game-controller', '🎬': 'film', '🎵': 'musical-notes', '🎧': 'headset',
    '📺': 'tv', '🏥': 'medkit', '💊': 'medkit', '🏋️': 'barbell', '💪': 'fitness',
    '❤️': 'heart', '🎓': 'school', '📚': 'book', '👕': 'shirt', '🎁': 'gift',
    '🐾': 'paw', '🐶': 'paw', '🐱': 'paw', '✂️': 'cut', '🔧': 'construct',
    '🔨': 'hammer', '💼': 'briefcase', '💻': 'laptop', '🖥️': 'desktop',
    '💰': 'cash', '💵': 'cash', '💳': 'card', '👛': 'wallet', '📈': 'trending-up',
    '🏦': 'business', '🎯': 'flag', '🏆': 'trophy', '💎': 'diamond', '🚀': 'rocket',
    '🌍': 'globe', '⭐': 'star', '🎉': 'trophy', '📷': 'camera', '🎂': 'gift',
    '🧾': 'receipt', '☂️': 'umbrella', '🌟': 'star', '🏖️': 'sunny',
};

// Selectable icons shown in the category / goal picker grid.
export const PICKER_ICONS: string[] = Array.from(new Set([
    'fast-food', 'restaurant', 'cafe', 'pizza', 'beer', 'nutrition',
    'cart', 'bag-handle', 'basket',
    'car', 'bus', 'train', 'airplane', 'bicycle', 'boat', 'speedometer',
    'home', 'bed', 'bulb', 'water', 'flash', 'wifi', 'phone-portrait', 'call',
    'game-controller', 'film', 'musical-notes', 'headset', 'tv',
    'medkit', 'fitness', 'barbell', 'heart', 'school', 'book', 'library',
    'shirt', 'gift', 'paw', 'cut', 'construct', 'hammer',
    'briefcase', 'laptop', 'desktop', 'business',
    'cash', 'card', 'wallet', 'trending-up', 'trending-down', 'receipt',
    'pricetag', 'pricetags', 'star', 'diamond', 'rocket', 'trophy', 'flag',
    'gift', 'happy', 'leaf', 'flower', 'football', 'basketball', 'tennisball',
    'camera', 'image', 'calendar', 'globe', 'person', 'people', 'umbrella',
    'sunny', 'planet', 'ribbon', 'build',
]));

const ICON_SET = new Set(PICKER_ICONS);

// Resolve a stored value (icon name or legacy emoji) to a valid Ionicons name.
export const resolveIcon = (value?: string): string => {
    if (!value) return DEFAULT_ICON;
    if (ICON_SET.has(value)) return value;
    if (EMOJI_TO_ICON[value]) return EMOJI_TO_ICON[value];
    // Strip a trailing variation selector and retry (e.g. "✈️" vs "✈")
    const bare = value.replace(/️/g, '');
    if (EMOJI_TO_ICON[bare]) return EMOJI_TO_ICON[bare];
    return DEFAULT_ICON;
};
