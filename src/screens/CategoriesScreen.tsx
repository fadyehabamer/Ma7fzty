import React, { useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Layout, Fonts } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { TransactionType } from '../types';
import { t, isRTL, getFlexDirection, getTextAlign } from '../utils/i18n';
import AppIcon from '../components/common/AppIcon';
import { PICKER_ICONS } from '../constants/icons';

const CategoriesScreen = ({ navigation }: any) => {
    const { state, dispatch } = useApp();
    const { colors } = useTheme();
    const keyboardHeight = useKeyboardHeight();
    const lang = state.settings.language || 'en';
    const rtl = isRTL(lang);
    const [filter, setFilter] = useState<'all' | TransactionType>('all');
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmoji, setNewEmoji] = useState('pricetag');
    const [newType, setNewType] = useState<TransactionType>('expense');
    const [editingId, setEditingId] = useState<string | null>(null);

    const filteredCategories = state.categories.filter((c) =>
        filter === 'all' ? true : c.type === filter
    );

    const getCategoryCount = (catId: string) =>
        state.transactions.filter((tx) => tx.categoryId === catId).length;

    const getCategoryTotal = (catId: string) =>
        state.transactions.filter((tx) => tx.categoryId === catId).reduce((s, tx) => s + tx.amount, 0);

    const currency = state.settings.currency;
    const symbol = currency?.symbol || '$';

    const resetForm = () => { setEditingId(null); setNewName(''); setNewEmoji('pricetag'); setNewType('expense'); };
    const openAdd = () => { resetForm(); setShowAdd(true); };
    const openEdit = (cat: { id: string; name: string; emoji: string; type: TransactionType }) => {
        setEditingId(cat.id); setNewName(cat.name); setNewEmoji(cat.emoji); setNewType(cat.type); setShowAdd(true);
    };
    const closeModal = () => { setShowAdd(false); resetForm(); };

    const handleSave = () => {
        if (!newName.trim()) return;
        if (editingId) {
            const existing = state.categories.find((c) => c.id === editingId);
            dispatch({ type: 'UPDATE_CATEGORY', payload: { id: editingId, name: newName.trim(), emoji: newEmoji, type: newType, isDefault: existing?.isDefault } });
        } else {
            dispatch({ type: 'ADD_CATEGORY', payload: { id: Date.now().toString(), name: newName.trim(), emoji: newEmoji, type: newType } });
        }
        closeModal();
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(t('delete', lang), `${lang === 'ar' ? 'حذف' : 'Delete'} "${name}"?`, [
            { text: t('cancel', lang), style: 'cancel' },
            { text: t('delete', lang), style: 'destructive', onPress: () => { dispatch({ type: 'DELETE_CATEGORY', payload: id }); closeModal(); } },
        ]);
    };

    const filters: { label: string; value: 'all' | TransactionType }[] = [
        { label: t('all', lang), value: 'all' },
        { label: t('expense', lang), value: 'expense' },
        { label: t('income', lang), value: 'income' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { flexDirection: getFlexDirection(lang), borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path d={rtl ? "M5 12h14M12 5l7 7-7 7" : "M19 12H5M12 19l-7-7 7-7"} stroke={colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('categories', lang)}</Text>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAdd}>
                    <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={[styles.filterRow, { backgroundColor: colors.card }]}>
                {filters.map((f) => (
                    <TouchableOpacity
                        key={f.value}
                        style={[styles.filterTab, filter === f.value && { backgroundColor: colors.primary + '15' }]}
                        onPress={() => setFilter(f.value)}
                    >
                        <Text style={[styles.filterText, { color: colors.textSecondary }, filter === f.value && { color: colors.primary, fontFamily: Fonts.bold }]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            <FlatList
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: Layout.spacing.md }}
                renderItem={({ item }) => {
                    const count = getCategoryCount(item.id);
                    const total = getCategoryTotal(item.id);
                    return (
                        <TouchableOpacity
                            style={[styles.catCard, { backgroundColor: colors.card }]}
                            onPress={() => openEdit(item)}
                            onLongPress={() => handleDelete(item.id, item.name)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.catRow, { flexDirection: getFlexDirection(lang) }]}>
                                <View style={[styles.catEmoji, { backgroundColor: item.type === 'expense' ? colors.danger + '10' : colors.success + '10' }, rtl && { marginRight: 0, marginLeft: Layout.spacing.md }]}>
                                    <AppIcon name={item.emoji} size={22} color={item.type === 'expense' ? colors.danger : colors.success} />
                                </View>
                                <View style={[styles.catInfo, rtl && { alignItems: 'flex-end' }]}>
                                    <Text style={[styles.catName, { color: colors.text }]}>{item.name}</Text>
                                    <Text style={[styles.catCount, { color: colors.textSecondary }]}>
                                        {count} {count === 1 ? t('item', lang) : t('items', lang)}
                                        {item.isDefault ? ` · ${t('default', lang)}` : ''}
                                    </Text>
                                </View>
                                <View style={[styles.catTotal, rtl && { alignItems: 'flex-start' }]}>
                                    <Text style={[styles.catTotalValue, { color: item.type === 'expense' ? colors.danger : colors.success }]}>
                                        {symbol}{total.toFixed(2)}
                                    </Text>
                                    <Text style={[styles.catType, { color: colors.textSecondary }]}>{t(item.type, lang)}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Add Modal */}
            <Modal visible={showAdd} transparent animationType="fade">
                <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <Text style={[styles.modalTitle, { color: colors.text, textAlign: rtl ? 'right' : 'left' }]}>{editingId ? (lang === 'ar' ? 'تعديل الفئة' : 'Edit Category') : t('newCategory', lang)}</Text>

                            <TextInput style={[styles.nameInput, { flex: 0, borderColor: colors.border, color: colors.text, marginBottom: Layout.spacing.md, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }]} placeholder={t('categoryName', lang)} placeholderTextColor={colors.textSecondary} value={newName} onChangeText={setNewName} />

                            <Text style={[styles.pickerLabel, { color: colors.textSecondary, textAlign: rtl ? 'right' : 'left' }]}>{lang === 'ar' ? 'اختر أيقونة' : 'Choose an icon'}</Text>
                            <ScrollView horizontal style={styles.iconScroll} contentContainerStyle={styles.iconRow} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {PICKER_ICONS.map((ic) => {
                                    const active = newEmoji === ic;
                                    return (
                                        <TouchableOpacity
                                            key={ic}
                                            style={[styles.iconCell, { borderColor: colors.border }, active && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                                            onPress={() => setNewEmoji(ic)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name={ic as any} size={22} color={active ? colors.primary : colors.text} />
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={[styles.typeRow, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity
                                    style={[styles.typeOpt, { borderColor: colors.border }, newType === 'expense' && { borderColor: colors.danger, backgroundColor: colors.danger + '10' }]}
                                    onPress={() => setNewType('expense')}
                                >
                                    <Text style={[styles.typeOptText, { color: colors.textSecondary }, newType === 'expense' && { color: colors.danger }]}>{t('expense', lang)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeOpt, { borderColor: colors.border }, newType === 'income' && { borderColor: colors.success, backgroundColor: colors.success + '10' }]}
                                    onPress={() => setNewType('income')}
                                >
                                    <Text style={[styles.typeOptText, { color: colors.textSecondary }, newType === 'income' && { color: colors.success }]}>{t('income', lang)}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.modalBtns, { flexDirection: getFlexDirection(lang) }]}>
                                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={closeModal}>
                                    <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>{t('cancel', lang)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: newName.trim() ? 1 : 0.4 }]} onPress={handleSave} disabled={!newName.trim()}>
                                    <Text style={styles.modalSaveText}>{editingId ? t('save', lang) : t('addCategory', lang)}</Text>
                                </TouchableOpacity>
                            </View>

                            {editingId && (
                                <TouchableOpacity style={styles.deleteLink} onPress={() => handleDelete(editingId, newName)} activeOpacity={0.7}>
                                    <Text style={[styles.deleteLinkText, { color: colors.danger }]}>{lang === 'ar' ? 'حذف الفئة' : 'Delete category'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Layout.spacing.md, paddingVertical: Layout.spacing.sm, borderBottomWidth: 1 },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: 20, textAlign: 'center' },
    addBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#FFF', fontSize: 24, fontFamily: Fonts.bold, marginTop: -2 },
    filterRow: { flexDirection: 'row', margin: Layout.spacing.md, borderRadius: Layout.borderRadius.md, padding: 4 },
    filterTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Layout.borderRadius.sm },
    filterText: { fontFamily: Fonts.medium, fontSize: 14 },
    catCard: { borderRadius: Layout.borderRadius.md, marginBottom: Layout.spacing.sm, padding: Layout.spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 2 },
    catRow: { flexDirection: 'row', alignItems: 'center' },
    catEmoji: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: Layout.spacing.md },
    catInfo: { flex: 1 },
    catName: { fontFamily: Fonts.semiBold, fontSize: 16, writingDirection: 'auto' },
    catCount: { fontFamily: Fonts.regular, fontSize: 12, marginTop: 2, writingDirection: 'auto' },
    catTotal: { alignItems: 'flex-end' },
    catTotalValue: { fontFamily: Fonts.bold, fontSize: 16 },
    catType: { fontFamily: Fonts.regular, fontSize: 11, marginTop: 2 },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: Layout.spacing.lg
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: Layout.spacing.lg,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
    },
    modalTitle: { fontFamily: Fonts.bold, fontSize: 20, marginBottom: Layout.spacing.lg },
    emojiRow: { flexDirection: 'row', gap: Layout.spacing.sm, marginBottom: Layout.spacing.md },
    emojiInput: { width: 56, height: 56, borderWidth: 1.5, borderRadius: Layout.borderRadius.md, textAlign: 'center', fontSize: 24 },
    pickerLabel: { fontFamily: Fonts.semiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Layout.spacing.sm },
    iconScroll: { marginBottom: Layout.spacing.lg },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm },
    iconRow: { flexDirection: 'row', gap: Layout.spacing.sm, paddingVertical: 2 },
    iconCell: { width: 48, height: 48, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    nameInput: { flex: 1, height: 56, borderWidth: 1.5, borderRadius: Layout.borderRadius.md, paddingHorizontal: Layout.spacing.md, fontFamily: Fonts.medium, fontSize: 16 },
    typeRow: { flexDirection: 'row', gap: Layout.spacing.sm, marginBottom: Layout.spacing.lg },
    typeOpt: { flex: 1, paddingVertical: 12, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, alignItems: 'center' },
    typeOptText: { fontFamily: Fonts.semiBold, fontSize: 15 },
    modalBtns: { flexDirection: 'row', gap: Layout.spacing.md },
    modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: Layout.borderRadius.md, borderWidth: 1.5, alignItems: 'center' },
    modalCancelText: { fontFamily: Fonts.semiBold, fontSize: 16 },
    modalSaveBtn: { flex: 2, paddingVertical: 14, borderRadius: Layout.borderRadius.md, alignItems: 'center' },
    modalSaveText: { fontFamily: Fonts.bold, fontSize: 16, color: '#FFF' },
    deleteLink: { alignItems: 'center', paddingVertical: Layout.spacing.md, marginTop: Layout.spacing.xs },
    deleteLinkText: { fontFamily: Fonts.semiBold, fontSize: 14 },
});

export default CategoriesScreen;
