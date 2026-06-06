import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleProp, TextStyle } from 'react-native';
import { resolveIcon } from '../../constants/icons';

interface Props {
    // An Ionicons name OR a legacy emoji (resolved automatically)
    name?: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
}

// Renders a vector icon for category / goal / payment "icon" values,
// transparently mapping any legacy emoji to an Ionicons glyph.
const AppIcon = ({ name, size = 22, color = '#000', style }: Props) => (
    <Ionicons name={resolveIcon(name) as any} size={size} color={color} style={style} />
);

export default AppIcon;
