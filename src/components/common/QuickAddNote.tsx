import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { parseTransactionNote } from '../../utils/transactionParser';
import { useTheme } from '../../hooks/useTheme';
import { Layout, Fonts } from '../../constants/theme';
import { isRTL, t } from '../../utils/i18n';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

const QuickAddNote = () => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const [recognizing, setRecognizing] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    const lang = state.settings.language || 'en';
    const rtl = isRTL(lang);
    const currency = state.settings.currency;

    useEffect(() => {
        if (recognizing) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            pulseAnim.stopAnimation();
        }
    }, [recognizing]);

    useSpeechRecognitionEvent('result', (event) => {
        // If the speech is completely finalized
        if (event.isFinal) {
            setRecognizing(false);
            const transcript = event.results[0]?.transcript;
            if (transcript) {
                processTranscript(transcript);
            }
        }
    });

    useSpeechRecognitionEvent('error', (event) => {
        setRecognizing(false);
        if (event.error !== 'aborted' && event.error !== 'speech-timeout') {
            Alert.alert('Speech Error', event.message || 'Could not recognize speech');
        }
    });
    
    const processTranscript = (transcript: string) => {
        const parsed = parseTransactionNote(transcript, state.categories);
        
        let numericAmount = parseFloat(parsed.amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert(
                lang === 'ar' ? 'لم يتم العثور على مبلغ' : 'No amount found', 
                lang === 'ar' ? `لقد سمعت: "${transcript}". يرجى ذكر المبلغ بوضوح.` : `I heard: "${transcript}". Please mention a number clearly.`
            );
            return;
        }

        if (!parsed.categoryId) {
            Alert.alert('Categories missing', 'Cannot save without a valid category.');
            return;
        }

        // Auto Save to Global State!
        dispatch({
            type: 'ADD_TRANSACTION',
            payload: {
                id: Date.now().toString(),
                amount: numericAmount,
                categoryId: parsed.categoryId,
                date: Date.now(),
                note: parsed.note,
                type: parsed.type,
            },
        });

        // Show Success Toast/Feedback
        const typeStr = parsed.type === 'expense' ? (lang === 'ar' ? 'مصروف' : 'Expense') : (lang === 'ar' ? 'دخل' : 'Income');
        Alert.alert(
            lang === 'ar' ? 'تم الفهم بنجاح ✅' : 'Added Successfully ✅',
            `${typeStr}: ${numericAmount} ${currency?.symbol}\n\n"${transcript}"`
        );
    };

    const toggleListening = async () => {
        if (recognizing) {
            ExpoSpeechRecognitionModule.stop();
            setRecognizing(false);
            return;
        }

        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (perm.status !== 'granted') {
             Alert.alert('Permission needed', 'Please allow microphone access to use voice dictation.');
             return;
        }

        try {
            setRecognizing(true);
            ExpoSpeechRecognitionModule.start({
                lang: lang === 'ar' ? 'ar-EG' : 'en-US',
                interimResults: false,
                requiresOnDeviceRecognition: false,
            });
        } catch (e: any) {
            setRecognizing(false);
            Alert.alert('Error starting', e.message || 'Unknown error');
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.contentRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: colors.text, textAlign: rtl ? 'right' : 'left' }]}>
                            {lang === 'ar' ? 'الإضافة الذكية للصوتيات 🎙️' : 'Smart Voice Dictation 🎙️'}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: rtl ? 'right' : 'left' }]}>
                            {recognizing 
                                ? (lang === 'ar' ? 'أنا أستمع... قل مثلاً "دفعت 150 للمواصلات"' : 'Listening... say "Paid 150 for uber"')
                                : (lang === 'ar' ? 'اضغط وتحدث لإضافة معاملة فوراً وبدون تعب' : 'Tap to speak. Auto-adds to your history.')
                            }
                        </Text>
                    </View>
                    
                    <View style={styles.btnWrapper}>
                        <TouchableOpacity 
                            onPress={toggleListening} 
                            activeOpacity={0.8}
                            style={styles.btnTouch}
                        >
                            <Animated.View style={[
                                styles.btnCircle, 
                                { 
                                    backgroundColor: recognizing ? colors.danger : colors.primary,
                                    transform: [{ scale: pulseAnim }],
                                    shadowColor: recognizing ? colors.danger : colors.primary
                                }
                            ]}>
                                <Text style={styles.micIcon}>{recognizing ? '■' : '🎤'}</Text>
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Layout.spacing.lg,
        marginTop: Layout.spacing.sm,
        marginBottom: Layout.spacing.md,
    },
    card: {
        borderRadius: Layout.borderRadius.md,
        borderWidth: 1,
        padding: Layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    contentRow: {
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        paddingRight: 12,
        paddingLeft: 12,
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 15,
        marginBottom: 2,
    },
    subtitle: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        lineHeight: 16,
    },
    btnWrapper: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnTouch: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    micIcon: {
        fontSize: 22,
        color: '#FFF',
    }
});

export default QuickAddNote;
