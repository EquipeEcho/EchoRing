import React, { useState } from 'react';
import { View, TextInput, FlatList, Pressable, StyleSheet } from 'react:native';
import { IDIOMAS } from "@/constants/laguagesAndMore";

interface LanguageSelectProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  error?: boolean;
}

function LanguageSelect({ label, placeholder, value, onChange, error }: { label: string; placeholder: string; value: string; onChange: (val: string) => void; error?: boolean }) {
  const [open, setOpen] = useState(false);

  const filtered = IDIOMAS.filter(item =>
    item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .includes((value || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  return (
    <View style={{ flex: 1, position: 'relative', marginBottom: 18, zIndex: 1000 }}>
      <Txt style={s.label}>{label}</Txt>
      <TextInput
        style={[s.input, error && { borderColor: colors.red }]}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={(text) => {
          onChange(text);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && filtered.length > 0 && (
        <View style={s.dropdownList}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
            {filtered.map(item => (
              <Pressable key={item} style={s.dropdownItem} onPress={() => { onChange(item); setOpen(false); }}>
                <Txt style={{ fontSize: 14, color: '#fff' }}>{item}</Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#d32f2f' },
  dropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    zIndex: 999,
    elevation: 5,
  },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemText: { fontSize: 14 },
});